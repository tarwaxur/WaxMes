# WaxMes

Uçtan uca şifreli, modern bir masaüstü mesajlaşma uygulaması. Electron + Firebase altyapısı ile çalışır.

## Özellikler

- **E2E Şifreleme** — Tüm 1:1 ve grup mesajları AES-256-GCM + RSA-OAEP ile şifrelenir
- **Çoklu Hesap** — Aynı uygulamada birden fazla hesap yönetimi
- **Medya Paylaşımı** — Fotoğraf, video ve sesli mesaj gönderimi
- **Grup Sohbetleri** — Grup oluşturma, üye yönetimi, E2E şifreli grup mesajları
- **Sesli Arama** — WebRTC tabanlı sesli arama
- **Tema Desteği** — 20'den fazla tema
- **Çevrimdışı Erişim** — Mesajlar localStorage'da saklanır, safeStorage ile korunur
- **Otomatik Güncelleme** — GitHub Releases üzerinden otomatik güncelleme

## Güvenlik

- Private key'ler Electron safeStorage API (Windows DPAPI) ile korunur
- Mesaj cache'i safeStorage ile şifrelenir
- Sentetik RSA-2048 + AES-256-GCM hibrit şifreleme
- Content-Security-Policy ile XSS koruması
- Firestore Security Rules ile yetkilendirme

## Gereksinimler

- Node.js 18+
- npm 8+
- Git

## Geliştirme

```bash
npm install
npm start
```

## Test

```bash
npm test
```

17 test ile E2E şifreleme doğrulaması (v1 1:1, v2 grup, unicode, uzun mesaj, hatalı key reddi).

## Build

```bash
npm run build
```

`dist/` klasöründe `WaxMesSetup.exe` oluşturur.

## Lisans

All Rights Reserved. Detaylı bilgi için LICENSE dosyasına bakın.
