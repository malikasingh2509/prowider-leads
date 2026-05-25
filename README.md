# Prowider — Mini Lead Distribution System

A full-stack lead distribution system built with Next.js 14 + PostgreSQL + Prisma.

## Live Demo
[Add your Vercel URL here after deployment]

---

## Quick Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd prowider-leads
npm install
```

### 2. Database Setup (Free options)
- **Supabase** (recommended): https://supabase.com → New project → Settings → Database → Connection string
- **Railway**: https://railway.app → New PostgreSQL → Connection string

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your DATABASE_URL
```

### 4. Initialize Database & Seed
```bash
npm run setup
# This runs: prisma generate + prisma db push + seed script
```

### 5. Run Dev Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Customer Form | `/request-service` | Submit service enquiries |
| Provider Dashboard | `/dashboard` | Real-time lead assignments |
| Test Tools | `/test-tools` | Webhook & concurrency tests |

---

## Allocation Algorithm

### Business Rules
- Each lead is assigned to **exactly 3 providers**
- **Mandatory assignments** run first (checked by service type):
  - Service 1 → Provider 1 (always)
  - Service 2 → Provider 5 (always)
  - Service 3 → Provider 1 **and** Provider 4 (always)
- **Remaining slots** are filled from the service's fair pool using **round-robin**

### Fair Pools
| Service | Pool |
|---------|------|
| Service 1 | Providers 2, 3, 4 |
| Service 2 | Providers 6, 7, 8 |
| Service 3 | Providers 2, 3, 5, 6, 7, 8 |

### Round-Robin Mechanism
The `AllocationState` table stores a `lastProviderIndex` per service. On each allocation:
1. Advance index by 1 (wrapping around pool length)
2. Check if provider has remaining quota
3. If yes, assign; if no, skip and try next
4. Persist the new index to database

This ensures fair distribution persists across server restarts.

---

## Concurrency Handling

All lead allocation runs inside a **Serializable PostgreSQL transaction** with `SELECT FOR UPDATE` on the `AllocationState` row:

```sql
SELECT id FROM "AllocationState" WHERE "serviceId" = ? FOR UPDATE
```

This ensures only **one allocation runs at a time per service**, preventing:
- Duplicate provider assignments
- Over-quota assignments
- Race conditions in round-robin state

---

## Webhook Idempotency

The `WebhookEvent` table stores processed idempotency keys. On each webhook call:

1. Check if `idempotencyKey` already exists in `WebhookEvent`
2. If **yes** → return success immediately, do nothing
3. If **no** → create the record first (inside transaction), then reset quota

This guarantees calling the same webhook 100 times = same result as calling it once.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Server-Sent Events (SSE)
- **Language**: TypeScript

---

## Deployment (Vercel + Supabase)

1. Push to GitHub
2. Import to Vercel
3. Add `DATABASE_URL` in Vercel environment variables
4. Add build command: `prisma generate && next build`
5. After first deploy, run seed: `npx prisma db seed` (via Vercel CLI or Supabase SQL editor)
