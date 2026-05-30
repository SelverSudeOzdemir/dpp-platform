import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  CheckCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  Hash,
  Building2,
  Sparkles,
} from 'lucide-react';
import { apiChangePassword } from '../lib/api';

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Yönetici', color: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' },
  ENGINEER: { label: 'Mühendis', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  SUPPLIER: { label: 'Tedarikçi', color: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200' },
  CUSTOMER: { label: 'Müşteri', color: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' },
  AUTHORITY: { label: 'Denetçi', color: 'bg-purple-50 text-purple-600 ring-1 ring-purple-200' },
  PUBLIC: { label: 'Ziyaretçi', color: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200' },
};

function ProfilePage() {
  const { user, role } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Tüm alanları doldurun.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Yeni şifre ve onay eşleşmiyor.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Şifre güncellenirken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleInfo = ROLE_LABEL[role] ?? ROLE_LABEL.PUBLIC;

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const truncateId = (id?: string) => {
    if (!id) return '—';
    if (id.length <= 16) return id;
    return id.slice(0, 8) + '…' + id.slice(-6);
  };

  const getPasswordStrength = (pw: string) => {
    if (!pw) return { level: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, label: 'Zayıf', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'Orta', color: 'bg-amber-500' };
    if (score <= 3) return { level: 3, label: 'İyi', color: 'bg-blue-500' };
    return { level: 4, label: 'Güçlü', color: 'bg-emerald-500' };
  };

  const pwStrength = getPasswordStrength(newPassword);

  const InfoItem = ({
    icon,
    label,
    value,
    badge,
    title,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    badge?: React.ReactNode;
    title?: string;
  }) => (
    <div className="group rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm transition-all duration-200 hover:border-blue-100 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-gray-100 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{label}</p>
          {badge ? (
            <div className="mt-2">{badge}</div>
          ) : (
            <p title={title} className="mt-1 truncate text-sm font-bold text-slate-800">
              {value || '—'}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-90px)] bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Kocaer DPP Portal</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Profilim</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hesap bilgilerinizi görüntüleyin ve güvenlik ayarlarınızı yönetin.
          </p>
        </div>

        <section className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
          <div className="h-1 bg-gradient-to-r from-blue-700 via-blue-500 to-rose-500" />

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-black text-white shadow-lg shadow-blue-500/25">
                  {initials}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black text-slate-950">{user?.full_name || 'Kullanıcı'}</h2>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-500">{user?.email || '—'}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {user?.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Sparkles size={16} />
                  <span className="text-xs font-black uppercase tracking-[0.12em]">Hesap Yetkisi</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-800">{roleInfo.label}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Hesap Bilgileri</h2>
                <p className="mt-0.5 text-xs text-slate-500">Kullanıcı kimliği ve sistem rolü bilgileri.</p>
              </div>
              <Shield size={18} className="text-blue-600" />
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <InfoItem
              icon={<Hash size={17} />}
              label="Kullanıcı ID"
              value={truncateId(user?.id)}
              title={user?.id}
            />

            <InfoItem
              icon={<User size={17} />}
              label="Ad Soyad"
              value={user?.full_name}
            />

            <InfoItem
              icon={<Mail size={17} />}
              label="E-posta Adresi"
              value={user?.email}
            />

            <InfoItem
              icon={<Shield size={17} />}
              label="Sistem Rolü"
              badge={
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              }
            />

            <InfoItem
              icon={<Lock size={17} />}
              label="Hesap Durumu"
              badge={
                <span className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {user?.is_active ? 'Aktif' : 'Pasif'}
                </span>
              }
            />

            <InfoItem
              icon={<Building2 size={17} />}
              label="Portal"
              value="Kocaer DPP"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Şifre Değiştir</h2>
                <p className="mt-0.5 text-xs text-slate-500">Hesabınızın güvenliği için güçlü bir şifre kullanın.</p>
              </div>
              <KeyRound size={18} className="text-blue-600" />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mevcut Şifre</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-11 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="En az 8 karakter"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-11 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {newPassword && (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex max-w-[180px] flex-1 gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            i <= pwStrength.level ? pwStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-500">{pwStrength.label}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Yeni Şifre (Tekrar)</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full rounded-xl border bg-white px-4 py-3 pr-11 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-4 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-gray-300 focus:border-blue-600 focus:ring-blue-500/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs font-semibold text-red-500">Şifreler eşleşmiyor.</p>
                )}
              </div>

              {pwError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  <AlertCircle size={16} className="shrink-0" />
                  {pwError}
                </div>
              )}

              {pwSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  <CheckCircle size={16} className="shrink-0" />
                  Şifreniz başarıyla güncellendi.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Güncelleniyor...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Şifreyi Güncelle
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="border-t border-gray-100 bg-slate-50 px-5 py-4 sm:px-6">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Lock size={15} />
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Güçlü bir şifre için büyük/küçük harf, rakam ve özel karakter kombinasyonu kullanın.
                Şifrenizi düzenli aralıklarla güncellemeniz önerilir.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ProfilePageWrapper() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}