-- 1. Prevent exact duplicate sessions (same user/book/day/start/end).
--    Multiple distinct sessions per day remain allowed (append-only design).
CREATE UNIQUE INDEX IF NOT EXISTS reading_sessions_dedup_idx
  ON public.reading_sessions (user_id, book_id, session_date, progress_start, progress_end);

-- 2. CHECK constraints on chapter columns (books table already altered in 0005)
ALTER TABLE public.books
  ADD CONSTRAINT books_current_chapter_index_nonneg CHECK (current_chapter_index >= 0),
  ADD CONSTRAINT books_total_chapters_nonneg        CHECK (total_chapters >= 0);

-- 3. Normalize timestamp default on reading_sessions (cosmetic consistency)
ALTER TABLE public.reading_sessions
  ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());

-- 4. Remove permissive octet-stream MIME type from EPUB storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'epubs', 'epubs', false, 104857600,
  ARRAY['application/epub+zip']
)
ON CONFLICT (id) DO UPDATE
  SET allowed_mime_types = excluded.allowed_mime_types;
