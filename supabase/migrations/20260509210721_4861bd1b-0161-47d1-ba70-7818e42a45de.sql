
-- ========== ADD agency_id COLUMNS FIRST (so helper functions compile) ==========
alter table public.profiles         add column agency_id uuid references public.agencies(id);
alter table public.editorial_posts  add column agency_id uuid references public.agencies(id);
alter table public.editorial_notes  add column agency_id uuid references public.agencies(id);
alter table public.invoices         add column agency_id uuid references public.agencies(id);
alter table public.client_reports   add column agency_id uuid references public.agencies(id);
alter table public.notifications    add column agency_id uuid references public.agencies(id);

-- ========== SEED: Leandro MAJR agency + backfill ==========
insert into public.agencies (name, slug, branding)
values (
  'Leandro MAJR',
  'leandro-majr',
  jsonb_build_object(
    'primary', 'oklch(0.32 0.18 295)',
    'accent',  'oklch(0.85 0.25 145)',
    'theme',   'dark-purple-neon-green'
  )
);

update public.profiles
set agency_id = (select id from public.agencies where slug = 'leandro-majr');

update public.editorial_posts ep
set agency_id = p.agency_id
from public.profiles p where p.id = ep.client_id;

update public.editorial_notes en
set agency_id = p.agency_id
from public.profiles p where p.id = en.client_id;

update public.invoices i
set agency_id = p.agency_id
from public.profiles p where p.id = i.client_id;

update public.client_reports cr
set agency_id = p.agency_id
from public.profiles p where p.id = cr.client_id;

update public.notifications n
set agency_id = p.agency_id
from public.profiles p where p.id = n.user_id;

alter table public.profiles        alter column agency_id set not null;
alter table public.editorial_posts alter column agency_id set not null;
alter table public.editorial_notes alter column agency_id set not null;
alter table public.invoices        alter column agency_id set not null;
alter table public.client_reports  alter column agency_id set not null;

update public.agencies
set owner_user_id = (select user_id from public.user_roles where role = 'admin' limit 1)
where slug = 'leandro-majr';

-- ========== HELPERS (now agency_id exists) ==========
create or replace function public.get_user_agency_id(_user_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select agency_id from public.profiles where id = _user_id $$;

create or replace function public.is_agency_member(_user_id uuid, _agency_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where id = _user_id and agency_id = _agency_id)
$$;

revoke execute on function public.get_user_agency_id(uuid) from public, anon;
revoke execute on function public.is_agency_member(uuid, uuid) from public, anon;
grant execute on function public.get_user_agency_id(uuid) to authenticated;
grant execute on function public.is_agency_member(uuid, uuid) to authenticated;

-- ========== AGENCIES POLICIES ==========
create policy "Global admins manage agencies"
on public.agencies for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency members read own agency"
on public.agencies for select to authenticated
using (id = public.get_user_agency_id(auth.uid()));

create policy "Agency admins update own agency"
on public.agencies for update to authenticated
using (id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'))
with check (id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

-- ========== UPDATE handle_new_user TO ASSIGN AGENCY ==========
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  default_agency uuid;
begin
  default_agency := coalesce(
    nullif(new.raw_user_meta_data->>'agency_id','')::uuid,
    (select id from public.agencies where slug = 'leandro-majr' limit 1)
  );
  insert into public.profiles (id, full_name, company, agency_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'company',
    default_agency
  );
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end;
$$;

-- ========== REWRITE RLS ==========

-- profiles
drop policy if exists "Admins read all profiles"   on public.profiles;
drop policy if exists "Admins update any profile"  on public.profiles;
drop policy if exists "Admins insert profiles"     on public.profiles;
drop policy if exists "Users read own profile"     on public.profiles;
drop policy if exists "Users update own profile"   on public.profiles;

create policy "Self read profile"
on public.profiles for select to authenticated using (auth.uid() = id);

create policy "Self update profile"
on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Global admins manage profiles"
on public.profiles for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency staff read agency profiles"
on public.profiles for select to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

create policy "Agency staff insert agency profiles"
on public.profiles for insert to authenticated
with check (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

create policy "Agency staff update agency profiles"
on public.profiles for update to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

-- editorial_posts
drop policy if exists "Admins manage posts"             on public.editorial_posts;
drop policy if exists "Clients read own posts"          on public.editorial_posts;
drop policy if exists "Clients approve own pending posts" on public.editorial_posts;
drop policy if exists "Clients propose caption changes" on public.editorial_posts;

create policy "Global admins manage posts"
on public.editorial_posts for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency staff manage agency posts"
on public.editorial_posts for all to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'))
with check (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

create policy "Clients read own posts"
on public.editorial_posts for select to authenticated using (auth.uid() = client_id);

create policy "Clients approve own pending posts"
on public.editorial_posts for update to authenticated
using (auth.uid() = client_id and status = 'pending'::post_status)
with check (auth.uid() = client_id and status = 'approved'::post_status);

create policy "Clients propose caption changes"
on public.editorial_posts for update to authenticated
using (auth.uid() = client_id)
with check (auth.uid() = client_id and caption_change_status = 'pending');

-- editorial_notes
drop policy if exists "Admins manage editorial notes"    on public.editorial_notes;
drop policy if exists "Clients read own editorial notes" on public.editorial_notes;

create policy "Global admins manage editorial notes"
on public.editorial_notes for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency staff manage agency editorial notes"
on public.editorial_notes for all to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'))
with check (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

create policy "Clients read own editorial notes"
on public.editorial_notes for select to authenticated using (auth.uid() = client_id);

-- invoices
drop policy if exists "Admins manage invoices"  on public.invoices;
drop policy if exists "Clients read own invoices" on public.invoices;

create policy "Global admins manage invoices"
on public.invoices for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency staff manage agency invoices"
on public.invoices for all to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'))
with check (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

create policy "Clients read own invoices"
on public.invoices for select to authenticated using (auth.uid() = client_id);

-- client_reports
drop policy if exists "Admins manage reports"   on public.client_reports;
drop policy if exists "Admins read all reports" on public.client_reports;
drop policy if exists "Clients read own reports" on public.client_reports;

create policy "Global admins manage reports"
on public.client_reports for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency staff manage agency reports"
on public.client_reports for all to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'))
with check (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

create policy "Clients read own reports"
on public.client_reports for select to authenticated using (auth.uid() = client_id);

-- notifications
drop policy if exists "Admins manage all notifications" on public.notifications;

create policy "Global admins manage notifications"
on public.notifications for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency staff read agency notifications"
on public.notifications for select to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

-- ========== REPORT SNAPSHOTS (history) ==========
create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  agency_id uuid not null references public.agencies(id),
  source text not null,
  period_start date,
  period_end date,
  snapshot_date date not null default current_date,
  raw_data jsonb not null default '{}'::jsonb,
  dashboard_layout jsonb not null default '{}'::jsonb,
  ai_analysis text not null default '',
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index report_snapshots_lookup
  on public.report_snapshots (client_id, source, snapshot_date desc);

create trigger report_snapshots_set_updated_at
before update on public.report_snapshots
for each row execute function public.tg_set_updated_at();

alter table public.report_snapshots enable row level security;

create policy "Global admins manage snapshots"
on public.report_snapshots for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Agency staff manage agency snapshots"
on public.report_snapshots for all to authenticated
using (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'))
with check (agency_id = public.get_user_agency_id(auth.uid()) and public.has_role(auth.uid(), 'agency_admin'));

create policy "Clients read own snapshots"
on public.report_snapshots for select to authenticated using (auth.uid() = client_id);
