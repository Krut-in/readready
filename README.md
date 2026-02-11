# ReadReady

ReadReady is a curiosity-first reading sanctuary for people who want to read deeply but get pulled into short-form content loops.

Primary initial user: Krutin (passion + portfolio project).

## Current Scope Lock

MVP is intentionally focused on three outcomes:
- Upload EPUB books.
- Manage reading library and reading states.
- Read in a peaceful, distraction-minimal environment.

## Feature Segmentation

### MVP
- Supabase Auth + multi-device sync.
- Responsive web app (web-first).
- Landing page with current books and quick actions.
- Book manager: `Reading`, `To Read`, `Completed`.
- Add/remove books.
- EPUB upload and in-app EPUB reading.
- Inline annotations linked to sentence/paragraph (annotation-only notes).
- Markdown/rich-text notes editor.
- Collapsible note rail with persistent note markers.
- Theme switching (light/dark/warm/night).
- Framer Motion transitions (subtle page and UI transitions).
- Typography controls (line length, line height, curated reading fonts).
- Progress tracking by location percentage + chapter completion.
- Streak rule: day counts only if user reads at least 5 pages.
- Visual progress arcs (not bars).
- Reading debt card ("owed sessions" framing).
- Book cards include cover, title/author, progress, last-read time, notes count, and streak.
- Search flow is local-first, with "Search on Goodreads" opening in a new tab.
- Metadata enrichment via Google Books first (fallback Open Library).
- Goodreads link-out with auto-search by title/author.
- Goodreads history import into ReadReady library states.

### Phase-2 (Future Enhancements)
- Ambient audio controls.
- Anticipation Engine (LLM-assisted extractive teaser cards).
- Native mobile apps.
- Social/community features.
- Richer AI companion and personalization.

### Discard (Out of Scope)
- Pomodoro/timer-driven reading mechanics.
- Auto-decision nudges for choosing book to read next.
- Full chapter replacement summaries as core reading mode.
- PDF support in MVP.

## Docs

- PRD: `/Users/krutinrahtod/Desktop/Desktop/WEB/webCodes/latestCodee/readReady2/docs/PRD-v0.md`
- Build Backlog: `/Users/krutinrahtod/Desktop/Desktop/WEB/webCodes/latestCodee/readReady2/docs/backlog-p-1-p-5.md`
