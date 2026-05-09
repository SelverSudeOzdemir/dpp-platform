import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const Navbar = () => {
  const { user, logout, role } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isAdmin = role === 'ADMIN';
  const isEngineer = role === 'ENGINEER';
  const isLimitedRole = ['SUPPLIER', 'CUSTOMER', 'AUTHORITY'].includes(role);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* SOL: Logo + Role'e göre menü */}
          <div className="flex items-center gap-8">
            <div
              className="flex-shrink-0 flex items-center cursor-pointer"
              onClick={() => router.push(isAdmin ? '/' : isEngineer ? '/batches' : '/my-dpps')}
            >
              <span className="text-2xl font-black text-blue-700 tracking-tighter">KOCAER</span>
              <span className="ml-2 text-sm font-semibold text-gray-500 mt-1">DPP Portal</span>
            </div>

            <div className="hidden md:flex space-x-1">
              {/* ADMIN menüsü */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => router.push('/')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      router.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/admin')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      router.pathname === '/admin' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    Admin Paneli
                  </button>
                </>
              )}

              {/* ENGINEER menüsü */}
              {isEngineer && (
                <>
                  <button
                    onClick={() => router.push('/batches')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      router.pathname.startsWith('/batches') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    Batch'lerim
                  </button>
                  <button
                    onClick={() => router.push('/batches/new')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      router.pathname === '/batches/new' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    Yeni Batch
                  </button>
                </>
              )}

              {/* SUPPLIER / CUSTOMER / AUTHORITY menüsü */}
              {isLimitedRole && (
                <button
                  onClick={() => router.push('/my-dpps')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    router.pathname === '/my-dpps' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Sizi İlgilendiren DPP'ler
                </button>
              )}
            </div>
          </div>

          {/* SAĞ: Demo rol seçici + Profil + Çıkış */}
          <div className="flex items-center gap-4">

            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1" />

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{user?.full_name || 'Kullanıcı'}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                isAdmin              ? 'bg-red-50 text-red-600'       :
                isEngineer           ? 'bg-green-50 text-green-700'   :
                role === 'SUPPLIER'  ? 'bg-orange-50 text-orange-600' :
                role === 'CUSTOMER'  ? 'bg-blue-50 text-blue-600'     :
                role === 'AUTHORITY' ? 'bg-purple-50 text-purple-600' :
                                       'bg-gray-50 text-gray-500'
              }`}>
                {role}
              </span>
            </div>

            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-inner">
              {user?.full_name?.charAt(0) || 'U'}
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2" />

            <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
              Çıkış Yap
            </Button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
