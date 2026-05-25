import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";

import { apiLogin, apiGetMe } from "../lib/api";
import Spinner from "../components/ui/spinner";
import { Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);

  const isIdleLogout = router.query.reason === "idle";
  const isExpiredLogout = router.query.reason === "expired";

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
    <div className="min-h-screen w-full flex flex-col md:flex-row relative font-sans overflow-hidden bg-slate-900">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop"
          alt="Industrial Steel Plant"
          className="w-full h-full object-cover opacity-60"
        />
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1522] via-[#0d1522]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1522] via-transparent to-transparent"></div>
      </div>

      {/* Left Content Area (Text & Logos) */}
      <div className="relative z-10 w-full md:w-1/2 lg:w-[55%] flex flex-col justify-between p-8 md:p-16 lg:p-24 min-h-screen text-white">
        
        {/* Header / Logo */}
        <div>
          <div className="flex items-center gap-3">
            {/* Kocaer Logo Icon Replica */}
            <div className="grid grid-cols-2 gap-[2px] w-8 h-8">
              <div className="bg-red-600 rounded-sm"></div>
              <div className="bg-red-600 rounded-sm"></div>
              <div className="bg-red-600 rounded-sm"></div>
              <div className="bg-white rounded-sm"></div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black tracking-widest leading-none">KOCAER</div>
              <div className="text-[0.65rem] md:text-xs tracking-[0.15em] text-gray-300 mt-1 uppercase font-medium">Mükemmelliğin Ötesinde Çelik</div>
            </div>
          </div>
        </div>

        {/* Main Value Proposition */}
        <div className="mt-12 md:mt-0 max-w-xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-white mb-6">
            Kocaer<br />
            Dijital Ürün<br />
            Pasaportu Platformu
          </h1>
          <p className="text-blue-400 font-bold tracking-[0.2em] mb-6 text-sm lg:text-base">İZLE. DOĞRULA. SÜRDÜR.</p>
          <p className="text-gray-300 text-lg lg:text-xl font-light">
            Çeliği, insanı ve sürdürülebilir bir<br/>geleceği dijital olarak birbirine bağlıyoruz.
          </p>

          <div className="flex flex-wrap gap-x-12 gap-y-6 mt-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-gray-500/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="font-bold text-white leading-tight">140+</div>
                <div className="text-xs text-gray-400">Ülkeye İhracat</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-gray-500/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </div>
              <div>
                <div className="font-bold text-white leading-tight">ÇSY</div>
                <div className="text-xs text-gray-400">Odaklı (ESG)</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-gray-500/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <div className="font-bold text-white leading-tight">Dijital</div>
                <div className="text-xs text-gray-400">İzlenebilirlik</div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty div to balance justify-between */}
        <div className="h-10"></div>
      </div>

      {/* Footer Info (Absolute Bottom) */}
      <div className="absolute bottom-6 left-8 right-8 z-20 hidden md:flex justify-between items-center text-xs text-gray-400 font-medium pointer-events-none">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          Sürdürülebilirlik, ürettiğimiz her şeyin merkezinde yer alır.
        </div>
        <div>© {new Date().getFullYear()} Kocaer Çelik. Tüm hakları saklıdır.</div>
      </div>

      {/* Right Login Form Container */}
      <div className="relative z-10 w-full md:w-1/2 lg:w-[45%] flex items-center justify-center p-4 md:p-12">
        <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 md:p-12">
          
          {/* Card Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center items-center gap-3 mb-6 text-gray-900">
              <div className="grid grid-cols-2 gap-[2px] w-8 h-8">
                <div className="bg-red-600 rounded-sm"></div>
                <div className="bg-red-600 rounded-sm"></div>
                <div className="bg-red-600 rounded-sm"></div>
                <div className="bg-black rounded-sm"></div>
              </div>
              <div className="text-3xl font-black tracking-widest leading-none">KOCAER</div>
            </div>
            
            <h2 className="text-xl font-bold text-blue-600 tracking-wider">DPP PLATFORMU</h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">Güvenli Kurumsal Erişim</p>
          </div>

          {/* Messages */}
          {isIdleLogout && (
            <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 text-center font-medium">
              15 dakika hareketsizlik nedeniyle oturumunuz sonlandırıldı.
            </div>
          )}
          {isExpiredLogout && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-center font-medium">
              Oturum süreniz doldu. Lütfen tekrar giriş yapın.
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center font-medium">
              {errorMessage}
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">E-posta Adresi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  className={`block w-full pl-11 pr-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500"
                  }`}
                  placeholder="ornek@kocaer.com"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 font-medium ml-1">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Şifre</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`block w-full pl-11 pr-11 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-blue-500"
                  }`}
                  placeholder="••••••••"
                  {...register("password")}
                />
                <div 
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </div>
              </div>
              {errors.password && <p className="text-xs text-red-500 font-medium ml-1">{errors.password.message}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" /> Giriş Yapılıyor...
                </>
              ) : (
                <>
                  Sisteme Giriş Yap
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}
