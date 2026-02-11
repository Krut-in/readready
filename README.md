# ReadReady (P-1 Foundation)

ReadReady is a web-first deep reading app focused on EPUB library workflows and a distraction-minimal reading environment.

This repository currently implements **Phase P-1: Foundation and Infrastructure** only.

## P-1 Includes

- Next.js + React + TypeScript + Tailwind + shadcn-style scaffolding.
- Framer Motion wired into the base shell.
- Supabase Auth integration (Google OAuth primary flow + sign-out).
- Protected routes (`/dashboard`, `/upload`) enforced by middleware.
- Supabase Storage setup for EPUB uploads.
- EPUB upload API with server-side validation:
  - EPUB only
  - 100 MB max
  - user-friendly errors
- Base schema and storage migrations under `/supabase/migrations`.
- Theme-capable responsive shell with light/dark/warm/night presets.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS 4
- Framer Motion
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (for local dev: `http://localhost:3000`)

## Supabase Setup Checklist (Google OAuth)

1. Create a Supabase project.
2. In Supabase Dashboard, enable Google provider under `Authentication -> Providers`.
3. Set authorized redirect URL(s):
   - `http://localhost:3000/auth/callback`
   - your production callback URL when deployed
4. Set project URL and anon key in `.env.local`.
5. Apply migrations in order:
   - `supabase/migrations/0001_base_schema.sql`
   - `supabase/migrations/0002_storage_epubs.sql`

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run format
npm run format:check
```

## Core Routes

- `/` landing page
- `/sign-in` Google OAuth entry
- `/auth/callback` OAuth callback exchange
- `/auth/signout` sign-out endpoint
- `/dashboard` protected shell landing
- `/upload` protected EPUB upload screen
- `/api/uploads/epub` upload API

## Upload Rules

- File format: EPUB only (`.epub`, `application/epub+zip`)
- Upload limit: 100 MB
- DRM-protected books: not supported

## Deployment Target

- Vercel (with Vercel Edge Network CDN)

## Project Docs

- PRD: `/Users/krutinrahtod/Desktop/Desktop/WEB/webCodes/latestCodee/readReady2/docs/PRD-v0.md`
- Backlog: `/Users/krutinrahtod/Desktop/Desktop/WEB/webCodes/latestCodee/readReady2/docs/backlog-p-1-p-5.md`
