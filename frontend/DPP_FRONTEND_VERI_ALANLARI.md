# Kocaer DPP — Frontend Veri Alanları Envanteri

> **Amaç:** Backend entegrasyonu için frontend tarafındaki tüm veri alanlarının eksiksiz listesi.  
> **Kapsam:** `batches/new.tsx`, `batches/index.tsx`, `batches/[id].tsx`, `admin/index.tsx`, `dpp/[id].tsx`, `Services/productService.ts`  
> **Tarih:** 2026-04-13

---

## İçindekiler

1. [BatchInfo — Batch Oluşturma Formu (Adım 1)](#1-batchinfo--batch-oluşturma-formu-adım-1)
2. [UrunKatalog — Ürün Kataloğu (Sabitler)](#2-urunkatalog--ürün-kataloğu-sabitler)
3. [DppData — DPP Verileri Formu (Adım 2)](#3-dppdata--dpp-verileri-formu-adım-2)
   - 3a. Teknik Bilgiler
   - 3b. Kimyasal Kompozisyon
   - 3c. Mekanik Özellikler
   - 3d. Sertifikalar (Certification[])
   - 3e. Tedarik Zinciri (SupplyStage[])
   - 3f. Sürdürülebilirlik — CO₂
   - 3g. EPD Beyanı
   - 3h. Döngüsel Ekonomi
   - 3i. Tehlikeli Maddeler (HazardousSubstance[])
   - 3j. Ömür Sonu
   - 3k. Üretici & Tesis (Read-only)
4. [Batch — Liste Sayfası](#4-batch--liste-sayfası)
5. [BatchDetail — Batch Detay Sayfası](#5-batchdetail--batch-detay-sayfası)
6. [AdminProduct — Admin Pasaport Yönetimi](#6-adminproduct--admin-pasaport-yönetimi)
7. [PendingBatch — Onay Bekleyen Batch (Admin)](#7-pendingbatch--onay-bekleyen-batch-admin)
8. [Product — Eski Sistem (productService.ts)](#8-product--eski-sistem-productservicets)
9. [Kritik Alan Adı Farklılıkları](#9-kritik-alan-adı-farklılıkları-frontend--backend)

---

## 1. `BatchInfo` — Batch Oluşturma Formu (Adım 1)

**Dosya:** `src/pages/batches/new.tsx`  
**Kullanım:** Yeni batch/DPP oluştururken doldurulan ilk adım formu.

| Alan | Tip | Kaynak | Zorunlu | Açıklama |
|------|-----|--------|:-------:|----------|
| `parti_no` | `string` | Manuel / SAP | ✅ | Kocaer üretim parti no — format: `KCR-2026-XXXX-A` |
| `tedarikci_parti_kodu` | `string` | Manuel / SAP | — | Hammadde tedarikçisinin kendi batch referansı (Erdemir vb.) |
| `urun_no` | `string` | Dropdown (katalog) | ✅ | Katalog kodu — `IPE-200`, `HEB-300` vb. |
| `urun_tipi` | `string` | Katalogdan otomatik | — | İnsan okunur ürün adı — `urun_no` seçilince dolar |
| `ocak_no` | `string` | Manuel / SAP | ✅ | Fırın/eritme ocağı kodu — `EAF-03` vb. |
| `uretim_tarihi` | `string` (date) | Manuel / SAP | ✅ | ISO 8601 tarih formatı |
| `miktar_ton` | `string` (number) | Manuel / SAP | ✅ | Ton cinsinden üretim miktarı |

> **Not:** `gtin` ve `hs_code` alanları `urun_no` seçilince katalogdan otomatik gelir, kullanıcı düzenleyemez.

---

## 2. `UrunKatalog` — Ürün Kataloğu (Sabitler)

**Dosya:** `src/pages/batches/new.tsx`  
**Kullanım:** Ürün seçilince GTIN, HS Code ve teknik değerleri otomatik doldurmak için.  
**Mevcut kayıtlar:** IPE-100, IPE-200, IPE-240, HEB-300, HEA-200, UPN-160, ANG-100x100x10

| Alan | Tip | Açıklama |
|------|-----|----------|
| `urun_no` | `string` | Birincil anahtar — `IPE-200`, `HEB-300` vb. |
| `urun_tipi` | `string` | Açıklama metni |
| `gtin` | `string` (13 hane) | Ürün düzeyinde sabit — tüm batch'lerde aynı |
| `hs_code` | `string` | GTİP kodu — CBAM beyanında zorunlu (`7216.32` vb.) |
| `malzeme_standard` | `string` | `EN 10025-2`, `EN 10279`, `EN 10056-1` vb. |
| `celik_kalitesi` | `string` | `S355JR`, `S235JR` vb. |
| `agirlik_m` | `string` | kg/m biriminde metre başı ağırlık |
| `en_mm` | `string` | mm biriminde kesit genişliği |
| `kalinlik_mm` | `string` | mm biriminde et kalınlığı |

---

## 3. `DppData` — DPP Verileri Formu (Adım 2)

**Dosya:** `src/pages/batches/new.tsx`  
**Kullanım:** DPP'nin teknik, çevresel ve uyum verilerini içeren ana form.

---

### 3a. Teknik Bilgiler

| Alan | Tip | Kaynak | Zorunlu | Açıklama |
|------|-----|--------|:-------:|----------|
| `gtin` | `string` | Katalogdan otomatik | read-only | Ürün düzeyinde sabit kimlik |
| `material_standard` | `string` | Katalogdan otomatik | read-only | `EN 10025-2:2019` vb. |
| `celik_kalitesi` | `string` | Katalogdan otomatik | read-only | `S355JR`, `S275JR` vb. |
| `en_mm` | `string` | Katalogdan otomatik | read-only | mm |
| `agirlik_m` | `string` | Katalogdan otomatik | read-only | kg/m |
| `kalinlik_mm` | `string` | Katalogdan otomatik | read-only | mm |
| `boy_mm` | `string` (number) | Manuel | ✅ | Boy/uzunluk — mm — `6000`, `9000`, `12000` |

---

### 3b. Kimyasal Kompozisyon

| Alan | Tip | Birim | Açıklama |
|------|-----|-------|----------|
| `c_pct` | `string` | % | Karbon (C) — maks %0.24 |
| `mn_pct` | `string` | % | Manganez (Mn) — maks %1.60 |
| `si_pct` | `string` | % | Silisyum (Si) — maks %0.55 |
| `p_pct` | `string` | % | Fosfor (P) — maks %0.030 |
| `s_pct` | `string` | % | Kükürt (S) — maks %0.030 |
| `n_pct` | `string` | % | Azot (N) — maks %0.012 |

> **Not:** Fe (Demir) oranı frontend'de `100 - (C+Mn+Si+P+S+N)` formülüyle hesaplanıp gösterilir; backend'e ayrıca gönderilmez.

---

### 3c. Mekanik Özellikler

| Alan | Tip | Birim | Açıklama |
|------|-----|-------|----------|
| `yield_mpa` | `string` | MPa | Akma Dayanımı — S355JR min: 355 MPa |
| `tensile_mpa` | `string` | MPa | Çekme Dayanımı — S355JR aralık: 470–630 MPa |
| `elongation_pct` | `string` | % | Uzama Oranı — S355JR min: %22 |
| `impact_energy_j` | `string` | J | Darbe Enerjisi (Charpy) — min: 27 J |
| `impact_temp_c` | `string` | °C | Test Sıcaklığı — JR: +20°C / J0: 0°C / J2: -20°C |

---

### 3d. Sertifikalar — `Certification[]` (Dizi)

Her batch için birden fazla sertifika eklenebilir.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|:-------:|----------|
| `id` | `number` | (iç) | Frontend tarafı geçici ID — `Date.now()` |
| `cert_type` | `string` | ✅ | `EN 10204 Tip 3.1`, `EN 10204 Tip 3.2`, `CE Marking`, `EPD Belgesi` |
| `cert_no` | `string` | ✅ | Belge numarası — `3.1-20260312-003` vb. |
| `issuer` | `string` | — | Veren kuruluş — `Kocaer QC`, `TÜV NORD` vb. |
| `issue_date` | `string` (date) | ✅ | Düzenlenme tarihi |
| `expiry_date` | `string` (date) | ✅ | Geçerlilik bitiş tarihi |
| `file_name` | `string` | ✅ | Yüklenen PDF dosya adı |

---

### 3e. Tedarik Zinciri — `SupplyStage[]` (Dizi)

**ADIM 1** (Hammadde Tedariki — tedarikçi): Kullanıcı tarafından doldurulur.  
**ADIM 2** (Üretim — Kocaer): Batch bilgilerinden otomatik — salt okunur.  
**Ek Aşamalar:** Opsiyonel, dinamik olarak eklenebilir.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|:-------:|----------|
| `id` | `number` | (iç) | Frontend geçici ID |
| `stage_name` | `string` | — | `Hammadde Tedariki`, `Çelik Üretimi` vb. |
| `organization` | `string` | ✅ ADIM 1 | Tedarikçi/organizasyon adı |
| `role` | `string` | — | `Hammadde Tedarikçisi`, `Üretici` vb. |
| `location` | `string` | — | `Ereğli, Zonguldak` vb. |
| `material_origin` | `string` | — | Menşei ülke |
| `process` | `string` | — | `EAF Ergitme`, `Sıcak Haddeleme` vb. |
| `material` | `string` | — | `Çelik Billet`, `Demir Cevheri` vb. |
| `quantity` | `string` (number) | — | Miktar |
| `unit` | `string` | — | `ton`, `kg`, `adet` |
| `date` | `string` (date) | — | Aşama tarihi |

---

### 3f. Sürdürülebilirlik — CO₂ (EN 15804+A2)

| Alan | Tip | Birim | Zorunlu | Standart |
|------|-----|-------|:-------:|---------|
| `co2_a1a3` | `string` | kg CO₂e/kg | ✅ | ESPR + CBAM — A1+A2+A3 toplam emisyon |
| `co2_a3` | `string` | kg CO₂e/kg | — | Sadece üretim aşaması emisyonu |
| `co2_a4` | `string` | kg CO₂e/kg | — | Sevkiyat emisyonu |
| `co2_verification` | `string` (select) | — | — | `Üçüncü Taraf Doğrulamalı`, `EPD Belgeli`, `Dahili Hesaplama`, `Varsayılan Değer` |

> **CBAM Uyarısı:** `co2_a1a3 > 2.0` kg CO₂e/kg ise frontend kırmızı uyarı gösterir.

---

### 3g. EPD Beyanı (ESPR Zorunlu)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|:-------:|----------|
| `epd_no` | `string` | ✅ | EN 15804+A2 uyumlu EPD belge numarası — `EPD-TR-2024-017-EN` vb. |
| `epd_valid_until` | `string` (date) | ✅ | EPD geçerlilik bitiş tarihi |
| `epd_url` | `string` | — | Belgeye doğrudan erişim linki |

---

### 3h. Döngüsel Ekonomi Göstergeleri (EN 15804+A2)

| Alan | Tip | Birim | Zorunlu | Açıklama |
|------|-----|-------|:-------:|----------|
| `recycled_content_pct` | `string` | % | ✅ ESPR | Üretimde kullanılan geri dönüştürülmüş hammadde oranı |
| `recyclability_pct` | `string` | % | ✅ | Ürünün ömür sonu geri dönüştürülebilirlik oranı |

---

### 3i. Malzeme Uyum Beyanları ve Tehlikeli Maddeler

**Boolean alanlar:**

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|:-------:|----------|
| `svhc_free` | `boolean` | ✅ REACH | SVHC (Çok Yüksek Endişe Veren Madde) içermez beyanı — REACH Tüzüğü Madde 33 |
| `hazardous_materials` | `boolean` | — | Tehlikeli madde içeriyorsa `true` |

**`HazardousSubstance[]` dizisi** (yalnızca `hazardous_materials = true` ise doldurulur):

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|:-------:|----------|
| `id` | `number` | (iç) | Frontend geçici ID |
| `name` | `string` | ✅ | Madde adı — `Kurşun (Pb)` vb. |
| `cas_no` | `string` | ✅ | CAS kayıt numarası — `7439-92-1` vb. |
| `concentration_pct` | `string` | ✅ | Ağırlıkça konsantrasyon (%) — REACH eşiği: %0.1 |
| `svhc` | `boolean` | ✅ | SVHC listesinde mi |

---

### 3j. Ömür Sonu ve İmha

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|:-------:|----------|
| `dismantling_difficulty` | `string` (select) | — | `Çok Kolay`, `Kolay`, `Orta`, `Zor`, `Çok Zor` |
| `disposal_instructions` | `string` (textarea) | ✅ | İmha / geri dönüşüm talimatı — serbest metin |

---

### 3k. Üretici & Tesis Bilgileri (Read-only — Sistem Sabitleri)

Kullanıcı düzenleyemez, sistemden otomatik gelir.

**Üretici:**

| Alan | Tip | Değer |
|------|-----|-------|
| `uretici_adi` | `string` | Kocaer Çelik A.Ş. |
| `uretici_vergi_no` | `string` | TR1234567890 |
| `uretici_website` | `string` | www.kocaersteel.com |
| `uretici_email` | `string` | dpp@kocaersteel.com |
| `uretici_adres` | `string` | Aliağa OSB, 35800 İzmir, Türkiye |
| `uretici_eori` | `string` | TR12345678900000 — formda gösteriliyor, DppData'da alan yok |

**Tesis:**

| Alan | Tip | Değer |
|------|-----|-------|
| `tesis_adi` | `string` | Aliağa Üretim Tesisi |
| `tesis_kodu` | `string` | KCR-ALA-01 |
| `tesis_ulkesi` | `string` | Türkiye |
| `tesis_gln` | `string` | 8690000000001 |
| `tesis_adres` | `string` | Aliağa OSB No:12, 35800 İzmir |
| `tesis_koordinat` | `string` | 38.8008° K, 26.9719° D |

---

## 4. `Batch` — Liste Sayfası

**Dosya:** `src/pages/batches/index.tsx`  
**Kullanım:** Engineer'ın kendi batch'lerini listelediği sayfa.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | `string` | Birincil anahtar — `B-001` vb. |
| `parti_no` | `string` | Kocaer üretim parti no |
| `urun_tipi` | `string` | Ürün açıklama metni |
| `ocak_no` | `string` | Fırın kodu |
| `uretim_tarihi` | `string` | Üretim tarihi |
| `miktar_ton` | `number` | Ton cinsinden miktar |
| `dpp_durum` | `string` | `Taslak`, `Onay Bekliyor`, `Yayında`, `Reddedildi`, `Arşivlendi` |
| `veri_kaynagi` | `string` | `Manuel`, `Excel`, `ERP/API` |
| `olusturan` | `string` | Batch'i oluşturan kullanıcı adı |
| `red_gerekce` | `string` (opsiyonel) | `dpp_durum = Reddedildi` ise dolu |

---

## 5. `BatchDetail` — Batch Detay Sayfası

**Dosya:** `src/pages/batches/[id].tsx`  
**Kullanım:** Tek bir batch'in tüm DPP verilerini gösterme ve düzenleme sayfası. 4 sekme: Genel / Test & Lab / Sürdürülebilirlik / Tedarik Zinciri.

### 5a. Temel Kimlik

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | `string` | `B-001`, `PB-001` vb. |
| `parti_no` | `string` | Kocaer üretim parti no |
| `tedarikci_parti_kodu` | `string` | Hammadde tedarikçisinin referansı |
| `urun_tipi` | `string` | Ürün adı |
| `ocak_no` | `string` | Fırın kodu |
| `uretim_tarihi` | `string` | |
| `miktar_ton` | `string` | |
| `cift_kodu` | `string` | Heat / eritme kodu — SAP'tan gelir, `H-20260312-003` vb. |
| `dpp_durum` | `string` | Durum |
| `veri_kaynagi` | `string` | |
| `olusturan` | `string` | |

### 5b. Ürün Kimliği (Katalog)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `gtin` | `string` | |
| `hs_code` | `string` | GTİP kodu |
| `material_standard` | `string` | EN 10025-2:2019 vb. |

### 5c. Teknik Özellikler

| Alan | Tip | Birim |
|------|-----|-------|
| `celik_kalitesi` | `string` | |
| `en_mm` | `string` | mm |
| `boy_mm` | `string` | mm |
| `kalinlik_mm` | `string` | mm |
| `agirlik_m` | `string` | kg/m |

### 5d. CO₂ ve Sürdürülebilirlik

| Alan | Tip | Açıklama |
|------|-----|----------|
| `co2_a1a3` | `string` | kg CO₂e/kg |
| `co2_a3` | `string` | kg CO₂e/kg |
| `co2_a4` | `string` | kg CO₂e/kg |
| `co2_verification` | `string` | Doğrulama yöntemi |
| `geri_donusum_orani` | `string` | % — `recycled_content_pct` ile eşdeğer |
| `svhc_free` | `boolean` | REACH uyum beyanı |

### 5e. Lab — Kimyasal Kompozisyon

| Alan | Tip |
|------|-----|
| `c_pct` | `string` |
| `si_pct` | `string` |
| `mn_pct` | `string` |
| `p_pct` | `string` |
| `s_pct` | `string` |
| `n_pct` | `string` |

### 5f. Lab — Mekanik Özellikler

| Alan | Tip |
|------|-----|
| `yield_mpa` | `string` |
| `tensile_mpa` | `string` |
| `elongation_pct` | `string` |
| `impact_energy_j` | `string` |
| `impact_temp_c` | `string` |

### 5g. Lab — Test & Sertifika (Tekil)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `test_standard` | `string` | `EN 10025-2:2019` vb. |
| `test_tarihi` | `string` | Test yapılma tarihi |
| `en10204_cert_no` | `string` | Belge numarası |
| `en10204_tip` | `string` | `3.1` veya `3.2` |

### 5h. Sertifikalar Dizisi — `certifications[]`

| Alan | Tip |
|------|-----|
| `id` | `number` |
| `cert_type` | `string` |
| `cert_no` | `string` |
| `issuer` | `string` |
| `issue_date` | `string` |
| `expiry_date` | `string` |
| `file_name` | `string` (opsiyonel) |

### 5i. EPD Beyanı

| Alan | Tip |
|------|-----|
| `epd_cert_no` | `string` |
| `epd_valid_until` | `string` |
| `epd_url` | `string` |

### 5j. Döngüsel Ekonomi

| Alan | Tip |
|------|-----|
| `recyclability_pct` | `string` (%) |

### 5k. Tehlikeli Maddeler Dizisi — `hazardous_substances[]`

| Alan | Tip |
|------|-----|
| `name` | `string` |
| `cas_no` | `string` |
| `concentration_pct` | `string` |
| `svhc` | `boolean` |

### 5l. Ömür Sonu

| Alan | Tip |
|------|-----|
| `eol_disassembly` | `string` |
| `eol_disposal` | `string` |

### 5m. Tedarik Zinciri Dizisi — `supply_chain[]`

| Alan | Tip |
|------|-----|
| `sequence` | `number` |
| `stage_name` | `string` |
| `organization` | `string` |
| `role` | `string` |
| `location` | `string` |
| `date` | `string` |
| `processes` | `string[]` |
| `material` | `string` |
| `material_origin` | `string` |
| `quantity` | `string` |
| `unit` | `string` |

### 5n. Üretici & Tesis

| Alan | Tip |
|------|-----|
| `uretici_adi` | `string` |
| `tesis_adi` | `string` |
| `tesis_ulkesi` | `string` |

### 5o. Admin Red Bilgileri

| Alan | Tip | Açıklama |
|------|-----|----------|
| `red_gerekce` | `string` | Reddetme gerekçesi (serbest metin) |
| `red_fields` | `string[]` | Hatalı alan key'lerinin listesi — `['co2_a1a3', 'svhc_free']` vb. |
| `red_tarihi` | `string` | `2026-03-17 10:14` formatında |
| `red_yapan` | `string` | Admin e-posta adresi |

---

## 6. `AdminProduct` — Admin Pasaport Yönetimi

**Dosya:** `src/pages/admin/index.tsx`  
**Kullanım:** Admin panelinin "Pasaport Yönetimi" sekmesi.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | `string` | `KCR-742` vb. |
| `product_name` | `string` | Ürün adı |
| `product_category` | `string` | `Structural Steel`, `Tubes and Pipes` vb. |
| `co2_cradle_to_gate_kg` | `number` | kg CO₂e/kg — CBAM eşiği: 2.0 |
| `passport_status` | `string` | `Taslak`, `Yayında`, `Arşivlendi`, `Geri Çağrıldı` |
| `version` | `string` | `1.0`, `1.2` vb. |
| `data_source` | `string` | `Manuel`, `SAP/ERP`, `API` |
| `blockchain_timestamp` | `string` | ISO 8601 — boşsa blockchain'e kaydedilmemiş |

---

## 7. `PendingBatch` — Onay Bekleyen Batch (Admin)

**Dosya:** `src/pages/admin/index.tsx`  
**Kullanım:** Admin onay panelindeki batch kartları.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | `string` | `PB-001` vb. |
| `parti_no` | `string` | |
| `urun_tipi` | `string` | |
| `miktar_ton` | `number` | |
| `veri_kaynagi` | `string` | |
| `olusturan` | `string` | |
| `gonderilme_tarihi` | `string` | `2026-03-15 14:22` formatında |
| `co2_a1a3` | `number` | Hızlı CBAM kontrolü için |
| `co2_verification` | `string` | Doğrulama yöntemi |

---

## 8. `Product` — Eski Sistem (`productService.ts`)

**Dosya:** `src/Services/productService.ts`  
**Kullanım:** `/` (dashboard) ve `/dpp/[id].tsx` sayfaları — batch sistemiyle entegre değil.  
**Durum:** Backend bağlandığında SAP API'ye geçilecek; bu interface yerini batch'e dayalı yeni modele bırakacak.

### 8a. Temel Kimlik

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `id` | `string` | `id` |
| `status` | `'Aktif' \| 'Taslak' \| 'Arşiv'` | `status` (ACTIVE / DRAFT / ARCHIVED) |
| `createdAt` | `string` | `issued_at` |
| `product_name` | `string` | `name` |
| `product_category` | `string` | `category` |
| `brand` | `string` | — |
| `gtin` | `string` | `gtin` |
| `batch_number` | `string` | `batch_number` |
| `dimensions` | `string` | `dimensions` |
| `manufacturer_part_number` | `string` | — |

### 8b. Standartlar & Geometri

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `dimensional_standard` | `string` | — |
| `material_standard` | `string` | `material_standard` |
| `steel_grade` | `string` | `steel_grade` |
| `weight_per_meter_kg` | `number` | `weight_per_meter` |
| `section_area_cm2` | `number` | — |
| `standard_length_m` | `number` | — |
| `production_date` | `string` | `production_date` |
| `heat_treatment` | `string` | — |
| `surface_condition` | `string` | — |

### 8c. DPP Yaşam Döngüsü

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `version` | `string` | `version` |
| `issued_at` | `string` | `issued_at` |
| `valid_until` | `string` | `valid_until` |

### 8d. Çevresel & Sürdürülebilirlik

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `epd_number` | `string` | — |
| `epd_url` | `string` | — |
| `co2_cradle_to_gate_kg` | `number` | `carbon_footprint` |
| `water_consumption_l_kg` | `number` | — |
| `recycled_content_pct` | `number` | `recycled_content` |
| `recyclability_pct` | `number` | `recyclability` |
| `hazardous_materials` | `boolean` | `svhc_free` (ters mantık!) |
| `disposal_instructions` | `string` | `disposal_instructions` |
| `dismantling_difficulty` | `string` | `dismantling_difficulty` |

### 8e. Üretici Alt Nesnesi — `manufacturer`

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `name` | `string` | `name` |
| `tax_id` | `string` | `tax_id` |
| `dpp_support_email` | `string` | `contact_email` |
| `website` | `string` | `website` |
| `country` | `string` | `country` |
| `city` | `string` | `city` |
| `address` | `string` | `address` |

### 8f. Tesis Alt Nesnesi — `facility`

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `name` | `string` | `name` |
| `gln_code` | `string` | `gln_code` |
| `country` | `string` | `country` |
| `city` | `string` | `city` |
| `address` | `string` | `address` |

### 8g. Tedarik Zinciri Dizisi — `supply_chain[]`

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `sequence_number` | `number` | `sequence_number` |
| `stage_name` | `string` | `stage_name` |
| `stage_date` | `string` | `stage_date` |
| `traceability_id` | `string` | `traceability_id` |
| `organization.name` | `string` | `organization_name` |
| `organization.role` | `string` | `organization_role` |
| `organization.location_text` | `string` | `location` |
| `organization.country_code` | `string` | `country_code` |
| `material.name` | `string` | `material_name` |
| `material.quantity` | `string` | `quantity` |
| `material.unit` | `string` | `unit` |
| `process.name` | `string` | `process_name` |

### 8h. Sertifikalar Dizisi — `certifications[]`

| Alan | Tip | Backend Karşılığı |
|------|-----|-------------------|
| `cert_type` | `string` | `cert_type` |
| `issuer` | `string` | `issuer` |
| `cert_number` | `string` | `cert_number` |
| `issue_date` | `string` | `issue_date` |
| `expiry_date` | `string` | `expiry_date` |
| `document_url` | `string` | `document_url` |

### 8i. Yaşam Döngüsü Olayları Dizisi — `lifecycle_events[]`

| Alan | Tip |
|------|-----|
| `event_type` | `string` |
| `event_date` | `string` |
| `description` | `string` |
| `performed_by` | `string` |
| `location` | `string` |

### 8j. Kimyasal Kompozisyon Alt Nesnesi — `chemical_composition`

| Alan | Tip |
|------|-----|
| `carbon_pct` | `number` |
| `silicon_pct` | `number` |
| `manganese_pct` | `number` |
| `phosphorus_pct` | `number` |
| `sulfur_pct` | `number` |
| `nitrogen_pct` | `number` |
| `reference_standard` | `string` |

### 8k. Mekanik Özellikler Alt Nesnesi — `mechanical_properties`

| Alan | Tip |
|------|-----|
| `yield_strength_mpa` | `number` |
| `tensile_strength_mpa` | `number` |
| `elongation_pct` | `number` |
| `impact_energy_j` | `number` |
| `impact_temperature_c` | `number` |
| `reference_standard` | `string` |

---

## 9. Kritik Alan Adı Farklılıkları (Frontend ↔ Backend)

Aynı veriyi farklı isimle tutan alanlar. Backend entegrasyonunda mapper'da ele alınmalı.

| Frontend Alanı | Backend Alanı | Fark / Risk |
|----------------|---------------|-------------|
| `product_name` | `name` | İsim farklı |
| `product_category` | `category` | İsim farklı |
| `co2_cradle_to_gate_kg` | `carbon_footprint` | İsim farklı |
| `recycled_content_pct` | `recycled_content` | Tip farklı: frontend `number`, backend `number` — birim % mi ondalık mı? |
| `recyclability_pct` | `recyclability` | Aynı tip riski |
| `hazardous_materials` | `svhc_free` | ⚠️ **Ters mantık** — `svhc_free=true` → `hazardous_materials=false` |
| `dpp_support_email` | `contact_email` | İsim farklı |
| `weight_per_meter_kg` | `weight_per_meter` | İsim farklı |
| `cert_number` (productService) | `cert_no` (batches/new) | **Aynı veri, iki farklı isim** — uyumlanmalı |
| `geri_donusum_orani` (BatchDetail) | `recycled_content_pct` (DppData) | **Aynı veri, iki farklı isim** — uyumlanmalı |
| `eol_disassembly` (BatchDetail) | `dismantling_difficulty` (DppData) | Aynı/benzer veri, farklı isim |
| `eol_disposal` (BatchDetail) | `disposal_instructions` (DppData) | Aynı/benzer veri, farklı isim |

---

*Belge otomatik olarak üretilmiştir — kaynak: frontend TypeScript interface'leri ve form bileşenleri.*
