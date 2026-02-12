-- P-3: Reader and Annotations

-- 1. Add reading progress columns to books
alter table public.books
add column if not exists last_read_location text; -- Store EPUB CFI string

-- 2. Create Annotations table
create table if not exists public.annotations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  book_id       uuid not null references public.books (id) on delete cascade,
  
  cfi_range     text not null, -- EPUB CFI range for anchor
  text_content  text not null, -- Selected text context
  note          text,          -- User's markdown note
  color         text default 'yellow', -- Highlight color
  
  created_at    timestamptz not null default timezone('utc'::text, now()),
  updated_at    timestamptz not null default timezone('utc'::text, now())
);

-- 3. Indexes
create index if not exists annotations_book_id_idx
  on public.annotations (book_id);

create index if not exists annotations_user_book_idx
  on public.annotations (user_id, book_id);

-- 4. RLS
alter table public.annotations enable row level security;

create policy "Users can read own annotations"
  on public.annotations
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own annotations"
  on public.annotations
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own annotations"
  on public.annotations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own annotations"
  on public.annotations
  for delete
  using (auth.uid() = user_id);

-- 5. Trigger for updated_at
create trigger annotations_set_updated_at
  before update on public.annotations
  for each row execute function public.set_updated_at_timestamp();
