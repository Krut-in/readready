# ReadReady - PRD v0 (MVP Scope Locked)

## 0) Product Intent

ReadReady is a curiosity-first reading sanctuary for people who want to read deeply but get pulled into short-form content loops.

Primary initial user: **Krutin** (portfolio-quality product with real daily usage).  
Target audience (later public usage): students and working professionals (teens to middle-age).

Core philosophy:
- Low friction to start reading.
- Minimal distractions during reading.
- Curiosity sparks before reading begins.
- Identity framing: "You are a reader."

---

## 1) Feature Inventory and Categorization

## 1.1 MVP Features (build now)

- Authenticated user account and multi-device sync.
- Responsive web app (mobile-friendly web), web-first priority.
- Landing page with:
  - currently reading books
  - `Explore Books`
  - `Book Manager`
  - `Read Now`
- Book manager with states:
  - `Reading`
  - `To Read`
  - `Completed`
- Add/remove books.
- EPUB upload and reading support (EPUB only in MVP).
- In-app reading environment:
  - minimal, distraction-free layout
  - inline notes linked to specific sentence/paragraph
  - note rail collapses after save
  - visual marker where note exists
- Theme switching (light, dark, warm, night).
- Typography controls:
  - optimized line length (70-75 chars)
  - adjustable line height (smart defaults)
  - curated fonts (Literata, Bookerly, Charter, Spectral)
- Progress tracking and dashboard:
  - reading progress per book (EPUB location percentage + chapter completion)
  - streaks
  - consistency insights
  - reading debt card ("owed sessions" framing)
- Metadata enrichment via Google Books API first (fallback: Open Library).
- Goodreads link-out with auto-search by title/author.
- Goodreads history import (user export -> import into ReadReady).
- Free forever (no monetization for MVP).

## 1.2 Phase-2 Features (add later)

- Ambient audio entry point:
  - compact music icon
  - expandable controls (play/switch/repeat/basic volume)
- Anticipation Engine v1:
  - teaser cards shown on app open (non-forceful, toggle on/off in one click)
  - LLM-assisted extraction of hook-worthy passages (extractive, not full chapter summaries)
  - provocative questions / thematic previews
- Native mobile apps (after responsive web maturity).
- Social/community features (sharing, social reading surfaces).
- Richer AI layer:
  - deeper review synthesis
  - advanced companion intelligence
  - stronger personalization
- Expanded analytics and advanced behavioral experiments.
- Broader media controls (advanced mixers, fades, scene presets).

## 1.3 Discard Features (intentionally out of scope)

- Pomodoro timers or forced timer-driven reading mechanics.
- Auto-decision nudges for picking which current book to read next.
- Full chapter replacement summaries as the primary reading mode.
- PDF support in MVP.

---

## 2) MVP Product Requirements Document

## 2.1 Vision

Create a focused reading product that helps users re-enter long-form reading by combining:
- easy library and reading-state management
- an elegant distraction-minimal reader
- simple but motivating continuity signals (progress + streaks)

ReadReady should feel like entering a quiet, personal library.

## 2.2 Problem Statement

Short-form feeds have reduced attention stamina. Users still value books, but motivation and initiation friction block consistent reading behavior.

ReadReady addresses the "start gap":
- "I want to read, but I don’t start."

## 2.3 Users

Primary user (MVP): Krutin.

Secondary profile (public audience):
- Students with fragmented attention.
- Working professionals with limited focused time.
- Curious readers who want deep reading without guilt-heavy productivity mechanics.

## 2.4 MVP Goals

- Reduce friction from app open to active reading.
- Increase consistency of return usage.
- Improve progress through active books.
- Provide portfolio-grade product quality (design + architecture + psychology).

### MVP Focus Lock
- Make user upload EPUB books.
- Manage the user's reading library and book segregation.
- Provide a peaceful, distraction-minimal reading environment.

## 2.5 Non-Goals (MVP)

- Building a social platform.
- Supporting every file format.
- Replacing reading with AI summaries.
- Coercive productivity workflows.

## 2.6 Core User Flows

### Flow A: Start Reading
1. User opens app.
2. Sees visually rich landing page with current books and actions.
3. Chooses any current book (no algorithmic nudge).
4. Reader opens in minimal mode and resumes last position.

### Flow B: Capture Note
1. User selects sentence/paragraph.
2. Writes inline note in side rail.
3. Note saves and rail collapses.
4. Note marker remains at annotation location for revisits.

### Flow C: Add and Organize Book
1. User uploads EPUB or creates entry via metadata search.
2. Book is categorized (`To Read`, `Reading`, `Completed`).
3. User can view external Goodreads page via auto-search by title/author.

### Flow C1: Metadata and Search (local-first)
1. User types a book name in search.
2. App shows local library results first.
3. App provides `Search on Goodreads` button.
4. Goodreads opens in a new tab.
5. User returns and uploads/selects EPUB in ReadReady.

### Flow D: Import Goodreads History
1. User exports reading history from Goodreads.
2. User uploads import file into ReadReady.
3. ReadReady maps books and statuses into local library states.
4. User reviews and confirms merge results.

## 2.7 Functional Requirements

### Accounts and Sync
- Secure auth for personal account using Supabase Auth.
- User data sync across devices.

### Library and Book Management
- Add/remove/update books.
- Maintain reading states (`To Read`, `Reading`, `Completed`).
- Search/import basic metadata from Google Books first (fallback: Open Library).
- Store Goodreads external link generated through title/author auto-search.
- Import Goodreads history export into ReadReady state model.

### Reader
- EPUB rendering.
- Resume from last read location.
- Theme and typography controls.
- Minimal chrome while reading.

### Notes and Annotations
- Sentence/paragraph-level anchor support.
- Create, edit, and delete annotation-only notes.
- Notes editor supports markdown/rich-text formatting.
- Persist note markers at annotated locations.

### Dashboard and Motivation
- Per-book progress using both location percentage and chapter completion.
- Streak tracking where a reading day requires at least 5 pages read.
- Consistency trends.
- Reading debt card showing missed days as "owed sessions."
- Visual progress arcs (not bars).

### Book Card Data Model (UI contract)
- Cover image (extract from EPUB metadata, fallback placeholder).
- Title and author.
- Progress (% read + chapter/page progress where available).
- Last read timestamp.
- Notes count.
- Reading streak (days).

## 2.8 Non-Functional Requirements

- Responsive UX across desktop and mobile web.
- Fast initial load and smooth reading transitions.
- High readability defaults (line length, type scale, spacing).
- Reliable persistence for notes and reading position.
- Clean visual polish suitable for public portfolio showcase.

## 2.9 UX and Design Requirements

### Experience Principles
- Calm, premium, library-like atmosphere.
- Avoid noisy metrics and guilt loops.
- Emphasize curiosity, identity, and momentum.

### Reading UI Requirements
- Keep UI minimal by default.
- Preserve context with subtle animations only.
- Notes appear when needed and disappear when done.
- Use Framer Motion for subtle transitions and page-turn feel.

### Typography Requirements
- Default measure near 70-75 CPL.
- Adjustable line height with sane presets.
- Reading-optimized fonts available from curated set.

## 2.10 Technical Requirements (MVP)

- Frontend: Next.js + React + Tailwind + shadcn.
- Animations: Framer Motion (page turns and transitions).
- Reader engine: EPUB.js.
- Backend/API: Next.js server routes or equivalent Node endpoints.
- Database: Supabase Postgres.
- Auth: Supabase Auth.
- Storage: Supabase Storage (EPUB + assets).
- Deployment: Vercel.
- CDN: Vercel Edge Network.
- Analytics: event instrumentation for product usage and progress signals.

## 2.11 Data and Metrics (MVP)

Key product metrics:
- Reading consistency (days with at least 5 pages read).
- Streak continuity using the 5-pages/day rule.
- Book progression rate.
- EPUB location percentage trend per book.
- Chapter completion trend per book.
- Session behavior trends (passive tracking, no forced timer UI).
- Feature adoption:
  - notes creation rate
  - theme usage rate
  - metadata-search usage rate
  - Goodreads history import completion rate
  - reading debt card interaction rate

## 2.12 Risks and Mitigations
- Risk: annotation anchors drift with EPUB rendering variance.
  - Mitigation: robust location strategy + fallback offsets.
- Risk: dependency on third-party metadata/review sources.
  - Mitigation: normalize core metadata in internal DB and use Google Books first with Open Library fallback.
- Risk: Goodreads export format changes can break importer mapping.
  - Mitigation: versioned parser, import preview screen, and safe merge confirmation.
- Risk: feature creep in ideation-heavy scope.
  - Mitigation: strict MVP boundary (section 1.1 only).

## 2.13 Success Criteria (MVP)

- User can open app and start reading in one short flow.
- User can manage personal library and maintain reading states.
- User can import Goodreads history into library states with review before merge.
- User can write inline anchored notes and revisit them.
- User sees progress primarily via arcs and a reading debt card (owed sessions framing).
- Product feels polished, distinctive, and portfolio-worthy.

---

## Future Enhancements

- Ambient audio entry point:
  - compact music icon
  - expandable controls (play/switch/repeat/basic volume)
- Anticipation Engine v1:
  - teaser cards shown on app open (non-forceful, toggle on/off in one click)
  - LLM-assisted extraction of hook-worthy passages (extractive, not full chapter summaries)
  - provocative questions / thematic previews
- AI stack for anticipation:
  - Gemini 3 Pro extraction pipeline
  - spoiler guardrails and excerpt scoring
- Native mobile apps.
- Social/community reading features.
- More advanced AI companion and review intelligence.
- Expanded ambient audio system and scene presets.
- Deeper analytics and experimentation layers.
