// src/types/product.ts

// Kocaer DPP (Dijital Ürün Pasaportu) Veri Modeli
export interface ProductPassport {
  id?: string; // Veritabanı otomatik atayacağı için opsiyonel (?)
  productName: string;      // Örn: Yapısal Çelik Profil
  productionLine: string;   // Örn: Hat-04
  serialNo: string;         // Örn: KCR-2024-XXXX
  steelQuality: string;     // Örn: S355JR
  thickness: number;        // Kalınlık (mm)
  width: number;            // Genişlik (mm)
  length: number;           // Boy (mt)
  carbonEmission: number;   // CO2 Emisyonu
  recyclingRate: number;    // Geri Dönüşüm Oranı (%)
  status?: 'Draft' | 'Active' | 'Archived'; // Rozetlerimiz için durumlar
  createdAt?: string;       // Oluşturulma tarihi
}