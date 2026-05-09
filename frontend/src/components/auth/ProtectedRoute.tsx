// src/components/auth/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, Role } from '../../contexts/AuthContext';
import Spinner from '../ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" className="text-blue-600" />
          <p className="text-gray-500 font-medium">Yetki kontrolü yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Rol kısıtlaması varsa ve kullanıcının rolü listede değilse
  if (allowedRoles && !allowedRoles.includes(role)) {
    const homeByRole =
      role === 'ADMIN' ? '/' :
      role === 'ENGINEER' ? '/batches' :
      ['SUPPLIER', 'CUSTOMER', 'AUTHORITY'].includes(role) ? '/my-dpps' :
      '/login';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-black text-gray-900">Yetkisiz Erişim</h1>
        <p className="text-gray-500 font-medium">
          Bu sayfayı görüntülemek için <span className="font-bold text-blue-600">{allowedRoles.join(' veya ')}</span> yetkisi gereklidir.
        </p>
        <button
          onClick={() => router.push(homeByRole)}
          className="mt-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return <>{children}</>;
}