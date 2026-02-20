-- ── P-4: Progress, Streaks, and Motivation Surfaces ──────────────────────────
-- Migration 0005: reading_sessions table + chapter tracking columns on books

-- ── 1. Add chapter tracking columns to books ──────────────────────────────────
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS current_chapter_index int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_chapters int NOT NULL DEFAULT 0;

-- ── 2. Reading sessions table ─────────────────────────────────────────────────
-- One row per reading session. Multiple sessions on the same calendar day are
-- aggregated at query time for streak / debt calculations.

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id          uuid        NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  -- Calendar date in the server's UTC timezone. Used for streak logic.
  session_date     date        NOT NULL DEFAULT CURRENT_DATE,
  -- Pages = floor(words / 250). A qualifying day requires pages_read >= 5.
  pages_read       int         NOT NULL DEFAULT 0 CHECK (pages_read >= 0),
  words_read       int         NOT NULL DEFAULT 0 CHECK (words_read >= 0),
  -- EPUB location percentage at session start / end (0-100).
  progress_start   smallint    NOT NULL DEFAULT 0,
  progress_end     smallint    NOT NULL DEFAULT 0,
  -- Chapter the user was in when the session ended (0-indexed).
  chapter_index    int,
  -- Approximate reading time in seconds.
  duration_seconds int,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS reading_sessions_user_date_idx
  ON public.reading_sessions (user_id, session_date DESC);

CREATE INDEX IF NOT EXISTS reading_sessions_book_idx
  ON public.reading_sessions (book_id);

CREATE INDEX IF NOT EXISTS reading_sessions_user_book_date_idx
  ON public.reading_sessions (user_id, book_id, session_date DESC);

-- ── 4. Row-Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading sessions"
  ON public.reading_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading sessions"
  ON public.reading_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies: sessions are append-only to preserve history.
