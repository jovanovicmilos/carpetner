-- Accounts, workshops, projects and entitlements (MVP 8 / marketplace phase 1; docs/DATA_MODEL.md, docs/MARKETPLACE.md).
-- RLS everywhere: a workshop member sees the workshop's rows, a customer sees own rows. Products and grants are written only by
-- the service role (platform admin, billing webhook); the app reads them and computes entitlements with engine `entitlements`.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  kind text not null default 'workshop_member' check (kind in ('workshop_member', 'customer')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  default_preset text not null default 'radionica',
  help_default boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null default 'designer' check (role in ('owner', 'designer')),
  primary key (user_id, organization_id)
);

-- A project belongs to a workshop or to a customer, never both.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  owner_user_id uuid references auth.users (id) on delete cascade,
  name text not null default '',
  customer text not null default '',
  data jsonb not null,            -- engine `Project`, the one source of truth
  resume jsonb,                   -- ProjectResume (docs/TOK_PROJEKTA.md)
  progress jsonb,                 -- ProjectProgress
  status text not null default 'active',
  updated_at timestamptz not null default now(),
  check ((organization_id is null) <> (owner_user_id is null))
);
create index on public.projects (organization_id);
create index on public.projects (owner_user_id);

-- Engine `Product` (DEFAULT_PRODUCTS is the seed below; test/schema.test.ts keeps them equal).
create table public.products (
  id text primary key,
  kind text not null check (kind in ('plan', 'addon', 'pass')),
  features text[] not null default '{}',
  limits jsonb not null default '{}'  -- { "users": 3, "requests.per_month": null } — null = unlimited
);

-- Engine `Grant`: subscription, purchase, trial or manual override. `valid_to` exclusive.
create table public.grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  product_id text not null references public.products (id),
  valid_from date not null,
  valid_to date,
  quantity int not null default 1 check (quantity > 0),
  project_id uuid references public.projects (id) on delete cascade,
  trial boolean not null default false,
  check ((organization_id is null) <> (user_id is null))
);
create index on public.grants (organization_id);
create index on public.grants (user_id);

-- security definer: reads memberships without going through its own RLS (no policy recursion)
create function public.is_member(org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = auth.uid())
$$;
create function public.is_owner(org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = auth.uid() and m.role = 'owner')
$$;

-- New workshop: the caller becomes owner; Start for good + 30 days of Pro (engine `workshopSignup`).
create function public.create_organization(org_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.organizations (name) values (org_name) returning id into org;
  insert into public.memberships (user_id, organization_id, role) values (auth.uid(), org, 'owner');
  insert into public.grants (organization_id, product_id, valid_from) values (org, 'start', current_date);
  insert into public.grants (organization_id, product_id, valid_from, valid_to, trial) values (org, 'pro', current_date, current_date + 30, true);
  return org;
end $$;

-- New sign-up gets a profile.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.products enable row level security;
alter table public.grants enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid());
-- kind is chosen at sign-up; changing it later is a platform action
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members read" on public.organizations for select using (public.is_member(id));
create policy "owner updates" on public.organizations for update using (public.is_owner(id));

create policy "members see team" on public.memberships for select using (public.is_member(organization_id));
create policy "owner adds" on public.memberships for insert with check (public.is_owner(organization_id));
create policy "owner changes" on public.memberships for update using (public.is_owner(organization_id));
create policy "owner removes or leave" on public.memberships for delete using (public.is_owner(organization_id) or user_id = auth.uid());

create policy "workshop or own projects" on public.projects for all
  using (case when organization_id is not null then public.is_member(organization_id) else owner_user_id = auth.uid() end)
  with check (case when organization_id is not null then public.is_member(organization_id) else owner_user_id = auth.uid() end);

create policy "everyone reads products" on public.products for select to authenticated using (true);
create policy "own grants" on public.grants for select
  using (case when organization_id is not null then public.is_member(organization_id) else user_id = auth.uid() end);

-- Column-level: profiles.kind and memberships stay out of reach of a plain update by the user.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Seed: engine DEFAULT_PRODUCTS (decided defaults, 2026-11-20).
insert into public.products (id, kind, features, limits) values
  ('start', 'plan', '{}', '{"requests.per_month": 3, "users": 1, "invites.active": 1}'),
  ('pro', 'plan', '{drawings.export,cutlist,quote.full,quote.image,images.clean,pilana,admin.full,whitelabel,stats}', '{"requests.per_month": null, "users": 3, "invites.active": null}'),
  ('premium', 'plan', '{drawings.export,cutlist,quote.full,quote.image,images.clean,pilana,admin.full,whitelabel,stats,whitelabel.own,directory.featured,stats.full,users.roles}', '{"requests.per_month": null, "users": null, "invites.active": null}'),
  ('addon.user', 'addon', '{}', '{"users": 1}'),
  ('addon.cnc', 'addon', '{export.cnc}', '{}'),
  ('addon.requests10', 'addon', '{}', '{"requests.per_month": 10}'),
  ('addon.featured', 'addon', '{directory.featured}', '{}'),
  ('customer.free', 'plan', '{}', '{}'),
  ('customer.plus', 'pass', '{request.send}', '{"request.workshops": 3}');
