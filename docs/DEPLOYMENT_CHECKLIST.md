# AuraStream Deployment Checklist (DigitalOcean)

## Pre-Deployment

### 1. Backend Environment Variables

All configured in `backend/.env`:
```
APP_ENV=production
DEBUG=false
SUPABASE_URL=https://qgyvdadgdomnubngfpun.supabase.co
SUPABASE_ANON_KEY=<configured>
SUPABASE_SERVICE_ROLE_KEY=<configured>
JWT_SECRET_KEY=<GENERATE NEW FOR PRODUCTION>
REDIS_URL=<your-digitalocean-redis-url>
GOOGLE_API_KEY=<configured>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_1Sj3iYDWmLUvSg8TDBZl984U
ALLOWED_ORIGINS=https://aurastream.shop,https://www.aurastream.shop
FRONTEND_URL=https://aurastream.shop
```

### 2. Frontend Environment Variables

Set in DigitalOcean App Platform or `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://qgyvdadgdomnubngfpun.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=https://aurastream.shop/api
NEXT_PUBLIC_APP_URL=https://aurastream.shop
```

### 3. ⚠️ IMPORTANT: Generate New JWT Secret

Run this command and update `JWT_SECRET_KEY` in `.env`:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Database Migrations

Run all migrations in Supabase SQL editor:
```
backend/database/migrations/001_*.sql through 016_*.sql
```

### 5. Stripe Webhook

Update webhook endpoint in Stripe Dashboard:
- URL: `https://aurastream.shop/api/v1/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.*`

---

## DigitalOcean App Platform Setup

### Backend (Python/FastAPI)

1. Create new App → GitHub repo
2. Source: `backend` directory
3. Build Command: `pip install -r requirements.txt`
4. Run Command: `uvicorn api.main:app --host 0.0.0.0 --port 8080`
5. HTTP Port: 8080
6. Add environment variables from `.env`
7. Add managed Redis database

### Frontend (Next.js)

1. Add component to same App
2. Source: `tsx` directory  
3. Build Command: `npm install && npm run build`
4. Run Command: `npm start`
5. HTTP Port: 3000
6. Add environment variables

### Domain Configuration

1. Add custom domain: `aurastream.shop`
2. Configure DNS to point to DigitalOcean
3. Enable HTTPS (automatic with DO)

---

## Post-Deployment Verification

- [ ] Frontend loads at https://aurastream.shop
- [ ] API health: `curl https://aurastream.shop/api/health`
- [ ] User signup works
- [ ] User login works  
- [ ] Asset generation works
- [ ] Stripe checkout works
- [ ] Webhook receives events

---

## Production Hardening ✅

- [x] `SUPPRESS_DEV_LOGS = true` in devLogger.ts
- [x] `DEBUG=false` in backend .env
- [x] `APP_ENV=production` in backend .env
- [x] CORS restricted to production domains
- [ ] Generate new JWT_SECRET_KEY (DO THIS!)
