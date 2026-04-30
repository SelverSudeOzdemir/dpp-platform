import axios from 'axios';

// 1. Temel Yapılandırma (Instance)
// Uygulamadaki tüm istekler bu temel ayarları kullanacak.
const apiClient = axios.create({
  // İleride buraya Kocaer'in gerçek backend sunucu adresini (örneğin https://api.kocaer.com) yazacağız.
  // Şimdilik yerel geliştirme ortamı (localhost) portunu veriyoruz.
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000, // 10 saniye içinde cevap gelmezse isteği iptal et (Sonsuz yüklemeyi önler)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request (İstek) Interceptor'ı -> Giden Kargoyu Kontrol Et
// Sunucuya bir istek gitmeden HEMEN ÖNCE burası çalışır.
apiClient.interceptors.request.use(
  (config) => {
    // TODO: İleride Auth Context kurduğumuzda kullanıcının JWT Token'ını buradan alacağız.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Eğer token varsa, bunu her isteğin "Authorization" başlığına gizlice ekle.
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response (Cevap) Interceptor'ı -> Gelen Kargoyu Kontrol Et
// Sunucudan cevap geldiğinde, sayfaya ulaşmadan HEMEN ÖNCE burası çalışır.
apiClient.interceptors.response.use(
  (response) => {
    // İstek başarılıysa veriyi olduğu gibi geçir
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        // Token geçersiz veya süresi dolmuş — oturumu temizle ve login'e yönlendir
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          const current = window.location.pathname;
          const loginUrl =
            current && current !== '/login'
              ? `/login?returnUrl=${encodeURIComponent(current)}`
              : '/login';
          window.location.href = loginUrl;
        }
      } else if (status === 403) {
        console.error('Bu işlem için yetkiniz yok.');
      } else if (status >= 500) {
        console.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
      }
    } else if (error.request) {
      console.error('Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;