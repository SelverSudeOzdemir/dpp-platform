import React from 'react';

// Modal'ın dışarıdan alacağı komutlar ve veriler
interface ModalProps {
  isOpen: boolean;           // Modal açık mı kapalı mı? (true/false)
  onClose: () => void;       // Çarpıya veya arka plana tıklayınca çalışacak kapatma fonksiyonu
  title?: string;            // Modal'ın tepesinde yazacak başlık
  children: React.ReactNode; // Modal'ın içine koyacağımız asıl içerik
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // 1. Kural: Eğer isOpen 'false' ise, ekrana HİÇBİR ŞEY çizme! (Sırrımız bu)
  if (!isOpen) return null;

  return (
    // Arka planı karartan ve bulanıklaştıran siyahımsı katman (Backdrop)
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      
      {/* Asıl Beyaz Modal Kutusu */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Başlık ve Kapatma Butonu (Header alanı) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
          >
            {/* Çarpı (X) İkonu (SVG formatında) */}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal İçeriği (Body alanı) - Eğer içerik çok uzarsa kaydırma çubuğu çıkar */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
  );
};

export default Modal;