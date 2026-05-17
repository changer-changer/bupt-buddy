# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

北邮搭伙平台 (BUPT Buddy) — A social activity platform for BUPT students to organize and join group activities (meals, sports, study sessions, etc.). Built with Next.js App Router, deployed on Vercel, backed by PostgreSQL (typically Supabase).

## Common Commands

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Production build (includes Prisma generate + db push + Next.js build)
npm run build

# Linting
npm run lint
```

There is no test runner configured in this project.

## Tech Stack

- **Next.js** 16.2.6 with App Router (`src/app/`)
- **React** 19.2.4
- **TypeScript** 5
- **Tailwind CSS** 4 with PostCSS
- **Prisma** 5 + PostgreSQL (via `@prisma/client`)
- **Auth**: Custom JWT (jose for middleware, jsonwebtoken for API routes), httpOnly cookies
- **Validation**: Zod
- **Email**: Resend (optional — falls back to console logging)
- **Dates**: date-fns with zhCN locale

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — JWT signing secret (min 32 chars)
- `NEXTAUTH_URL` — Production domain
- `RESEND_API_KEY` — Optional; without it, verification codes are logged to console only

## Architecture

### Auth & Authorization

Auth is entirely custom JWT-based (no NextAuth.js session logic, despite the env var name):

1. **Registration flow** (`src/app/auth/page.tsx`):
   - User enters `@bupt.cn` email + name + optional student ID
   - IP check (`src/lib/ip-check.ts`) detects if on campus via BUPT IP ranges or private IPs
   - **On-campus**: auto-approved, JWT cookie set immediately, first user becomes `ADMIN`
   - **Off-campus**: enters `PendingApproval` queue, requires admin manual approval
   - Existing users logging in get a fresh JWT cookie

2. **Email verification** (legacy dual path):
   - `/api/auth/send-code` generates a 6-digit code stored in an **in-memory Map** (`src/lib/verify-code-store.ts`)
   - `/api/auth/verify-code` validates code and creates/logs in user
   - Codes expire in 10 minutes, max 5 attempts
   - **Critical**: The in-memory store resets on every deployment/server restart

3. **JWT** (`src/lib/jwt.ts`):
   - Signed with `NEXTAUTH_SECRET`, 7-day expiry
   - Stored in httpOnly cookie named `token`
   - `getCurrentUser()` reads the cookie in API routes

4. **Middleware** (`src/middleware.ts`):
   - Uses `jose` (not `jsonwebtoken`) to verify tokens edge-compatibly
   - Redirects unauthenticated users to `/auth` for page routes
   - Returns 401 for API routes
   - Injects `x-user-id` and `x-user-role` headers for authenticated API requests
   - Protects `/admin/*` — non-admin users are redirected to `/`
   - Public paths: `/`, `/auth`, `/api/auth/*`, `/api/admin/setup`

### Database Schema (`prisma/schema.prisma`)

- `User` — email, nickname, role (`USER` | `ADMIN`), relations to activities/registrations/reports
- `Activity` — created by a user, has title, location, meetupPoint, eventTime, maxParticipants, status (`ACTIVE` | `FULL` | `HIDDEN` | `CANCELLED` | `ENDED`)
- `Registration` — user joins an activity, with optional contact info (wechat/phone)
- `PendingApproval` — off-campus registration requests awaiting admin approval
- `Report` — user reports an activity; 2 pending reports auto-hide the activity

### API Routes

All routes are in `src/app/api/` following Next.js App Router conventions.

**Auth**: `/api/auth/register`, `/api/auth/verify-code`, `/api/auth/send-code`, `/api/auth/me`, `/api/auth/check-ip`
**Activities**: `/api/activities` (GET list, POST create), `/api/activities/[id]` (GET detail, DELETE cancel), `/api/activities/[id]/join` (POST), `/api/activities/[id]/report` (POST)
**Admin**: `/api/admin/activities`, `/api/admin/activities/[id]/hide`, `/api/admin/reports`, `/api/admin/pending`, `/api/admin/pending/approve`, `/api/admin/pending/reject`, `/api/admin/users`, `/api/admin/users/[id]/delete`, `/api/admin/setup` (one-time admin promotion)
**SSE**: `/api/sse` — heartbeat stream used by activity list to refresh data

### Key Business Logic

- **Activity listing** (`src/components/activity-list.tsx`): Fetches from `/api/activities`, refreshes on SSE heartbeat. Shows activities with status `ACTIVE` or `FULL` and eventTime within last hour.
- **Activity creation rate limit**: Max 3 activities per user per 24 hours (`/api/activities` POST)
- **Auto-hide on reports**: 2 pending reports on an activity automatically set its status to `HIDDEN`
- **Contact visibility**: Only activity creator and admins see full contact info (wechat/phone) of registrants. Joined members see names only after event ends + within 24h grace period.
- **Admin promotion**: POST to `/api/admin/setup` with `{ email }` promotes that user to ADMIN, but only if no admin exists yet.

### Frontend Structure

- **Pages** (`src/app/`):
  - `/` — Home with activity list + "发起活动" button
  - `/auth` — Login/register page (client component)
  - `/activity/new` — Create activity form (client component)
  - `/activity/[id]` — Activity detail with join/report/delete actions (client component)
  - `/admin` — Admin dashboard: pending approvals, reports, users, all activities (client component)

- **Components**:
  - `src/components/navbar.tsx` — Sticky nav, shows user info, admin link, logout
  - `src/components/activity-list.tsx` — Activity cards with SSE-powered live refresh

- **Layout** (`src/app/layout.tsx`): Mobile-first responsive design, max-w-lg centered container, disables user scaling for app-like feel.

### Important Implementation Details

- **IP detection** (`src/lib/ip-check.ts`): Checks `x-forwarded-for`, `x-real-ip`, private IP ranges (10.x, 172.16-31.x, 192.168.x), and known BUPT public IP ranges. Returns `unknown` if no headers present.
- **Build command runs `prisma db push`**: This is potentially destructive in production. Consider using `prisma migrate deploy` for production deployments.
- **No password hashing**: The platform uses email verification / IP-based trust, not passwords. `bcryptjs` is in dependencies but unused.
- **Date formatting**: All dates displayed with `date-fns` using `zhCN` locale.
- **Zod validation**: Used only in `/api/activities` POST for activity creation payload.

## Deployment Notes

See `DEPLOY.md` for detailed Vercel + Supabase deployment instructions. The build command in `package.json` is `prisma generate && prisma db push && next build`.
