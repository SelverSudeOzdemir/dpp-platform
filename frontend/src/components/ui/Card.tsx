import React from 'react';

// Card bileşeninin alacağı özellikler
interface CardProps {
  children: React.ReactNode; // İçine Buton, Input, Yazı... ne koyarsak onu taşıyacak ana kucak
  className?: string;        // Sayfaya özel ufak boyutlandırma vs. eklemek istersek
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
};

export default Card;