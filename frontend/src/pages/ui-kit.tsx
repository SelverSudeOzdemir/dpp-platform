import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Stepper from '../components/ui/Stepper';
import ProtectedRoute from '../components/auth/ProtectedRoute';
// Eğer bu bileşenleri de oluşturduysan yorum satırlarını kaldırabilirsin:
// import Badge from '../components/ui/Badge';
// import Modal from '../components/ui/Modal';
// import Table from '../components/ui/Table';

export default function UIKit() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">
        DPP UI Kit - Bileşen Vitrini
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Butonlar */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Butonlar</h2>
          <Card className="flex flex-wrap gap-4 p-6">
            <Button variant="primary">Primary Buton</Button>
            <Button variant="outline">Outline Buton</Button>
          </Card>
        </section>

        {/* Inputlar */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Form Elemanları (Input)</h2>
          <Card className="flex flex-col gap-4 p-6">
            <Input label="Standart Input" placeholder="Metin giriniz..." />
            <Input label="Hatalı Input" error="Bu alan zorunludur!" defaultValue="Yanlış Veri" />
          </Card>
        </section>

        {/* Stepper */}
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Akış Kontrolü (Stepper)</h2>
          <Card className="p-6">
            <Stepper currentStep={1} steps={['Genel Bilgiler', 'Teknik Özellikler', 'Sürdürülebilirlik']} />
          </Card>
        </section>

      </div>
    </div>
    </ProtectedRoute>
  );
}