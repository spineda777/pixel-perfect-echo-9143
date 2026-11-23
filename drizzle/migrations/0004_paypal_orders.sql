create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default ('ORD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  package_id uuid references public.campaign_packages(id),
  entries_count integer not null check (entries_count > 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  paypal_order_id text unique,
  paypal_capture_id text,
  payer_email text,
  payer_name text,
  first_entry_number integer,
  last_entry_number integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index orders_user_idx on public.orders(user_id);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Users read own orders" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

alter table public.entries add column order_id uuid references public.orders(id);

drop function if exists public.get_public_entries(uuid, integer, integer);
create function public.get_public_entries(_campaign_id uuid, _limit integer default 50, _offset integer default 0)
returns table (entry_number integer, public_handle text, status text, created_at timestamptz, order_code text)
language sql stable security definer set search_path = public as $$
  select e.entry_number, coalesce(p.public_handle, 'RSP-ANON'), e.status, e.created_at, o.order_code
  from public.entries e
  join public.campaigns c on c.id = e.campaign_id and c.mode = 'production'
  left join public.profiles p on p.id = e.user_id
  left join public.orders o on o.id = e.order_id
  where e.campaign_id = _campaign_id and e.status = 'valid'
  order by e.entry_number desc
  limit least(greatest(_limit, 1), 200) offset greatest(_offset, 0)
$$;
grant execute on function public.get_public_entries(uuid, integer, integer) to anon, authenticated;