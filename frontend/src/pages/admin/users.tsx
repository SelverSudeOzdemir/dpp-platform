import { useState, useEffect, useRef } from 'react';
import { useAuth, Role } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Plus, X, UserCheck, Search, MoreVertical, RefreshCw, ShieldAlert, ShieldCheck, UserX, ChevronDown } from 'lucide-react';
import { apiGetUsers, apiCreateUser, apiUpdateUserRole, apiUpdateUserStatus } from '../../lib/api';

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

const ROLE_CFG: Record<Role, { label: string; style: string }> = {
  ADMIN:     { label: 'Yönetici',   style: 'bg-red-50 text-red-600 border-red-100'         },
  ENGINEER:  { label: 'Mühendis',  style: 'bg-green-50 text-green-700 border-green-100'    },
  SUPPLIER:  { label: 'Tedarikçi', style: 'bg-orange-50 text-orange-600 border-orange-100' },
  CUSTOMER:  { label: 'Müşteri',   style: 'bg-blue-50 text-blue-600 border-blue-100'       },
  AUTHORITY: { label: 'Denetçi',   style: 'bg-purple-50 text-purple-600 border-purple-100' },
  PUBLIC:    { label: 'Ziyaretçi', style: 'bg-gray-50 text-gray-500 border-gray-100'       },
};

const STATUS_CFG: Record<UserStatus, { label: string; style: string }> = {
  PENDING:   { label: 'Davet Bekliyor', style: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  ACTIVE:    { label: 'Aktif',          style: 'bg-green-50 text-green-700 border-green-100'    },
  SUSPENDED: { label: 'Askıya Alındı', style: 'bg-orange-50 text-orange-600 border-orange-100' },
  INACTIVE:  { label: 'Pasif',          style: 'bg-gray-100 text-gray-400 border-gray-200'      },
};

function domainOf(email: string) {
  return email.split('@')[1] ?? email;
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
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
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-52 py-1 text-sm">
          {user.status === 'PENDING' && (
            <button
              onClick={() => { onAction(user.id, 'resend'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-gray-700"
            >
              <RefreshCw size={14} className="text-blue-500" />
              Daveti Yeniden Gönder
            </button>
          )}

          {user.status === 'ACTIVE' && (
            <button
              onClick={() => { onAction(user.id, 'suspend'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-orange-600"
            >
              <ShieldAlert size={14} />
              Askıya Al
            </button>
          )}

          {(user.status === 'SUSPENDED' || user.status === 'INACTIVE') && (
            <button
              onClick={() => { onAction(user.id, 'activate'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-green-700"
            >
              <ShieldCheck size={14} />
              Aktif Et
            </button>
          )}

          {user.status === 'SUSPENDED' && (
            <button
              onClick={() => { onAction(user.id, 'deactivate'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-gray-500"
            >
              <UserX size={14} />
              Pasif Yap
            </button>
          )}

          {user.status !== 'PENDING' && (
            <>
              <div className="border-t border-gray-100 my-1" />
              {!rolePicker ? (
                <button
                  onClick={() => setRolePicker(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-gray-700"
                >
                  <ChevronDown size={14} className="text-gray-400" />
                  Rol Değiştir
                </button>
              ) : (
                <div className="px-3 py-2 space-y-1">
                  <p className="text-xs text-gray-400 font-semibold mb-2">Yeni rol seç:</p>
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => { onAction(user.id, 'change_role', r); setOpen(false); setRolePicker(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:opacity-80 border ${ROLE_CFG[r].style}`}
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
  const [formError, setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState('');

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
    setFullName(''); setEmail(''); setRole('SUPPLIER');
    setFormError(''); setFormSuccess('');
  };

  const handleInvite = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');

    if (!fullName || !email) { setFormError('Tüm alanları doldurun.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Geçerli bir e-posta girin.'); return; }
    if (users.some(u => u.email === email)) { setFormError('Bu e-posta zaten kayıtlı.'); return; }

    try {
      const newUser = await apiCreateUser({
        email,
        password: 'TemporaryPassword123!',
        full_name: fullName,
        role: role
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
      setFormSuccess(`${fullName} adresine davet gönderildi.`);
      setFullName(''); setEmail(''); setRole('SUPPLIER');
    } catch (err: any) {
      setFormError(err.message || 'Kullanıcı oluşturulurken hata oluştu.');
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
        if (action === 'suspend')     return { ...u, status: 'SUSPENDED' };
        if (action === 'activate')    return { ...u, status: 'ACTIVE' };
        if (action === 'deactivate')  return { ...u, status: 'INACTIVE' };
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
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Başlık */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Kullanıcılar</h1>
          <p className="text-sm text-gray-500 mt-1">Sisteme erişimi olan tüm kullanıcıları yönetin.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={15} className="mr-1.5" />
          Davet Gönder
        </Button>
      </div>

      {/* Özet istatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Toplam Kullanıcı', value: counts.total, style: 'text-gray-900' },
          { label: 'Aktif',            value: counts.active,  style: 'text-green-700' },
          { label: 'Davet Bekliyor',   value: counts.pending, style: 'text-yellow-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.style}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Davet Formu */}
      {showForm && (
        <div className="bg-white border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">Yeni Kullanıcı Daveti</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Kullanıcıya davet maili gönderilecek. Kullanıcı linke tıklayarak kendi şifresini belirleyecek.
            Admin şifreyi görmez.
          </p>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Ad Soyad"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ahmet Yılmaz"
              />
              <Input
                label="E-posta Adresi"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ahmet@erdemir.com"
              />
            </div>

            <div className="flex flex-col gap-1.5 max-w-xs">
              <label className="text-sm font-semibold text-gray-700">Rol</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{ROLE_CFG[r].label}</option>
                ))}
              </select>
              {role === 'ADMIN' && (
                <p className="text-xs text-orange-600 font-semibold mt-1">
                  ⚠ Yönetici rolü tam sisteme erişim sağlar.
                </p>
              )}
            </div>

            {formError && <p className="text-sm text-red-600 font-semibold">{formError}</p>}

            {formSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <UserCheck size={16} />
                {formSuccess}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" variant="primary" size="sm">Davet Gönder</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
            </div>
          </form>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim veya e-posta ara..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value as Role | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="ALL">Tüm Roller</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_CFG[r].label}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as UserStatus | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="ALL">Tüm Durumlar</option>
          {(Object.keys(STATUS_CFG) as UserStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Kullanıcı Tablosu */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Kullanıcı</th>
              <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Şirket</th>
              <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Rol</th>
              <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Durum</th>
              <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Son Giriş</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400 font-medium">
                  Eşleşen kullanıcı bulunamadı.
                </td>
              </tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {u.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs font-medium">{domainOf(u.email)}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${ROLE_CFG[u.role].style}`}>
                    {ROLE_CFG[u.role].label}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_CFG[u.status].style}`}>
                    {STATUS_CFG[u.status].label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400 font-medium">{formatDate(u.last_login)}</td>
                <td className="px-3 py-3.5 text-right">
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

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 font-medium">
              {filtered.length} / {users.length} kullanıcı gösteriliyor
            </p>
          </div>
        )}
      </div>
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
