import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, AlertTriangle, X } from 'lucide-react';

const ROLE_META: Record<string, { label: string; cls: string }> = {
  ADMIN:     { label: 'Admin',      cls: 'bg-rose-50   text-rose-600   ring-1 ring-rose-200'   },
  ENGINEER:  { label: 'Mühendis',   cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  SUPPLIER:  { label: 'Tedarikçi',  cls: 'bg-orange-50 text-orange-600  ring-1 ring-orange-200' },
  CUSTOMER:  { label: 'Müşteri',    cls: 'bg-blue-50   text-blue-600    ring-1 ring-blue-200'   },
  AUTHORITY: { label: 'Otorite',    cls: 'bg-purple-50 text-purple-600  ring-1 ring-purple-200' },
};

const KocaerLogo = () => (
  <div className="flex items-center gap-2.5 select-none">
    <div className="flex items-center gap-[4px]">
      <div className="w-[5px] h-[26px] bg-[#E31E24]" />
      <div className="w-[5px] h-[26px] bg-[#E31E24]" />
      <div className="w-[5px] h-[26px] bg-[#E31E24]" />
    </div>
    <span className="text-[20px] font-black text-slate-900 tracking-[0.06em] leading-none">
      KOCAER
    </span>
  </div>
);

const Navbar = () => {
  const { user, logout, role } = useAuth();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.push('/login');
  };

  const isAdmin     = role === 'ADMIN';
  const isEngineer  = role === 'ENGINEER';
  const isLimitedRole = ['SUPPLIER', 'CUSTOMER', 'AUTHORITY'].includes(role);

  const meta    = ROLE_META[role] ?? { label: role, cls: 'bg-gray-50 text-gray-500' };
  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const NavLink = ({ path, label, exact = true }: { path: string; label: string; exact?: boolean }) => {
    const isActive = exact ? router.pathname === path : router.pathname.startsWith(path);
    return (
      <button
        onClick={() => router.push(path)}
        className={`relative px-3.5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
          isActive
            ? 'text-blue-700 bg-blue-50/80'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        {label}
        {isActive && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-600 rounded-full" />
        )}
      </button>
    );
  };

  return (
    <>
      <nav className="bg-white sticky top-0 z-50 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-[68px] items-center">

            {/* SOL: Logo + ayraç + menü */}
            <div className="flex items-center gap-5">

              {/* Logo */}
              <div
                className="flex-shrink-0 flex items-center gap-3 cursor-pointer"
                onClick={() => router.push(isAdmin ? '/' : isEngineer ? '/batches' : '/my-dpps')}
              >
                <KocaerLogo />
                <span className="hidden lg:block text-[11px] font-bold text-gray-400 border-l border-gray-200 pl-3 tracking-wide">
                  DPP Portal
                </span>
              </div>

              {/* Dikey ayraç */}
              <div className="hidden md:block h-7 w-px bg-gray-150" style={{ backgroundColor: '#e5e7eb' }} />

              {/* Nav linkleri */}
              <div className="hidden md:flex items-center gap-0.5">
                {isAdmin && (
                  <>
                    <NavLink path="/"             label="Dashboard" />
                    <NavLink path="/admin"         label="Admin Paneli" />
                    <NavLink path="/supply-chain"  label="Tedarik Zinciri" exact={false} />
                    <NavLink path="/admin/users"   label="Kullanıcılar" />
                  </>
                )}
                {isEngineer && (
                  <>
                    <NavLink path="/batches"      label="Batch'lerim"     exact={false} />
                    <NavLink path="/batches/new"  label="Yeni Batch" />
                    <NavLink path="/supply-chain" label="Tedarik Zinciri" exact={false} />
                  </>
                )}
                {isLimitedRole && (
                  <NavLink path="/my-dpps" label="Sizi İlgilendiren DPP'ler" />
                )}
              </div>
            </div>

            {/* SAĞ: profil + çıkış */}
            <div className="flex items-center gap-2">

              {/* Profil butonu */}
              <button
                onClick={() => router.push('/profile')}
                className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
              >
                {/* İsim + rol */}
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-blue-700 transition-colors">
                    {user?.full_name || 'Kullanıcı'}
                  </p>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                {/* Avatar */}
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-200 group-hover:shadow-lg group-hover:shadow-blue-300 transition-all flex-shrink-0">
                  {initials}
                </div>
              </button>

              {/* Mobil avatar */}
              <button
                onClick={() => router.push('/profile')}
                className="sm:hidden h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-black text-sm shadow-md"
              >
                {initials}
              </button>

              <div className="h-6 w-px bg-gray-100 mx-1" />

              {/* Çıkış */}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Çıkış Yap"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>

          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-blue-600 via-blue-400 to-blue-100" />
      </nav>

      {/* ── ÇIKIŞ ONAY MODALI ── */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={() => setShowLogoutModal(false)}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Kapat butonu */}
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X size={16} />
            </button>

            {/* İçerik */}
            <div className="pt-8 pb-6 px-6 text-center">
              {/* İkon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
                <LogOut size={28} className="text-red-500" />
              </div>

              <h3 className="text-lg font-black text-gray-900 mb-2">
                Çıkış Yapmak İstiyor musunuz?
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Oturumunuz sonlandırılacak ve giriş sayfasına yönlendirileceksiniz.
              </p>
            </div>

            {/* Butonlar */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
              >
                İptal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-100 hover:shadow-xl hover:shadow-red-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <LogOut size={15} />
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
