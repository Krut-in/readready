# ReadReady

**A distraction-minimal reading sanctuary that transforms EPUB files into focused, trackable reading sessions.**

## The Problem

The average person checks their phone 150+ times a day. Short-form feeds have quietly eroded our capacity for sustained attention — not because we stopped valuing books, but because the friction of starting feels greater than the ease of scrolling. The books pile up on nightstands and wishlists. The intention to read persists. The pages don't turn.

This is the "start gap" — the space between wanting to read and actually doing it. ReadReady was architected to close it.

## What ReadReady Does

ReadReady is a full-stack web application that unifies EPUB reading, personal library management, and behavioural motivation into one calm, focused interface. Upload a book, open it, and start reading — no clutter, no guilt-driven timers, no social pressure. The experience feels like stepping into a quiet personal library with a single purpose: helping you read deeply and consistently.

The architecture prioritises server-side data fetching via React Server Components for instant page loads, client-side interactivity only where it matters, and row-level security policies on every database table so user data is isolated at the Postgres layer — not just the application layer.

## Key Features

### EPUB Reader, Engineered for Deep Focus

The reader renders paginated EPUB content via epub.js with deliberately minimal chrome — controls auto-fade on idle, leaving nothing but text. Four reading themes (light, dark, warm, night) inject CSS directly into the rendition, embedding SVG fill classes for annotation highlight colours so they persist correctly across theme switches without re-injection.

Typography is treated as a first-class concern: five curated typefaces (Literata, Bookerly, Charter, Spectral, system-ui), adjustable sizing (12–32px), and four line-height presets — all calibrated around the 70–75 characters-per-line measure that typographic research associates with optimal reading comfort. Navigation supports keyboard arrows, click-to-turn gutters, and a slide-out table of contents.

### Multi-Colour Annotations with CFI Anchoring

Text selection triggers a spring-animated action bar (Framer Motion) for choosing highlight colours — yellow, red, green, or blue. Each annotation is anchored via EPUB Canonical Fragment Identifiers, structurally validated before persistence, and supports Markdown notes rendered inline with react-markdown and remark-gfm. Highlights replay automatically on spine-item transitions, ensuring annotations follow you seamlessly through the book.

### Intelligent Library Management

Books are organised through a three-state machine — **To Read → Reading → Completed** — enforced by a Postgres enum. Duplicate detection uses database-level generated stored columns (`title_norm`, `author_norm`) with a unique composite constraint, making conflict resolution deterministic regardless of application-layer normalisation. A trigram-indexed (`pg_trgm`) GIN index on titles powers sub-second fuzzy search across the entire library.

Metadata enrichment employs a dual-source cascade: Google Books API first, with automatic Open Library fallback — both gated by 5-second `AbortController` timeouts to keep the interface responsive.

### Two-Phase Goodreads Import

An RFC-4180 compliant CSV parser handles Goodreads exports — including quoted fields, embedded commas, escaped quotes, and BOM markers. The import is architected in two deliberate phases: **preview** (parse, detect conflicts via normalised title+author matching, surface decisions) then **confirm** (apply user choices — keep existing, replace, or skip). Zero writes occur until the user explicitly approves the merge.

### Progress Tracking & Motivational Dashboard

Reading sessions feed an append-only log — no UPDATE or DELETE RLS policies exist by design, preserving immutable history. Session data persists on component unmount via `fetch` with `keepalive: true`, ensuring no data is lost during page navigation.

The server-rendered dashboard aggregates 90 days of sessions and powers three animated widgets: **Current Reads** with SVG progress arcs drawn in via Framer Motion, **Streak Tracking** requiring a qualifying minimum of five pages per day, and a **Reading Debt** card that frames missed days as "owed sessions" — capped at 15, repayable through extra reading, with encouraging language instead of guilt.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| UI | React 19, Tailwind CSS 4, Radix UI, Framer Motion |
| Reader Engine | epub.js (paginated rendition) |
| Backend | Supabase — Auth, Postgres with RLS, Storage |
| Validation | Zod schemas, custom EPUB & CFI validators |
| Deployment | Vercel (Edge Network CDN) |

## Getting Started

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/Krut-in/readready.git
   cd readready && npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Apply database migrations** — run the SQL files in `supabase/migrations/` sequentially via the Supabase CLI or dashboard.

4. **Launch the development server**
   ```bash
   npm run dev
   ```

## Future Scope

- **Anticipation Engine** — LLM-powered teaser cards that surface hook-worthy passages before you open a book, using extractive techniques with spoiler guardrails
- **Ambient Audio** — Expandable soundscape controls for focus-enhancing audio during reading sessions
- **Native Mobile Apps** — iOS and Android clients following responsive web maturity
- **Social Reading Surfaces** — Shared annotations and reading circles designed to complement deep reading, not distract from it
- **Advanced Behavioural Analytics** — Personalised reading-pattern insights and experiments powered by the immutable session history
