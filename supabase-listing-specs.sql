-- Adds optional SKU + spec fields to the listings table.
-- Run once in the Supabase SQL editor (project vgtctlzhksdffdctkylw).
-- All nullable, so existing rows are unaffected; the product page falls
-- back to auto-derived specs when these are empty.

alter table public.listings add column if not exists sku           text;
alter table public.listings add column if not exists spec_chip     text;
alter table public.listings add column if not exists spec_display  text;
alter table public.listings add column if not exists spec_camera   text;
alter table public.listings add column if not exists spec_battery  text;  -- capacity, e.g. "3,095 mAh"
