import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from './Navbar';

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Şimdilik sadece giriş yapılmışsa Navbar'ı basıyoruz */}
      {isAuthenticated && <Navbar />}
      
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}