# Plan: Admin System Security Hardening

## Problem

The current admin system has critical security flaws:

1. **First user auto-becomes admin** — Anyone on campus network can register with any name and become the first administrator. No verification, no approval, no password.
2. **No admin authentication barrier** — Admins and regular users share the exact same login flow. No independent admin password, no 2FA, no admin-specific credentials.
3. **Admin setup endpoint is weakly protected** — `/api/admin/setup` only checks if any admin exists. If the database is cleared, anyone can call it again.
4. **Name-based login is spoofable** — Campus users log in by name only. Anyone on campus can impersonate anyone else by typing their name.
5. **No rate limiting on admin APIs** — Admin endpoints have no brute-force or abuse protection.

## Goal

Make the admin system actually secure without adding excessive friction for legitimate campus users.

## Scope

### In Scope
1. **Bootstrap admin registration** — Require a setup key for the first admin registration. Key is provided via environment variable.
2. **Admin login hardening** — Admin accounts require email verification even on campus. Regular users can still use name-only login.
3. **Admin action confirmation** — Critical actions (delete user, delete activity, approve/reject pending) require re-authentication or a confirmation code.
4. **Rate limiting** — Admin APIs get stricter rate limits.
5. **Audit log completeness** — Ensure all admin actions are logged with IP, timestamp, actor.

### Out of Scope
- Full RBAC with multiple permission levels (keep simple USER/ADMIN for now)
- OAuth or SSO integration
- Session timeout warnings in UI

## Implementation

### Phase 1: Bootstrap Key
- Add `ADMIN_SETUP_KEY` env var
- Modify `/api/auth/register` — first user only becomes admin if `setupKey` matches env var
- Remove `/api/admin/setup` endpoint (no longer needed)
- Update auth page to show setup key input when no admin exists

### Phase 2: Admin Email Verification
- Modify `/api/auth/register` — if user will be admin, require `@bupt.cn` email + verification code
- Keep name-only login for regular campus users
- Store admin flag in JWT token (already stored as `role`)

### Phase 3: Admin Action Confirmation
- Add `/api/auth/verify-admin` endpoint — accepts password/code, returns short-lived admin token
- Modify delete/approve/reject endpoints to require admin token in header
- Add confirmation modal in admin UI for critical actions

### Phase 4: Rate Limiting
- Add rate limit middleware for admin APIs
- Limit: 10 requests per minute per IP for admin endpoints
- Limit: 5 login attempts per minute per IP

### Phase 5: Audit Cleanup
- Verify all admin actions log to AuditLog
- Add admin dashboard view for "my actions"

## Affected Files
- `prisma/schema.prisma` — no changes needed
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/send-code/route.ts`
- `src/app/api/auth/verify-code/route.ts`
- `src/app/api/admin/*` — add confirmation checks
- `src/app/auth/page.tsx` — add setup key input
- `src/app/admin/page.tsx` — add confirmation modals
- `src/middleware.ts` — add rate limiting
- `.env.example` — add ADMIN_SETUP_KEY

## Testing Plan
1. Register first user without setup key → should NOT become admin
2. Register first user with correct setup key → should become admin
3. Regular campus user login → should work with name only
4. Admin tries to delete user without confirmation → should fail
5. Admin deletes user with confirmation → should succeed + audit log
6. Rate limit test → exceed 10 req/min → should get 429

## Risks
- If `ADMIN_SETUP_KEY` is forgotten during deployment, no one can become admin
- Mitigation: log a warning on startup if no admin exists and no setup key is configured
