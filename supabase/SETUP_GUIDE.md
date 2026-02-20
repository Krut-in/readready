# Supabase Setup Guide for ReadReady

This guide will walk you through setting up the complete backend infrastructure for ReadReady on Supabase.

## Prerequisites
- A [Supabase Account](https://supabase.com/).
- The ReadReady codebase.

## Step 1: Create a Supabase Project
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and click **"New project"**.
2. Select your Organization.
3. Enter a **Name** (e.g., `ReadReady`).
4. Set a strong **Database Password** (save this in your password manager).
5. Choose a **Region** close to you (e.g., US East).
6. Click **"Create new project"**.
7. Wait ~1-2 minutes for the database to provision.

## Step 2: Environment Variables
Once the project is active:

1. Click on **Project Settings** (gear icon) -> **API**.
2. Find the **Project URL** and **anon / public** key.
3. In your local project root, duplicate `.env.example` to create `.env.local` (or create it if it doesn't exist).
4. Fill in the variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
   ```

## Step 3: Provision Database & Storage
We will run a consolidated SQL script to verify and set up:
- **Tables**: `profiles`, `books`, `book_uploads`, `annotations`.
- **Storage**: `epubs` bucket with security policies.
- **Security**: Row-Level Security (RLS) policies for all tables.
- **Triggers**: Auto-timestamp updating and user profile creation.

1. In the Supabase Dashboard, go to the **SQL Editor** (icon on the left sidebar).
2. Click **"New query"**.
3. Paste the following SQL code block entirely.
4. Click **"Run"** (green button).

```sql
-- =========================================================================
-- 1. BASE SCHEMA & PROFILES
-- =========================================================================
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  -- Check if column exists before adding default if needed, or rely on create table if not exists
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.book_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  size_bytes bigint not null check (size_bytes > 0),
  mime_type text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists book_uploads_user_created_idx on public.book_uploads (user_id, created_at desc);
create unique index if not exists book_uploads_storage_path_idx on public.book_uploads (storage_path);

alter table public.profiles enable row level security;
alter table public.book_uploads enable row level security;

-- Policies for Profiles
-- Drop existing policies to ensure idempotency if running multiple times
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Policies for Uploads
drop policy if exists "Users can read own uploads" on public.book_uploads;
create policy "Users can read own uploads" on public.book_uploads for select using (auth.uid() = user_id);

drop policy if exists "Users can create own upload metadata" on public.book_uploads;
create policy "Users can create own upload metadata" on public.book_uploads for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own upload metadata" on public.book_uploads;
create policy "Users can delete own upload metadata" on public.book_uploads for delete using (auth.uid() = user_id);

-- Profile Trigger
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Timestamp Trigger
create or replace function public.set_updated_at_timestamp() returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at_timestamp();

drop trigger if exists book_uploads_set_updated_at on public.book_uploads;
create trigger book_uploads_set_updated_at before update on public.book_uploads for each row execute function public.set_updated_at_timestamp();


-- =========================================================================
-- 2. STORAGE (EPUBS BUCKET)
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'epubs',
  'epubs',
  false, -- Private bucket (requires auth)
  104857600, -- 100MB limit
  array['application/epub+zip', 'application/octet-stream']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage Policies
drop policy if exists "Users can upload their own EPUBs" on storage.objects;
create policy "Users can upload their own EPUBs" on storage.objects for insert to authenticated with check (bucket_id = 'epubs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can read their own EPUBs" on storage.objects;
create policy "Users can read their own EPUBs" on storage.objects for select to authenticated using (bucket_id = 'epubs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own EPUBs" on storage.objects;
create policy "Users can update their own EPUBs" on storage.objects for update to authenticated using (bucket_id = 'epubs' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'epubs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own EPUBs" on storage.objects;
create policy "Users can delete their own EPUBs" on storage.objects for delete to authenticated using (bucket_id = 'epubs' and (storage.foldername(name))[1] = auth.uid()::text);


-- =========================================================================
-- 3. LIBRARY CORE (BOOKS)
-- =========================================================================
do $$ begin
    create type public.book_reading_state as enum ('to_read', 'reading', 'completed');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  author text,
  state public.book_reading_state not null default 'to_read',
  cover_url text,
  google_books_id text,
  open_library_key text,
  goodreads_search_url text,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  notes_count int not null default 0 check (notes_count >= 0),
  streak_days int not null default 0 check (streak_days >= 0),
  last_read_at timestamptz,
  upload_id uuid references public.book_uploads (id) on delete set null,
  
  -- Generated Columns for Search Normalization
  title_norm text generated always as (lower(regexp_replace(trim(both from title), '\s+', ' ', 'g'))) stored,
  author_norm text generated always as (case when author is not null then lower(regexp_replace(trim(both from author), '\s+', ' ', 'g')) else null end) stored,
  
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  
  -- Check constraint for uniqueness (requires handling separate index if constraint exists, but here we just try create unique index/constraint logic indirectly or ignore if exists)
  constraint books_user_title_author_unique unique (user_id, title_norm, author_norm)
);

-- Indexes
create index if not exists books_user_state_idx on public.books (user_id, state);
create index if not exists books_user_updated_idx on public.books (user_id, updated_at desc);
create index if not exists books_title_trgm_idx on public.books using gin (title gin_trgm_ops);

alter table public.books enable row level security;

-- Policies for Books
drop policy if exists "Users can read own books" on public.books;
create policy "Users can read own books" on public.books for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own books" on public.books;
create policy "Users can insert own books" on public.books for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own books" on public.books;
create policy "Users can update own books" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own books" on public.books;
create policy "Users can delete own books" on public.books for delete using (auth.uid() = user_id);

-- Book Trigger
drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books for each row execute function public.set_updated_at_timestamp();


-- =========================================================================
-- 4. READER & ANNOTATIONS
-- =========================================================================
-- Update books table with new column (idempotent check)
alter table public.books add column if not exists last_read_location text;

create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  cfi_range text not null,
  text_content text not null,
  note text,
  color text default 'yellow',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists annotations_book_id_idx on public.annotations (book_id);
create index if not exists annotations_user_book_idx on public.annotations (user_id, book_id);

alter table public.annotations enable row level security;

-- Policies for Annotations
drop policy if exists "Users can read own annotations" on public.annotations;
create policy "Users can read own annotations" on public.annotations for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own annotations" on public.annotations;
create policy "Users can insert own annotations" on public.annotations for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own annotations" on public.annotations;
create policy "Users can update own annotations" on public.annotations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own annotations" on public.annotations;
create policy "Users can delete own annotations" on public.annotations for delete using (auth.uid() = user_id);

-- Annotation Trigger
drop trigger if exists annotations_set_updated_at on public.annotations;
create trigger annotations_set_updated_at before update on public.annotations for each row execute function public.set_updated_at_timestamp();
```

## Step 4: Final Verification
1. Go to the **Table Editor** in Supabase.
2. Ensure you see the tables: `profiles`, `books`, `book_uploads`, `annotations`.
3. Go to **Storage**.
4. Ensure you see the `epubs` bucket.
5. Setup Complete! 🚀
