-- ════════════════════════════════════════════════════════════
--  Device sales / reservations + "preferred contact" support
--  Run this once in the Supabase SQL editor for the project.
--
--  Two changes:
--   1. Adds a `preferred_contact` column to the existing `quotes`
--      table so the admin "Reply" button can contact repair-quote
--      customers via the method they chose (call / text / email).
--   2. Creates a `sale_enquiries` table that captures refurbished-
--      device reservations. The public site no longer sends buyers
--      through an online checkout — the "Reserve this device" funnel
--      emails the team AND drops a lead here for follow-up.
--
--  Both steps are safe to re-run (IF NOT EXISTS / idempotent).
--  Nothing here is required for the site to work: quote submission
--  and reservation emails both degrade gracefully if this is skipped.
-- ════════════════════════════════════════════════════════════

-- 1) Preferred contact method for repair quotes ───────────────
--    Values used by the site: 'call' | 'text' | 'email'
alter table public.quotes
  add column if not exists preferred_contact text;

-- 2) Device reservation / sale enquiries ──────────────────────
create table if not exists public.sale_enquiries (
  id                uuid primary key default gen_random_uuid(),
  device            text not null,
  device_spec       text,
  listing_id        text,                 -- id of the listing reserved (if known)
  listed_price      numeric,
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text,
  preferred_contact text,                 -- 'call' | 'text' | 'email'
  fulfilment        text,                 -- 'pickup' | 'delivery'
  message           text,
  status            text not null default 'new',  -- new | contacted | won | lost
  created_at        timestamptz not null default now()
);

create index if not exists sale_enquiries_status_idx
  on public.sale_enquiries (status, created_at desc);

-- This project's dashboard uses the public anon key for all CRUD
-- (same as the listings / inventory / reviews tables), so we keep a
-- permissive policy to stay consistent.
--
-- HARDENING (optional, later): move reads/updates behind a Netlify
-- Function using the Supabase service-role key, then tighten this to
-- anon INSERT only.
alter table public.sale_enquiries enable row level security;

drop policy if exists "sale_enquiries public access" on public.sale_enquiries;
create policy "sale_enquiries public access"
  on public.sale_enquiries
  for all
  to anon
  using (true)
  with check (true);
