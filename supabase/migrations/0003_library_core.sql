-- P-2: Library core — books table, reading state enum, RLS, indexes

-- 1. Reading-state enum
create type public.book_reading_state as enum ('to_read', 'reading', 'completed');

-- 2. Books table
create table if not exists public.books (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,

  title         text not null,
  author        text,
  state         public.book_reading_state not null default 'to_read',

  cover_url     text,
  google_books_id  text,
  open_library_key text,
  goodreads_search_url text,

  -- Placeholder card metrics (populated by P-3/P-4)
  progress_percent   smallint not null default 0 check (progress_percent between 0 and 100),
  notes_count        int      not null default 0 check (notes_count >= 0),
  streak_days        int      not null default 0 check (streak_days >= 0),
  last_read_at       timestamptz,

  -- Optional FK to an uploaded EPUB (P-3 reader linkage)
  upload_id    uuid references public.book_uploads (id) on delete set null,

  -- Normalized columns for deterministic conflict matching
  title_norm   text generated always as (lower(regexp_replace(trim(both from title), '\s+', ' ', 'g'))) stored,
  author_norm  text generated always as (
    case when author is not null
      then lower(regexp_replace(trim(both from author), '\s+', ' ', 'g'))
      else null
    end
  ) stored,

  created_at   timestamptz not null default timezone('utc'::text, now()),
  updated_at   timestamptz not null default timezone('utc'::text, now()),

  -- One book per user per normalized title+author combination
  constraint books_user_title_author_unique unique (user_id, title_norm, author_norm)
);

-- 3. Indexes
create index if not exists books_user_state_idx
  on public.books (user_id, state);

create index if not exists books_user_updated_idx
  on public.books (user_id, updated_at desc);

-- Enable pg_trgm for fast ILIKE searches on title
create extension if not exists pg_trgm;

create index if not exists books_title_trgm_idx
  on public.books using gin (title gin_trgm_ops);

-- 4. RLS
alter table public.books enable row level security;

create policy "Users can read own books"
  on public.books
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own books"
  on public.books
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own books"
  on public.books
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own books"
  on public.books
  for delete
  using (auth.uid() = user_id);

-- 5. Reuse the set_updated_at_timestamp trigger function from 0001
drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at_timestamp();
