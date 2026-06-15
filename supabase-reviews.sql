-- ════════════════════════════════════════════════════════════
--  Reviews table + moderation
--  Run this once in the Supabase SQL editor for project
--  vgtctlzhksdffdctkylw.
--
--  Photos are stored inline as compressed base64 data URLs in the
--  `images` jsonb column (same approach the listings table uses) —
--  no Storage bucket required.
--
--  Moderation: new reviews are inserted with status = 'pending' and
--  do NOT appear on the site until an admin sets status = 'approved'
--  in the dashboard (Reviews tab).
-- ════════════════════════════════════════════════════════════

create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  rating        int  not null check (rating between 1 and 5),
  device_type   text,
  device_model  text,
  text          text,
  suburb        text,
  images        jsonb not null default '[]'::jsonb,
  status        text  not null default 'pending',  -- pending | approved | rejected
  created_at    timestamptz not null default now()
);

create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

-- This project's admin dashboard uses the public anon key for all CRUD
-- (same as the listings/inventory tables), so we keep a permissive policy
-- to stay consistent. The public site only ever queries status = 'approved'.
--
-- HARDENING (optional, later): move approve/reject/list-pending behind a
-- Netlify Function that uses the Supabase service-role key, then tighten
-- these policies to: anon INSERT (status must be 'pending') + anon SELECT
-- (status = 'approved') only.
alter table public.reviews enable row level security;

drop policy if exists "reviews public access" on public.reviews;
create policy "reviews public access"
  on public.reviews
  for all
  to anon
  using (true)
  with check (true);
