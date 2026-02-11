# ReadReady MVP Build Backlog (P-1 -> P-5)

This backlog is dependency-ordered and context-linked.

Execution rule:
- Each phase starts only after its previous phase acceptance criteria are met.
- Each phase contains explicit references to previous and next phase.

---

## P-1: Foundation and Infrastructure

Previous phase:
- None (starting phase)

Next phase:
- P-2: Library and Metadata

Objectives:
- Establish project architecture and platform primitives.

Scope:
- Bootstrap Next.js + TypeScript + Tailwind + shadcn.
- Setup linting, formatting, and type-check scripts.
- Configure Supabase project and environment variables.
- Implement Supabase Auth for sign up/sign in/sign out.
- Setup Postgres migrations and base schema.
- Setup Supabase Storage for EPUB-only uploads.
- Add EPUB validation (type + size) and no-DRM notice.
- Configure Framer Motion and core design tokens (theme + typography).

Acceptance criteria:
- Dev/build/lint/typecheck scripts pass.
- Auth flows work and protected routes are enforced.
- EPUB upload validation works end-to-end.
- Base app shell is responsive and theme-capable.

---

## P-2: Library Core and Search UX

Previous phase:
- P-1: Foundation and Infrastructure

Next phase:
- P-3: Reader and Annotation Engine

Objectives:
- Build book management and discoverability flow.

Scope:
- Implement `To Read`, `Reading`, `Completed` states.
- Build CRUD for books and user-scoped library views.
- Implement book card data model:
  - cover (from EPUB metadata fallback strategy)
  - title and author
  - progress fields (placeholder until P-3)
  - last read timestamp
  - notes count
  - streak days
- Implement local-first search flow:
  - user types book name
  - show local results first
  - `Search on Goodreads` button
  - open Goodreads in new tab
  - return and continue in ReadReady
- Integrate Google Books metadata search (fallback Open Library).
- Implement Goodreads link-out auto-generated from title/author.
- Implement Goodreads history import with preview and confirm merge.

Acceptance criteria:
- User can manage library states and book entries reliably.
- Search behaves local-first before external lookup.
- Goodreads link-out and import flow function with preview confirmation.

---

## P-3: Reading Experience and Annotation System

Previous phase:
- P-2: Library Core and Search UX

Next phase:
- P-4: Progress Intelligence and Dashboard

Objectives:
- Deliver the peaceful reading environment and core reading interactions.

Scope:
- Integrate EPUB.js reader with chapter navigation.
- Persist and resume last reading location.
- Implement typography controls:
  - 70-75 CPL target defaults
  - line-height presets
  - font family options
- Implement distraction-minimal reading layout with subtle Framer Motion transitions.
- Build annotation-only notes:
  - sentence/paragraph anchored annotations
  - markdown/rich-text editor
  - collapsible side rail
  - persistent inline markers
- Ensure annotation anchors survive common reflow/layout updates.

Acceptance criteria:
- User can read EPUB smoothly and resume progress.
- User can create/edit/delete anchored annotations with reliable recall.
- Reading UI stays minimal and stable on desktop and mobile web.

---

## P-4: Progress, Streaks, and Motivation Surfaces

Previous phase:
- P-3: Reading Experience and Annotation System

Next phase:
- P-5: Hardening and Release

Objectives:
- Convert reading behavior into motivating, meaningful feedback.

Scope:
- Track progress by:
  - EPUB location percentage
  - chapter completion
- Implement streak logic:
  - day counts only when at least 5 pages are read
- Build dashboard widgets:
  - Current Reads Snapshot
  - Streak and Consistency
  - Progress Trends
- Use visual progress arcs (not bars).
- Implement Reading Debt card:
  - missed days reframed as "owed sessions"
  - avoid punitive language
- Populate book cards with live progress, notes count, and last-read metadata.

Acceptance criteria:
- Dashboard and book cards reflect accurate live reading stats.
- Streak and reading debt behavior match defined rules.
- Visual progress uses arcs consistently across key surfaces.

---

## P-5: Reliability, Deployment, and Portfolio Readiness

Previous phase:
- P-4: Progress, Streaks, and Motivation Surfaces

Next phase:
- None (MVP completion phase)

Objectives:
- Stabilize the MVP and ship it with strong production posture.

Scope:
- Add tests for:
  - library state transitions
  - progress calculations
  - streak 5-pages/day rule
  - Goodreads import mapping
  - annotation anchor persistence
- Add logging and observability for reader/import/upload errors.
- Improve failure handling and user-safe error messages.
- Prepare deployment for Vercel with Vercel Edge Network CDN.
- Validate performance, responsive behavior, and accessibility baselines.
- Finalize launch checklist and portfolio documentation.

Acceptance criteria:
- Core flows pass CI test suite.
- Deployment succeeds on Vercel.
- MVP is stable, demo-ready, and portfolio-presentable.
