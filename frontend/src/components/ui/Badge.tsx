import React from 'react';

// Badge'in alabileceği renk temaları
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'default';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  // Bütün badge'lerin ortak özellikleri (Hap görünümü, yuvarlak köşeler)
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";

  // Renk varyasyonları (Arka plan, yazı rengi ve ince bir çerçeve)
  const variants = {
    success: "bg-green-50 text-green-700 border-green-200", // Aktif / Başarılı
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200", // Taslak / Bekliyor
    danger: "bg-red-50 text-red-700 border-red-200", // Hata / İptal
    default: "bg-gray-50 text-gray-600 border-gray-200", // Standart / Bilgi
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;