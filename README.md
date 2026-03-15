# 📿 Nur Tasbih — Dijital Tesbih

## Hızlı Başlangıç

### Seçenek A — Tek komut (Docker)
```bash
docker-compose up --build
# Uygulama: http://localhost
# API:       http://localhost:3001/health
```

### Seçenek B — Manuel (npm veya pnpm)

**Gereksinimler:** Node.js ≥ 18

```bash
# 1. Backend
cd backend
npm install          # veya: pnpm install
node server.js       # veya: npm run dev  (nodemon ile)
# → http://localhost:3001

# 2. Frontend (yeni terminal)
cd frontend
npm install          # veya: pnpm install
npm run dev          # veya: pnpm dev
# → http://localhost:5173 (port meşgulse 5174, 5175... otomatik seçilir)
```

### Seçenek C — Kök dizindeki komutlar
```bash
npm run setup   # her iki bağımlılığı kurar
npm run dev     # backend + frontend paralel başlar
```

---

## Sık Karşılaşılan Sorunlar

### "Port 3001 already in use"
```bash
npx kill-port 3001
node server.js
```

### "better-sqlite3 build error"
```bash
# Çözüm: package.json'daki v11'i kullanın (prebuild içerir, gcc gerekmez)
cd backend && npm install
```

### Vite farklı port seçti (5174, 5175...)
Sorun değil — API proxy her zaman `localhost:3001`'e yönlendirir,
Vite hangi portta olursa olsun çalışır.

---

## Ortam Değişkenleri

### backend/.env
| Değişken | Varsayılan | Açıklama |
|----------|-----------|----------|
| `PORT` | `3001` | API sunucu portu |
| `JWT_SECRET` | *(varsayılan)* | **Üretimde mutlaka değiştirin** |
| `DB_PATH` | `./nur_tasbih.db` | SQLite dosya yolu |
| `FRONTEND_URL` | *(auto)* | CORS için frontend adresi |
| `NODE_ENV` | `development` | `production`'da CORS kısıtlanır |

### frontend/.env (opsiyonel)
| Değişken | Açıklama |
|----------|----------|
| `VITE_API_URL` | Cross-origin API (boş bırakın = Vite proxy kullanır) |

---

## API Endpoint'leri
```
POST /api/auth/register          { email, password }
POST /api/auth/login             { email, password }
GET  /api/auth/me                Bearer token

POST /api/tasbih/session         { count, dhikr }
GET  /api/tasbih/stats
GET  /api/tasbih/history
POST /api/tasbih/dhikr           { transliteration, arabic?, translation?, target? }
GET  /api/tasbih/dhikr
DEL  /api/tasbih/dhikr/:id

POST /api/subscribe              { plan: 'monthly' | 'yearly' }
GET  /api/subscription-status
POST /api/subscribe/cancel

GET  /health
```

---

## AdSense Kurulumu
`src/components/AdBanner.jsx` içinde:
```js
const AD_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'; // Google AdSense ID
const AD_SLOT   = '1234567890';              // Reklam slotu
```

---

## Üretim Deploy (Railway / Render)

**Backend:**
```
Build: npm install
Start: node server.js
Env:   PORT, JWT_SECRET, DB_PATH, NODE_ENV=production, FRONTEND_URL
```

**Frontend:**
```
Build: npm run build
Serve: dist/ klasörü (nginx veya static host)
Env:   (opsiyonel) VITE_API_URL=https://api.yourdomain.com
```
