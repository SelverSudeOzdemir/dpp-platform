# Kocaer Çelik — Digital Product Passport (DPP) Platform

Kocaer Çelik için geliştirilmiş olan bu proje; çelik üretim endüstrisi özelinde, **ESPR (Ecodesign for Sustainable Products Regulation)** ve **CBAM (Carbon Border Adjustment Mechanism)** yönergelerine tam uyumlu, uçtan uca izlenebilir bir Dijital Ürün Pasaportu ve Tedarik Zinciri platformudur.

Proje, modern yazılım mimarisi prensipleri ile tasarlanmış olup modüler bir yapıya sahiptir.

---

## 🏗️ Mimari ve Klasör Yapısı

Proje temel olarak iki ana uygulamadan (Frontend ve Backend) oluşmaktadır. 

### 1. Backend (FastAPI)
Backend tarafında `Python 3.11+` ve `FastAPI` kullanılmıştır. Veritabanı işlemleri asenkron olarak `asyncpg` ve `SQLAlchemy` ile yürütülmektedir. Uygulama, Domain-Driven Design (DDD) yaklaşımına yakın bir modüler (`modules/`) yapıda kurgulanmıştır.

**Aktif Modüller (`backend/app/modules/`):**
*   **`dpp` (Digital Product Passport):** Platformun kalbidir. Ürünlerin üretimden son kullanıcıya kadar olan çevresel, teknik ve sertifika verilerinin dijital bir pasaport altında toplanmasını, versiyonlanmasını ve sunulmasını sağlar.
*   **`supply_chain` (Tedarik Zinciri ve Lojistik):** Tedarikçi firmaların yönetimi, lojistik haritaları, karbon salınım rotaları ve tedarikçi değerlendirme (anket/skorlama) anketlerini içerir.
*   **`ai` (Yapay Zeka ve Kural Motoru):** `Ollama` entegrasyonu (LLaMA 3.2) barındırır. DPP'ler ve tedarikçiler için kural tabanlı (Rule Engine) risk analizi yapar, ardından yapay zeka aracılığıyla profesyonel uyumluluk raporları (AI Reports) üretir. LLM karar vermez, sadece raporlar; kararı kural motoru verir.
*   **`integration` (Entegrasyon & ERP):** Şirket içi ERP sistemleriyle (veya Excel dosyalarıyla) toplu veri aktarımını (Batch import) yönetir. `seed_data` gibi yapılarla uyumlu çalışır.
*   **`auth` & `users`:** Güvenli JWT (JSON Web Token) kimlik doğrulaması. Role-Based Access Control (RBAC) ile `ADMIN`, `ENGINEER`, `AUDITOR` ve `AUTHORITY` yetki seviyelerini yönetir.
*   **`audit`:** Sistemdeki tüm işlemlerin geçmişini, veri değişimlerini ve kimin neyi değiştirdiğini (Audit Log) tutar. Yasal zorunluluklar için geriye dönük tam izlenebilirlik sağlar.
*   **`certifications`:** EN 10204, ISO vb. kalite ve test sertifikalarının sisteme yüklenmesi ve pasaportlara bağlanmasını yönetir.
*   **`compliance`:** CBAM karbon limitleri, SVHC/REACH yasaklı maddeler gibi spesifik regülasyon kontrollerini barındırır.
*   **`lifecycle`:** Ürünün yaşam döngüsündeki (üretim, nakliye, geri dönüşüm) etkinlikleri yönetir.
*   **`products`:** Kocaer'in temel çelik ürün ağacını, kategorilerini ve kalitelerini tanımlar.
*   **`admin` & `export`:** Yönetim paneli metrikleri ve pasaportların dışa aktarımı (PDF/XML).

### 2. Frontend (Next.js & React)
Frontend tarafı `Next.js 15` (Pages Router) ve `React 19` ile inşa edilmiştir. Kullanıcı arayüzü `Tailwind CSS` ile şekillendirilmiştir.

**Ana Sayfalar ve Yapı (`frontend/src/pages/`):**
*   **`admin/`:** Sistem yöneticileri için genel metrikler, sistem sağlığı ve yönetim paneli.
*   **`dpp/`:** Dijital Ürün Pasaportlarının listelenmesi ve detaylı görüntülenmesi. Mobil uyumlu QR kod ile de erişilebilecek açık sayfalar.
*   **`supply-chain/`:** Tedarik zinciri ve lojistik haritalarının (`Leaflet`), aylık CO2 trendleri ve tedarikçi skorlarının (`Recharts`) görselleştirildiği dashboard.
*   **`batches/`:** ERP'den veya Excel'den toplu (batch) pasaport üretimi / veri senkronizasyonu süreçlerini yöneten sihirbaz (wizard) ekranları.
*   **`my-dpps.tsx`:** Üreticinin / Mühendisin kendi oluşturduğu pasaportları ve taslakları takip ettiği alan.

---

## 🛠️ Kullanılan Teknolojiler (Tech Stack)

| Kategori | Teknoloji / Kütüphane | Kullanım Amacı |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI | Yüksek performanslı asenkron API sunucusu |
| **Veritabanı** | PostgreSQL, asyncpg | İlişkisel veritabanı ve asenkron sürücü |
| **ORM & Migrasyon** | SQLAlchemy 2.0, Alembic | Veritabanı modellemesi ve versiyon kontrolü |
| **Frontend Framework** | Next.js 15, React 19 | SSR (Server-Side Rendering) ve arayüz |
| **Stil ve UI** | Tailwind CSS, Lucide React | Hızlı ve modern arayüz tasarımı, ikonlar |
| **Grafik ve Harita** | Recharts, Leaflet | Veri görselleştirme ve lojistik/rota haritaları |
| **Yapay Zeka** | Ollama, LLaMA 3.2 (3B) | Yerel (Local) LLM ile veri gizliliğini koruyarak metin ve rapor üretimi |
| **Veri Doğrulama** | Pydantic (Backend), Zod (Frontend) | Gelen ve giden verilerin tip güvenliği |

---

## 🚀 Projeyi Kurma ve Çalıştırma

### Gereksinimler
*   Node.js (v18+)
*   Python (3.11+)
*   PostgreSQL veritabanı (veya Docker)
*   *(Opsiyonel)* Yerel AI için [Ollama](https://ollama.com/)

### Adım 1: Veritabanı ve Çevre Değişkenleri
`backend` klasörü içinde bir `.env` dosyası oluşturun ve `database/dpp_postgresql_schema_v3.sql` şemasını veritabanınıza import edin (veya Alembic migrasyonlarını çalıştırın).

### Adım 2: Backend'i Başlatma
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r pyproject.toml # Gerekli paketleri kurun
alembic upgrade head          # Veritabanı tablolarını güncelleyin
python seed_data.py           # (Opsiyonel) Test verilerini yükleyin
uvicorn app.main:app --reload --port 8000
```
Backend API dökümanına `http://localhost:8000/docs` adresinden ulaşabilirsiniz.

### Adım 3: Frontend'i Başlatma
```bash
cd frontend
npm install
npm run dev
```
Frontend arayüzüne `http://localhost:3000` adresinden ulaşabilirsiniz.

### Adım 4: Yapay Zeka (Ollama) Aktivasyonu
Platformdaki AI raporlama özelliklerini (örn. `modules/ai`) kullanmak için sisteminizde Ollama çalışıyor olmalıdır:
```bash
ollama run llama3.2
```
Backend `http://127.0.0.1:11434` üzerinden modelle otomatik entegre olacaktır.

---
*Bu dokümantasyon, Kocaer DPP Platformunun mevcut kod tabanı referans alınarak oluşturulmuştur.*
