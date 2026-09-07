# CivicFix — City Complaint & Service Platform

Backend REST API for a city complaint and service-request platform. Citizens report issues, departments route and assign staff, SLA is tracked, and priority requests are paid via **bKash Tokenized Checkout**.

## Tech Stack

- Node.js + TypeScript + Express.js
- PostgreSQL + Prisma ORM
- Zod validation
- JWT Bearer auth + Google OAuth (GCP)
- Redis caching
- bKash payment gateway
- Helmet, CORS, express-rate-limit

## Roles (exactly 3)

| Role | Capabilities |
|------|----------------|
| **CITIZEN** | Register/login, create & track complaints, cancel early, pay priority fee, submit feedback |
| **STAFF** | Department queue, assign, status transitions, my-assigned list |
| **ADMIN** | Departments/categories, user roles, dashboard stats, audit logs, soft-delete |

## Quick Start

```bash
cp .env.example .env
# Fill DATABASE_URL, JWT secrets, Google client id, bKash sandbox keys, REDIS_URL

npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

API base: `http://localhost:5000/api/v1`

## Demo Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@civicfix.com` | `Admin@12345` |
| Staff | `staff@civicfix.com` | `Staff@12345` |
| Citizen | `citizen@civicfix.com` | `Citizen@12345` |

## API Overview (20+ endpoints)

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/logout`

### Profile
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`

### Departments & Categories
- `GET|POST /api/v1/departments`
- `GET|PATCH /api/v1/departments/:id`
- `GET|POST /api/v1/categories`
- `GET|PATCH /api/v1/categories/:id`

### Complaints (business workflows)
- `POST /api/v1/complaints`
- `GET /api/v1/complaints` — pagination, filter, sort, search
- `GET /api/v1/complaints/:id`
- `PATCH /api/v1/complaints/:id`
- `DELETE /api/v1/complaints/:id` — soft delete
- `POST /api/v1/complaints/:id/assign`
- `PATCH /api/v1/complaints/:id/status`
- `POST /api/v1/complaints/:id/cancel`
- `GET /api/v1/complaints/my-assigned`
- `POST /api/v1/complaints/:id/feedback`

### Payments (bKash)
- `POST /api/v1/payments/initiate`
- `GET /api/v1/payments/callback`
- `GET /api/v1/payments/:id`
- `GET /api/v1/payments/complaint/:complaintId`

### Admin & Stats
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:id/role`
- `GET /api/v1/admin/dashboard-stats`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/stats/public`

## Response Format

Success:
```json
{ "success": true, "message": "Operation successful", "data": {} }
```

Error:
```json
{ "success": false, "message": "Something went wrong", "errors": [] }
```

## Complaint Status Flow

`SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`  
Also: `REJECTED`, `CANCELLED`

Priority complaints require a **completed bKash payment** before staff assignment.

## bKash Flow

1. Citizen creates a `PRIORITY` complaint
2. `POST /payments/initiate` → returns `bkashURL`
3. Citizen pays on bKash
4. bKash redirects to `/payments/callback`
5. Backend executes payment, stores `trxID`, escalates SLA

## Environment Variables

See [`.env.example`](.env.example).

Required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BASE_URL`, bKash keys for payment demos, `GOOGLE_CLIENT_ID` for Google login.

## Deployment (Render)

1. Create a PostgreSQL database (Neon / Render / Supabase)
2. Create a Web Service from this repo
3. Build: `npm install && npx prisma generate && npm run build`
4. Start: `npx prisma migrate deploy && node dist/server.js`
5. Set all env vars in the Render dashboard
6. Seed once: `npm run prisma:seed`

Optional Redis: Upstash → set `REDIS_URL`.

## API Docs (Swagger UI)

After deploy / local run:

- Swagger UI: `https://civicfix-backend-b7a5.vercel.app/api-docs`
- OpenAPI JSON: `https://civicfix-backend-b7a5.vercel.app/api-docs.json`

Local: `http://localhost:5000/api-docs`

Demo login in Swagger:
1. `POST /api/v1/auth/login` with `admin@civicfix.com` / `Admin@12345`
2. Copy `accessToken`
3. Click **Authorize** → `Bearer <token>`
4. Try protected endpoints

## Submission Template

```text
Project Name    : CivicFix - City Complaint & Service Platform
Backend Repo    : <your-github-repo-url>
Live API        : <your-render-url>
API Docs        : <postman-documenter-or-collection-link>
Demo Video      : <drive-or-loom-link>
Admin Email     : admin@civicfix.com
Admin Password  : Admin@12345
```

## Project Structure

```text
src/
  app.ts / server.ts
  config/          env, prisma, redis
  middlewares/     auth, validate, errorHandler
  modules/         auth, users, departments, categories, complaints, payments, admin, stats
  utils/           ApiError, jwt, audit, pagination
prisma/
  schema.prisma
  seed.ts
```
