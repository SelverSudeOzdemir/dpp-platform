import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { User, Mail, Shield, KeyRound, CheckCircle } from 'lucide-react';

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  ADMIN:     { label: 'Yönetici',    color: 'bg-red-50 text-red-600 border-red-200'       },
  ENGINEER:  { label: 'Mühendis',   color: 'bg-green-50 text-green-700 border-green-200'  },
  SUPPLIER:  { label: 'Tedarikçi',  color: 'bg-orange-50 text-orange-600 border-orange-200'},
  CUSTOMER:  { label: 'Müşteri',    color: 'bg-blue-50 text-blue-600 border-blue-200'     },
  AUTHORITY: { label: 'Denetçi',    color: 'bg-purple-50 text-purple-600 border-purple-200'},
  PUBLIC:    { label: 'Ziyaretçi',  color: 'bg-gray-50 text-gray-500 border-gray-200'    },
};

function ProfilePage() {
  const { user, role } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError]                 = useState('');
  const [pwSuccess, setPwSuccess]             = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
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

    // TODO: API entegrasyonu — PATCH /api/v1/users/me/password
    setPwSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const roleInfo = ROLE_LABEL[role] ?? ROLE_LABEL.PUBLIC;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900 mb-1">Profilim</h1>
      <p className="text-sm text-gray-500 mb-8">Hesap bilgilerinizi görüntüleyin ve şifrenizi değiştirin.</p>

      {/* Kullanıcı Bilgileri */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-5">Hesap Bilgileri</h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
            {user?.full_name?.charAt(0) ?? 'U'}
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">{user?.full_name}</p>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <User size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-semibold">Ad Soyad</p>
              <p className="text-sm font-bold text-gray-900">{user?.full_name ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Mail size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-semibold">E-posta</p>
              <p className="text-sm font-bold text-gray-900">{user?.email ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Shield size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-semibold">Rol</p>
              <p className="text-sm font-bold text-gray-900">{roleInfo.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Şifre Değiştir */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <KeyRound size={14} />
          Şifre Değiştir
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Mevcut Şifre"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <Input
            label="Yeni Şifre"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="En az 8 karakter"
            autoComplete="new-password"
          />
          <Input
            label="Yeni Şifre (Tekrar)"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {pwError && (
            <p className="text-sm text-red-600 font-semibold">{pwError}</p>
          )}

          {pwSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={16} />
              Şifreniz başarıyla güncellendi.
            </div>
          )}

          <div className="pt-1">
            <Button type="submit" variant="primary" size="sm">
              Şifreyi Güncelle
            </Button>
          </div>
        </form>
      </div>
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
