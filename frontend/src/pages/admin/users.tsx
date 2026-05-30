import { useState, useEffect, useRef } from 'react';
import { useAuth, Role } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Plus, X, UserCheck, Search, MoreVertical, RefreshCw, ShieldAlert, ShieldCheck, UserX, ChevronDown, Users, UserPlus, Clock, Mail, Building2, User, Shield } from 'lucide-react';
import { apiGetUsers, apiCreateUser, apiInviteUser, apiUpdateUserRole, apiUpdateUserStatus } from '../../lib/api';

type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  status: UserStatus;
  invited_at: string;
  last_login?: string;
};

const ROLE_OPTIONS: Role[] = ['ENGINEER', 'SUPPLIER', 'CUSTOMER', 'AUTHORITY', 'ADMIN'];

const ROLE_CFG: Record<Role, { label: string; style: string; icon: string }> = {
  ADMIN:     { label: 'Yönetici',   style: 'bg-red-50 text-red-700 border-red-200/60',           icon: '🛡️' },
  ENGINEER:  { label: 'Mühendis',  style: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', icon: '⚙️' },
  SUPPLIER:  { label: 'Tedarikçi', style: 'bg-amber-50 text-amber-700 border-amber-200/60',      icon: '📦' },
  CUSTOMER:  { label: 'Müşteri',   style: 'bg-blue-50 text-blue-700 border-blue-200/60',          icon: '🏢' },
  AUTHORITY: { label: 'Denetçi',   style: 'bg-violet-50 text-violet-700 border-violet-200/60',    icon: '🔍' },
  PUBLIC:    { label: 'Ziyaretçi', style: 'bg-gray-50 text-gray-500 border-gray-200/60',          icon: '👤' },
};

const STATUS_CFG: Record<UserStatus, { label: string; dot: string; style: string }> = {
  PENDING:   { label: 'Davet Bekliyor', dot: 'bg-yellow-400', style: 'text-yellow-700' },
  ACTIVE:    { label: 'Aktif',          dot: 'bg-emerald-400', style: 'text-emerald-700' },
  SUSPENDED: { label: 'Askıya Alındı', dot: 'bg-orange-400', style: 'text-orange-700' },
  INACTIVE:  { label: 'Pasif',          dot: 'bg-gray-300',    style: 'text-gray-400' },
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN:     'Tüm sisteme tam erişim. Kullanıcı yönetimi, DPP onay/ret ve platform ayarları.',
  ENGINEER:  'Batch oluşturma, DPP düzenleme ve tedarik zinciri izleme yetkisi.',
  SUPPLIER:  'Kendisine atanan DPP\'leri görüntüleme ve belge yükleme yetkisi.',
  CUSTOMER:  'Satın aldığı ürünlerin DPP bilgilerini görüntüleme yetkisi.',
  AUTHORITY: 'Denetim amaçlı tüm DPP\'leri görüntüleme ve raporlama yetkisi.',
  PUBLIC:    'Yalnızca herkese açık DPP bilgilerini görüntüleyebilir.',
};

function domainOf(email: string) {
  return email.split('@')[1] ?? email;
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-blue-500 to-blue-700',
    'from-emerald-500 to-emerald-700',
    'from-violet-500 to-violet-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-700',
    'from-indigo-500 to-indigo-700',
  ];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  return gradients[idx];
}

// Aksiyon menüsü
function ActionMenu({ user, currentUserEmail, onAction }: {
  user: UserRow;
  currentUserEmail: string;
  onAction: (id: string, action: 'resend' | 'suspend' | 'activate' | 'deactivate' | 'change_role', payload?: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rolePicker, setRolePicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isSelf = user.email === currentUserEmail;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRolePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isSelf) {
    return <span className="text-xs text-gray-300 select-none px-2">—</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); setRolePicker(false); }}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-xl shadow-gray-200/50 w-56 py-1.5 text-sm animate-in-scale">
          {user.status === 'PENDING' && (
            <button
              onClick={() => { onAction(user.id, 'resend'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <RefreshCw size={14} className="text-blue-500" />
              Daveti Yeniden Gönder
            </button>
          )}

          {user.status === 'ACTIVE' && (
            <button
              onClick={() => { onAction(user.id, 'suspend'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-50 text-orange-600 transition-colors"
            >
              <ShieldAlert size={14} />
              Askıya Al
            </button>
          )}

          {(user.status === 'SUSPENDED' || user.status === 'INACTIVE') && (
            <button
              onClick={() => { onAction(user.id, 'activate'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-emerald-50 text-emerald-700 transition-colors"
            >
              <ShieldCheck size={14} />
              Aktif Et
            </button>
          )}

          {user.status === 'SUSPENDED' && (
            <button
              onClick={() => { onAction(user.id, 'deactivate'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-gray-500 transition-colors"
            >
              <UserX size={14} />
              Pasif Yap
            </button>
          )}

          {user.status !== 'PENDING' && (
            <>
              <div className="border-t border-gray-100 my-1.5" />
              {!rolePicker ? (
                <button
                  onClick={() => setRolePicker(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <ChevronDown size={14} className="text-gray-400" />
                  Rol Değiştir
                </button>
              ) : (
                <div className="px-3 py-2 space-y-1">
                  <p className="text-[11px] text-gray-400 font-semibold mb-2 uppercase tracking-wider">Yeni rol seç</p>
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => { onAction(user.id, 'change_role', r); setOpen(false); setRolePicker(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] border ${ROLE_CFG[r].style}`}
                    >
                      {ROLE_CFG[r].label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]   = useState('');
  const [filterRole, setFilterRole]     = useState<Role | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'ALL'>('ALL');

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [role, setRole]         = useState<Role>('SUPPLIER');
  const [companyName, setCompanyName] = useState('');
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [formError, setFormError]   = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiGetUsers();
      const rows = data.map((u: any) => ({
        id: String(u.id),
        full_name: u.full_name || '',
        email: u.email,
        role: u.role,
        status: u.is_active ? 'ACTIVE' : 'INACTIVE',
        invited_at: new Date().toISOString().split('T')[0],
      }));
      setUsers(rows);
    } catch (err: any) {
      console.error("Kullanıcılar backend'den yüklenemedi, mock kullanılacak:", err);
    }
  };

  const resetForm = () => {
    setFullName(''); setEmail(''); setRole('SUPPLIER'); setCompanyName('');
    setFormError('');
  };

  const handleInvite = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (isInviting) return;
    setFormError('');

    if (!fullName || !email) { setFormError('Tüm alanları doldurun.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Geçerli bir e-posta girin.'); return; }
    if (users.some(u => u.email === email)) { setFormError('Bu e-posta zaten kayıtlı.'); return; }

    setIsInviting(true);
    try {
      const newUser = await apiInviteUser({
        email,
        full_name: fullName,
        role: role,
        ...(companyName.trim() ? { company_name: companyName.trim() } : {})
      });
      
      const newRow: UserRow = {
        id: String(newUser.id),
        full_name: newUser.full_name || '',
        email: newUser.email,
        role: newUser.role,
        status: newUser.is_active ? 'ACTIVE' : 'PENDING',
        invited_at: new Date().toISOString().split('T')[0],
      };
      
      setUsers(prev => [newRow, ...prev]);
      setToastMessage(`${fullName} adresine başarıyla davet gönderildi.`);
      setTimeout(() => setToastMessage(''), 5000);
      setIsInviteModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Kullanıcı davet edilirken hata oluştu.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAction = async (id: string, action: 'resend' | 'suspend' | 'activate' | 'deactivate' | 'change_role', payload?: Role) => {
    try {
      if (action === 'suspend' || action === 'deactivate') {
        await apiUpdateUserStatus(id, false);
      } else if (action === 'activate') {
        await apiUpdateUserStatus(id, true);
      } else if (action === 'change_role' && payload) {
        await apiUpdateUserRole(id, payload);
      }

      setUsers(prev => prev.map(u => {
        if (u.id !== id) return u;
        if (action === 'suspend')     return { ...u, status: 'SUSPENDED' as UserStatus };
        if (action === 'activate')    return { ...u, status: 'ACTIVE' as UserStatus };
        if (action === 'deactivate')  return { ...u, status: 'INACTIVE' as UserStatus };
        if (action === 'change_role' && payload) return { ...u, role: payload };
        return u;
      }));
    } catch (err: any) {
      alert('İşlem gerçekleştirilemedi: ' + (err.message || err));
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === 'ALL' || u.role === filterRole;
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const counts = {
    total:   users.length,
    active:  users.filter(u => u.status === 'ACTIVE').length,
    pending: users.filter(u => u.status === 'PENDING').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

      {/* ───── Hero Header ───── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200/50">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Kullanıcılar</h1>
              <p className="text-sm text-gray-500 mt-0.5">Sisteme erişimi olan tüm kullanıcıları yönetin.</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setIsInviteModalOpen(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 active:scale-[0.98]"
          >
            <UserPlus size={16} />
            Davet Gönder
          </button>
        </div>
      </div>

      {/* ───── İstatistik Kartları ───── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Toplam Kullanıcı', value: counts.total, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-gray-900' },
          { label: 'Aktif',            value: counts.active,  icon: UserCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-emerald-700' },
          { label: 'Davet Bekliyor',   value: counts.pending, icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', valueColor: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="group bg-white border border-gray-200/80 rounded-2xl px-5 py-5 shadow-sm hover:shadow-md hover:border-gray-300/80 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">{s.label}</p>
              <div className={`h-9 w-9 rounded-xl ${s.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <s.icon size={17} className={s.iconColor} />
              </div>
            </div>
            <p className={`text-3xl font-extrabold ${s.valueColor} tracking-tight`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ───── Toolbar: Arama & Filtreler ───── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-3 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="İsim veya e-posta ara..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-200"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value as Role | 'ALL')}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-200 cursor-pointer min-w-[130px]"
            >
              <option value="ALL">Tüm Roller</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_CFG[r].label}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as UserStatus | 'ALL')}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-200 cursor-pointer min-w-[140px]"
            >
              <option value="ALL">Tüm Durumlar</option>
              {(Object.keys(STATUS_CFG) as UserStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ───── Kullanıcı Tablosu ───── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50/50">Kullanıcı</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50/50">Şirket</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50/50">Rol</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50/50">Durum</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50/50">Son Giriş</th>
                <th className="px-4 py-4 bg-gray-50/50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Search size={20} className="text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Eşleşen kullanıcı bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="group hover:bg-blue-50/30 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(u.full_name)} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm group-hover:shadow-md transition-shadow duration-200`}>
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">{u.full_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100/80 px-2.5 py-1 rounded-lg">{domainOf(u.email)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-lg border ${ROLE_CFG[u.role].style}`}>
                      {ROLE_CFG[u.role].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STATUS_CFG[u.status].dot} shrink-0`} />
                      <span className={`text-xs font-semibold ${STATUS_CFG[u.status].style}`}>
                        {STATUS_CFG[u.status].label}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-400 font-medium tabular-nums">
                      {u.last_login ? formatDate(u.last_login) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <ActionMenu
                      user={u}
                      currentUserEmail={currentUser?.email ?? ''}
                      onAction={handleAction}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 font-medium">
              {filtered.length} / {users.length} kullanıcı gösteriliyor
            </p>
          </div>
        )}
      </div>

      {/* ───── Davet Gönder Modalı ───── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur Overlay */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsInviteModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl shadow-gray-400/20 animate-in-scale overflow-hidden">
            {/* Gradient accent top */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-400" />

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200/40">
                    <UserPlus size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">Yeni Kullanıcı Daveti</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Kullanıcıya geçici bir şifre içeren davet maili gönderilecektir.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 -mt-1 -mr-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div onSubmit={handleInvite} className="space-y-5">
                {/* Ad Soyad & E-posta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <User size={14} className="text-gray-400" />
                      Ad Soyad
                    </label>
                    <input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Ahmet Yılmaz"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Mail size={14} className="text-gray-400" />
                      E-posta Adresi
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="ahmet@sirket.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Firma & Rol */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Building2 size={14} className="text-gray-400" />
                      Firma Adı
                      <span className="text-xs font-normal text-gray-400">(Opsiyonel)</span>
                    </label>
                    <input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Örn: Erdemir A.Ş."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Shield size={14} className="text-gray-400" />
                      Rol
                    </label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as Role)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-200 cursor-pointer appearance-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2.5rem' }}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{ROLE_CFG[r].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rol Açıklama Kartı */}
                <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{ROLE_CFG[role].icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{ROLE_CFG[role].label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
                    </div>
                  </div>
                </div>

                {role === 'ADMIN' && (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      Yönetici rolü tam sisteme erişim sağlar. Bu rolü yalnızca güvenilir kişilere atayın.
                    </p>
                  </div>
                )}

                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200/60 rounded-xl">
                    <X size={14} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 font-medium">{formError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={isInviting}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-200/40 hover:shadow-xl hover:shadow-blue-300/50 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isInviting ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin" /> Gönderiliyor...
                      </span>
                    ) : (
                      <>
                        <Mail size={16} />
                        Davet Gönder
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isInviting}
                    onClick={() => setIsInviteModalOpen(false)}
                    className="flex-1 px-5 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── Toast ───── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in-toast">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <UserCheck size={15} className="text-emerald-400" />
          </div>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function UsersPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <UsersPage />
    </ProtectedRoute>
  );
}