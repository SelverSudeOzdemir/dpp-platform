/** @type {import('next').NextConfig} */

const securityHeaders = [
  // XSS saldırılarında tarayıcının inline script çalıştırmasını engeller
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Sayfanın iframe içine gömülmesini engeller (Clickjacking)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Tarayıcının içerik türünü tahmin etmesini engeller (MIME sniffing)
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer bilgisini sınırlar — dışarıya path sızdırmaz
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // HTTPS zorunluluğu (production'da tarayıcı HTTP'ye düşmez)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // İzin verilen kaynak politikası — yalnızca kendi origin'imizden yükleme
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Content Security Policy
  // - default: yalnızca kendi origin
  // - script: kendi origin + next.js inline runtime için 'unsafe-inline' (production build'de kaldırılabilir)
  // - style: Tailwind inline style'lar için 'unsafe-inline' gerekli
  // - img: data URI'lere (base64) izin ver
  // - connect: API sunucusuna + localhost'a izin ver
 {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' http://localhost:5000 http://localhost:8000 https://api.kocaer.com",
      "frame-ancestors 'none'",
    ].join('; '),
},
];

const nextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      // Tüm sayfalara uygula
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
};

module.exports = nextConfig;
