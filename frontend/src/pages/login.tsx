import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";

import { apiLogin, apiGetMe } from "../lib/api";

import Button from "../components/ui/Button"; // SÜSLÜ PARANTEZ YASAK
import Input from "../components/ui/Input"; // SÜSLÜ PARANTEZ YASAK
import Card from "../components/ui/Card"; // SÜSLÜ PARANTEZ YASAK
import Spinner from "../components/ui/spinner"; // SÜSLÜ PARANTEZ YASAK

// 1. Zod ile Login Şeması (Kurallar)
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta alanı zorunludur")
    .email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isIdleLogout = router.query.reason === "idle";

  // Zaten giriş yapılmışsa login sayfasını gösterme — uygun sayfaya yönlendir
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      const dest =
        role === "ADMIN" ? "/" : role === "ENGINEER" ? "/batches" : "/my-dpps";
      router.replace(dest);
    }
  }, [isAuthenticated, authLoading, role, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  // Mock kullanıcı listesi — gerçek backend bağlandığında apiClient.post('/auth/login') ile değişecek
  const MOCK_USERS: Record<
    string,
    { id: string; name: string; email: string; role: string }
  > = {
    "admin@kocaer.com": {
      id: "1",
      name: "Furkan Çiçek",
      email: "admin@kocaer.com",
      role: "ADMIN",
    },
    "engineer@kocaer.com": {
      id: "5",
      name: "Ali Kaya",
      email: "engineer@kocaer.com",
      role: "ENGINEER",
    },
    "supplier@erdemir.com": {
      id: "2",
      name: "Ahmet Demir",
      email: "supplier@erdemir.com",
      role: "SUPPLIER",
    },
    "customer@turkcell.com": {
      id: "3",
      name: "Mehmet Yılmaz",
      email: "customer@turkcell.com",
      role: "CUSTOMER",
    },
    "authority@gtb.gov.tr": {
      id: "4",
      name: "Kemal Arslan",
      email: "authority@gtb.gov.tr",
      role: "AUTHORITY",
    },
  };

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      // 1. Token al
      const tokens = await apiLogin({
        email: data.email,
        password: data.password,
      });

      // 2. Kullanıcı bilgisini çek
      localStorage.setItem("token", tokens.access_token); // geçici, me için lazım
      const userData = await apiGetMe();

      // 3. AuthContext'e kaydet
      login(tokens.access_token, tokens.refresh_token, userData);

      // 4. Yönlendirme
      const rawReturn = router.query.returnUrl as string | undefined;
      const safeReturn =
        rawReturn && rawReturn.startsWith("/") && !rawReturn.startsWith("//")
          ? rawReturn
          : null;

      if (safeReturn) {
        router.push(safeReturn);
      } else if (userData.role === "ADMIN") {
        router.push("/");
      } else if (userData.role === "ENGINEER") {
        router.push("/batches");
      } else {
        router.push("/my-dpps");
      }
    } catch (error: any) {
      localStorage.removeItem("token");
      setErrorMessage(
        error?.message === "E-posta veya şifre hatalı"
          ? "E-posta adresi veya şifre hatalı. Lütfen tekrar deneyin."
          : "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8 shadow-2xl border-t-4 border-blue-600">
        {/* Başlık Alanı */}
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
            DPP Portalına Giriş
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Kocaer Dijital Ürün Pasaportu Yönetim Sistemi
          </p>
        </div>

        {/* Hareketsizlik uyarısı */}
        {isIdleLogout && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-700 text-center font-medium">
            15 dakika hareketsizlik nedeniyle oturumunuz sonlandırıldı.
          </div>
        )}

        {/* Hata Mesajı (Sadece hata varsa görünür) */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600 text-center">
            {errorMessage}
          </div>
        )}

        {/* Form Alanı */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="E-posta Adresi"
              type="email"
              placeholder="ornek@kocaer.com"
              {...register("email")}
              error={errors.email?.message}
            />

            <Input
              label="Şifre"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              error={errors.password?.message}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Giriş Yapılıyor...
              </span>
            ) : (
              "Sisteme Giriş Yap"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
