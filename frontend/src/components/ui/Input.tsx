import React, { InputHTMLAttributes, forwardRef } from 'react';

// 1. TypeScript Arayüzü: Input'un standart HTML özelliklerine ek olarak label ve error almasını sağlıyoruz.
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; // Örneğin: "Kullanıcı Adı"
  error?: string; // Örneğin: "Şifre en az 8 karakter olmalıdır"
}

// 2. forwardRef Mimarisi: Profesyonel form yönetimi için şarttır.
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {/* Eğer label gönderilmişse, input'un üstünde göster */}
        {label && (
          <label className="text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        
        {/* Ana Input Alanı */}
        <input
          ref={ref}
          className={`
            px-4 py-2 border rounded-md text-gray-900 bg-white
            focus:outline-none focus:ring-2 transition-all duration-200
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' // Hata varsa kırmızı yap
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500' // Hata yoksa standart mavi focus
            }
            ${className}
          `}
          {...props} // placeholder, type="password", onChange gibi özellikleri yakalar
        />

        {/* Eğer error mesajı gönderilmişse, input'un altında kırmızı renkle göster */}
        {error && <span className="text-xs font-medium text-red-500">{error}</span>}
      </div>
    );
  }
);

// React DevTools'ta isminin düzgün görünmesi için:
Input.displayName = 'Input';

export default Input;