# Vercel Free Deploy (CivicFix)

Config already in repo: `vercel.json`, `tsup.config.ts`, `npm run vercel-build`.

## 1. Import project

1. Open [https://vercel.com/new](https://vercel.com/new)
2. Import GitHub repo: `iqbalxrr/civicfix_backend_B7A5`
3. Framework Preset: **Other**
4. Build Command: `npm run vercel-build`
5. Output / Install: leave default (`npm install`)
6. Click **Deploy** (first deploy may fail until env vars are set — that is OK)

## 2. Environment Variables

Project → **Settings → Environment Variables** → add for **Production**:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Prisma Postgres URL |
| `JWT_ACCESS_SECRET` | from local `.env` |
| `JWT_REFRESH_SECRET` | from local `.env` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `BASE_URL` | `https://YOUR-PROJECT.vercel.app` (set after first URL is known) |
| `CLIENT_URL` | same as `BASE_URL` |
| `GOOGLE_CLIENT_ID` | from `.env` |
| `GOOGLE_CLIENT_SECRET` | from `.env` |
| `BKASH_USERNAME` | from `.env` |
| `BKASH_PASSWORD` | from `.env` |
| `BKASH_APP_KEY` | from `.env` |
| `BKASH_APP_SECRET` | from `.env` |
| `BKASH_BASE_URL` | `https://tokenized.sandbox.bka.sh/v1.2.0-beta` |
| `REDIS_URL` | from `.env` |
| `CLOUDINARY_CLOUD_NAME` | from `.env` |
| `CLOUDINARY_API_KEY` | from `.env` |
| `CLOUDINARY_API_SECRET` | from `.env` |
| `PRIORITY_FEE_BDT` | `50` |

Then **Redeploy**.

## 3. After live URL

1. Update `BASE_URL` + `CLIENT_URL` to the real `https://....vercel.app`
2. Redeploy once more
3. Test: `https://YOUR-PROJECT.vercel.app/health`

## 4. Seed production DB (local machine)

```bash
# keep DATABASE_URL pointing to Prisma Postgres
npx prisma migrate deploy
npm run prisma:seed
```

## Notes

- Free Vercel sleeps on inactivity (cold start OK for assignment)
- Do **not** upload `.env` to GitHub
- Postman `baseUrl` = `https://YOUR-PROJECT.vercel.app/api/v1`
