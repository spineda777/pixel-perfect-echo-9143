
-- ROLES
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users see own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- PROFILES (privacy-safe public handle)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  public_handle text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, public_handle)
  values (new.id, 'RSP-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- CAMPAIGNS
create type public.campaign_mode as enum ('demo', 'production');

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  mode public.campaign_mode not null default 'demo',
  is_featured boolean not null default false,
  max_inventory integer not null default 15000 check (max_inventory between 1 and 15000),
  max_per_user integer not null default 100 check (max_per_user between 1 and 100),
  unit_price_cents integer not null default 99 check (unit_price_cents >= 0),
  currency text not null default 'USD',
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  hero_image_url text,
  title jsonb not null default '{}'::jsonb,
  tagline jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  demo_entries_sold integer not null default 0 check (demo_entries_sold >= 0),
  rules_status text not null default 'draft' check (rules_status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (demo_entries_sold <= max_inventory)
);
grant select on public.campaigns to anon, authenticated;
grant insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "Anyone reads campaigns" on public.campaigns for select to anon, authenticated using (true);
create policy "Admins insert campaigns" on public.campaigns for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update campaigns" on public.campaigns for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete campaigns" on public.campaigns for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger campaigns_touch before update on public.campaigns for each row execute function public.touch_updated_at();

-- PRIZES
create table public.prizes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  rank integer not null check (rank >= 1),
  winner_count integer not null default 1 check (winner_count >= 1),
  image_url text,
  approx_value_cents integer check (approx_value_cents >= 0),
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (campaign_id, rank)
);
grant select on public.prizes to anon, authenticated;
grant insert, update, delete on public.prizes to authenticated;
grant all on public.prizes to service_role;
alter table public.prizes enable row level security;
create policy "Anyone reads prizes" on public.prizes for select to anon, authenticated using (true);
create policy "Admins insert prizes" on public.prizes for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update prizes" on public.prizes for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete prizes" on public.prizes for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PACKAGES
create table public.campaign_packages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  entries integer not null check (entries between 1 and 100),
  price_cents integer not null check (price_cents >= 0),
  is_recommended boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.campaign_packages to anon, authenticated;
grant insert, update, delete on public.campaign_packages to authenticated;
grant all on public.campaign_packages to service_role;
alter table public.campaign_packages enable row level security;
create policy "Anyone reads packages" on public.campaign_packages for select to anon, authenticated using (true);
create policy "Admins insert packages" on public.campaign_packages for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update packages" on public.campaign_packages for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete packages" on public.campaign_packages for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ENTRIES (no client insert path; only allocate_entries via service role)
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  entry_number integer not null,
  status text not null default 'valid' check (status in ('valid', 'void')),
  created_at timestamptz not null default now(),
  unique (campaign_id, entry_number)
);
create index entries_campaign_user_idx on public.entries (campaign_id, user_id);
grant select on public.entries to authenticated;
grant all on public.entries to service_role;
alter table public.entries enable row level security;
create policy "Users read own entries" on public.entries for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Database-level guard: every insert re-checks limits under a row lock
create or replace function public.enforce_entry_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c public.campaigns%rowtype;
  total_valid integer;
  user_valid integer;
begin
  select * into c from public.campaigns where id = new.campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if c.mode <> 'production' then raise exception 'Entries cannot be created while the campaign is in demo mode'; end if;
  if c.ends_at is not null and now() > c.ends_at then raise exception 'Campaign has ended'; end if;
  if not exists (select 1 from auth.users u where u.id = new.user_id and u.email_confirmed_at is not null) then
    raise exception 'Account must be verified';
  end if;
  select count(*) into total_valid from public.entries where campaign_id = new.campaign_id and status = 'valid';
  if total_valid >= c.max_inventory then raise exception 'Campaign inventory is sold out'; end if;
  select count(*) into user_valid from public.entries where campaign_id = new.campaign_id and user_id = new.user_id and status = 'valid';
  if user_valid >= c.max_per_user then raise exception 'Personal entry limit reached'; end if;
  select coalesce(max(entry_number), 0) + 1 into new.entry_number from public.entries where campaign_id = new.campaign_id;
  new.status := 'valid';
  return new;
end;
$$;
create trigger entries_enforce_limits before insert on public.entries
  for each row execute function public.enforce_entry_limits();

-- Atomic allocation for a future, approved payment flow (service role only)
create or replace function public.allocate_entries(_campaign_id uuid, _user_id uuid, _quantity integer)
returns setof public.entries language plpgsql security definer set search_path = public as $$
declare
  c public.campaigns%rowtype;
  total_valid integer;
  user_valid integer;
  i integer;
begin
  if _quantity is null or _quantity < 1 then raise exception 'Invalid quantity'; end if;
  select * into c from public.campaigns where id = _campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if c.mode <> 'production' then raise exception 'Entries cannot be created while the campaign is in demo mode'; end if;
  select count(*) into total_valid from public.entries where campaign_id = _campaign_id and status = 'valid';
  select count(*) into user_valid from public.entries where campaign_id = _campaign_id and user_id = _user_id and status = 'valid';
  if total_valid + _quantity > c.max_inventory then raise exception 'Not enough campaign inventory'; end if;
  if user_valid + _quantity > c.max_per_user then raise exception 'Personal entry limit exceeded'; end if;
  for i in 1.._quantity loop
    return query insert into public.entries (campaign_id, user_id, entry_number) values (_campaign_id, _user_id, 0) returning *;
  end loop;
end;
$$;
revoke all on function public.allocate_entries(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.allocate_entries(uuid, uuid, integer) to service_role;

-- Public stats
create or replace function public.get_campaign_stats(_campaign_id uuid)
returns table (entries_sold integer, max_inventory integer, remaining integer, is_demo boolean)
language plpgsql stable security definer set search_path = public as $$
declare c public.campaigns%rowtype; sold integer;
begin
  select * into c from public.campaigns where id = _campaign_id;
  if not found then return; end if;
  if c.mode = 'demo' then sold := c.demo_entries_sold;
  else select count(*) into sold from public.entries where campaign_id = _campaign_id and status = 'valid';
  end if;
  return query select sold, c.max_inventory, greatest(c.max_inventory - sold, 0), (c.mode = 'demo');
end;
$$;
grant execute on function public.get_campaign_stats(uuid) to anon, authenticated;

create or replace function public.get_my_allowance(_campaign_id uuid)
returns table (my_entries integer, max_per_user integer, remaining integer, email_verified boolean)
language plpgsql stable security definer set search_path = public as $$
declare c public.campaigns%rowtype; mine integer; verified boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into c from public.campaigns where id = _campaign_id;
  if not found then return; end if;
  select count(*) into mine from public.entries where campaign_id = _campaign_id and user_id = auth.uid() and status = 'valid';
  select (u.email_confirmed_at is not null) into verified from auth.users u where u.id = auth.uid();
  return query select mine, c.max_per_user, greatest(c.max_per_user - mine, 0), coalesce(verified, false);
end;
$$;
revoke all on function public.get_my_allowance(uuid) from public, anon;
grant execute on function public.get_my_allowance(uuid) to authenticated;

create or replace function public.get_public_entries(_campaign_id uuid, _limit integer default 50, _offset integer default 0)
returns table (entry_number integer, public_handle text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.entry_number, coalesce(p.public_handle, 'RSP-ANON'), e.status, e.created_at
  from public.entries e
  join public.campaigns c on c.id = e.campaign_id and c.mode = 'production'
  left join public.profiles p on p.id = e.user_id
  where e.campaign_id = _campaign_id and e.status = 'valid'
  order by e.entry_number desc
  limit least(greatest(_limit, 1), 200) offset greatest(_offset, 0)
$$;
grant execute on function public.get_public_entries(uuid, integer, integer) to anon, authenticated;

-- FAQ
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  sort_order integer not null default 0,
  question jsonb not null default '{}'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.faqs to anon, authenticated;
grant insert, update, delete on public.faqs to authenticated;
grant all on public.faqs to service_role;
alter table public.faqs enable row level security;
create policy "Anyone reads published faqs" on public.faqs for select to anon, authenticated using (is_published or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert faqs" on public.faqs for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update faqs" on public.faqs for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete faqs" on public.faqs for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RULES
create table public.rules_sections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  section_number integer not null,
  title jsonb not null default '{}'::jsonb,
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (campaign_id, section_number)
);
grant select on public.rules_sections to anon, authenticated;
grant insert, update, delete on public.rules_sections to authenticated;
grant all on public.rules_sections to service_role;
alter table public.rules_sections enable row level security;
create policy "Anyone reads rules" on public.rules_sections for select to anon, authenticated using (true);
create policy "Admins insert rules" on public.rules_sections for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update rules" on public.rules_sections for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete rules" on public.rules_sections for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- AUDIT LOG
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Admins read audit logs" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.log_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(), tg_op, tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;
create trigger audit_campaigns after insert or update or delete on public.campaigns for each row execute function public.log_audit();
create trigger audit_prizes after insert or update or delete on public.prizes for each row execute function public.log_audit();
create trigger audit_packages after insert or update or delete on public.campaign_packages for each row execute function public.log_audit();
create trigger audit_faqs after insert or update or delete on public.faqs for each row execute function public.log_audit();
create trigger audit_rules after insert or update or delete on public.rules_sections for each row execute function public.log_audit();
create trigger audit_roles after insert or update or delete on public.user_roles for each row execute function public.log_audit();

-- First admin bootstrap (only works while no admin exists)
create or replace function public.admins_exist()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admins_exist() to anon, authenticated;

create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(424242);
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'An administrator already exists';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
  return true;
end;
$$;
revoke all on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

alter publication supabase_realtime add table public.campaigns;
