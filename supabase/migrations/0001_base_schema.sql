create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
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

create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can upsert own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can read own uploads"
  on public.book_uploads
  for select
  using (auth.uid() = user_id);

create policy "Users can create own upload metadata"
  on public.book_uploads
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own upload metadata"
  on public.book_uploads
  for delete
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists book_uploads_set_updated_at on public.book_uploads;
create trigger book_uploads_set_updated_at
  before update on public.book_uploads
  for each row execute function public.set_updated_at_timestamp();
