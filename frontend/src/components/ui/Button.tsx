import React, { ButtonHTMLAttributes } from 'react';

// 1. TypeScript Arayüzü: Butonumuzun hangi özellikleri (props) alabileceğini tanımlıyoruz
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'; // Renk temaları
  size?: 'sm' | 'md' | 'lg'; // Boyutlar
  isLoading?: boolean; // Yükleniyor durumu
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary', // Varsayılan olarak mavi (primary) olacak
  size = 'md',         // Varsayılan boyut orta (md)
  isLoading = false,
  className = '',      // Ekstra özel class eklemek istersek diye
  ...props             // onClick, disabled, type gibi standart HTML özelliklerini yakalar
}) => {
  // 2. Temel Tailwind Sınıfları (Her butonda ortak olan özellikler)
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  // 3. Varyantlara Göre Renkler (Claude'un bahsettiği varyasyonlar)
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  // 4. Boyutlara Göre Padding ve Text Ayarları
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Eğer isLoading true ise bir spinner (dönme animasyonu) göster */}
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;