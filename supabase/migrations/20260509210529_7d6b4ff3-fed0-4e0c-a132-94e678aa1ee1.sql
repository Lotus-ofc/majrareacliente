
-- ========== 1. AGENCIES TABLE ==========
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  branding jsonb not null default '{}'::jsonb,
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agencies enable row level security;

create trigger agencies_set_updated_at
before update on public.agencies
for each row execute function public.tg_set_updated_at();

-- ========== 2. NEW ROLE: agency_admin ==========
alter type public.app_role add value if not exists 'agency_admin';
