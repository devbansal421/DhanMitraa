-- DhanMitraa: phase-one production domain.
-- Run this file in Supabase SQL Editor, or deploy it with `supabase db push`.
-- The browser client must never receive the service_role key.

create extension if not exists pgcrypto;

create type public.app_role as enum ('farmer', 'buyer', 'supplier', 'transporter', 'admin');
create type public.crop_lifecycle_stage as enum ('planted', 'inputs_acquired', 'growing', 'harvest', 'buyer_commitment', 'settlement');
create type public.contract_status as enum ('draft', 'proposed', 'awaiting_parties', 'active', 'fulfilment', 'settlement_pending', 'settled', 'cancelled', 'disputed');
create type public.obligation_type as enum ('seed', 'fertilizer', 'pesticide', 'machinery', 'transport', 'labor', 'other');
create type public.obligation_status as enum ('draft', 'pending_acceptance', 'secured', 'locked', 'paid', 'cancelled');
create type public.delivery_status as enum ('planned', 'assigned', 'in_transit', 'delivered', 'accepted', 'rejected', 'disputed');
create type public.settlement_status as enum ('draft', 'awaiting_funding', 'funded', 'awaiting_verification', 'awaiting_approval', 'executing', 'partially_paid', 'completed', 'failed', 'disputed', 'reversed');
create type public.payment_status as enum ('created', 'pending', 'processing', 'succeeded', 'failed', 'reversed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(trim(legal_name)) > 0),
  display_name text not null check (char_length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, role)
);

create table public.crops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  commodity_code text unique,
  default_unit text not null default 'tonne',
  created_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date,
  ends_on date,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.crop_cycles (
  id uuid primary key default gen_random_uuid(),
  farmer_org_id uuid not null references public.organizations(id),
  crop_id uuid not null references public.crops(id),
  season_id uuid references public.seasons(id),
  expected_quantity numeric(14,3) not null check (expected_quantity > 0),
  quantity_unit text not null default 'tonne',
  estimated_value numeric(14,2) not null check (estimated_value >= 0),
  currency char(3) not null default 'INR',
  maturity_percent smallint not null default 0 check (maturity_percent between 0 and 100),
  expected_harvest_on date,
  lifecycle_stage public.crop_lifecycle_stage not null default 'planted',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  crop_cycle_id uuid not null unique references public.crop_cycles(id),
  buyer_org_id uuid not null references public.organizations(id),
  seller_org_id uuid not null references public.organizations(id),
  status public.contract_status not null default 'draft',
  committed_amount numeric(14,2) not null check (committed_amount >= 0),
  currency char(3) not null default 'INR',
  expected_delivery_on date,
  terms_version integer not null default 1 check (terms_version > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_org_id <> seller_org_id)
);

create table public.contract_obligations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  payee_org_id uuid not null references public.organizations(id),
  obligation_type public.obligation_type not null default 'other',
  description text not null default '',
  agreed_amount numeric(14,2) not null check (agreed_amount > 0),
  currency char(3) not null default 'INR',
  status public.obligation_status not null default 'draft',
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.obligation_acceptances (
  obligation_id uuid primary key references public.contract_obligations(id) on delete cascade,
  accepted_by uuid not null references public.profiles(id),
  accepted_at timestamptz not null default now(),
  terms_version integer not null check (terms_version > 0)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  transporter_org_id uuid references public.organizations(id),
  status public.delivery_status not null default 'planned',
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivered_at is null or dispatched_at is null or delivered_at >= dispatched_at)
);

create table public.delivery_receipts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique references public.deliveries(id) on delete restrict,
  received_quantity numeric(14,3) not null check (received_quantity >= 0),
  accepted_quantity numeric(14,3) not null check (accepted_quantity >= 0 and accepted_quantity <= received_quantity),
  quantity_unit text not null default 'tonne',
  grade text,
  buyer_confirmed_by uuid references public.profiles(id),
  buyer_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((buyer_confirmed_by is null) = (buyer_confirmed_at is null))
);

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  payer_org_id uuid not null references public.organizations(id),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  provider text not null,
  provider_reference text unique,
  status public.payment_status not null default 'created',
  funded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id) on delete restrict,
  status public.settlement_status not null default 'draft',
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  currency char(3) not null default 'INR',
  approval_required boolean not null default true,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  executed_at timestamptz,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((approved_by is null) = (approved_at is null))
);

create table public.settlement_allocations (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete restrict,
  recipient_org_id uuid not null references public.organizations(id),
  obligation_id uuid unique references public.contract_obligations(id) on delete restrict,
  allocation_kind text not null check (allocation_kind in ('obligation', 'farmer_proceeds', 'adjustment', 'refund')),
  amount numeric(14,2) not null check (amount >= 0),
  payout_status public.payment_status not null default 'created',
  provider_transfer_reference text unique,
  created_at timestamptz not null default now(),
  check ((allocation_kind = 'obligation') = (obligation_id is not null))
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id uuid,
  correlation_id uuid
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, new.id::text), '@', 1)),
    nullif(trim(new.phone), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name, phone)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(u.email, u.id::text), '@', 1)),
  nullif(trim(u.phone), '')
from auth.users u
on conflict (id) do nothing;

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id = target_org and m.user_id = auth.uid());
$$;

create or replace function public.has_role(target_org uuid, target_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id = target_org and m.user_id = auth.uid() and m.role = target_role);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_memberships m where m.user_id = auth.uid() and m.role = 'admin');
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_events(actor_user_id, action, entity_type, entity_id, after_data)
    values (auth.uid(), tg_op, tg_table_name, new.id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_events(actor_user_id, action, entity_type, entity_id, before_data, after_data)
    values (auth.uid(), tg_op, tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_events(actor_user_id, action, entity_type, entity_id, before_data)
    values (auth.uid(), tg_op, tg_table_name, old.id, to_jsonb(old));
    return old;
  end if;
end; $$;

create trigger crop_cycles_touch before update on public.crop_cycles for each row execute function public.touch_updated_at();
create trigger contracts_touch before update on public.contracts for each row execute function public.touch_updated_at();
create trigger obligations_touch before update on public.contract_obligations for each row execute function public.touch_updated_at();
create trigger deliveries_touch before update on public.deliveries for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payment_intents for each row execute function public.touch_updated_at();
create trigger settlements_touch before update on public.settlements for each row execute function public.touch_updated_at();
create trigger contracts_audit after insert or update or delete on public.contracts for each row execute function public.audit_row();
create trigger obligations_audit after insert or update or delete on public.contract_obligations for each row execute function public.audit_row();
create trigger settlements_audit after insert or update or delete on public.settlements for each row execute function public.audit_row();

create index crop_cycles_farmer_idx on public.crop_cycles(farmer_org_id, expected_harvest_on);
create index contracts_buyer_idx on public.contracts(buyer_org_id, status);
create index contracts_seller_idx on public.contracts(seller_org_id, status);
create index obligations_contract_idx on public.contract_obligations(contract_id, status);
create index deliveries_contract_idx on public.deliveries(contract_id, status);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.crops enable row level security;
alter table public.seasons enable row level security;
alter table public.crop_cycles enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_obligations enable row level security;
alter table public.obligation_acceptances enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_receipts enable row level security;
alter table public.payment_intents enable row level security;
alter table public.settlements enable row level security;
alter table public.settlement_allocations enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles read own" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "organizations read member" on public.organizations for select using (public.is_org_member(id) or public.is_admin());
create policy "memberships read member" on public.organization_memberships for select using (public.is_org_member(organization_id) or public.is_admin());
create policy "reference crops readable" on public.crops for select to authenticated using (true);
create policy "reference seasons readable" on public.seasons for select to authenticated using (true);
create policy "crop cycles farmer access" on public.crop_cycles for all using (public.is_org_member(farmer_org_id) or public.is_admin()) with check (public.is_org_member(farmer_org_id) or public.is_admin());
create policy "contracts party read" on public.contracts for select using (public.is_org_member(buyer_org_id) or public.is_org_member(seller_org_id) or public.is_admin());
create policy "contracts seller draft" on public.contracts for insert with check (public.is_org_member(seller_org_id));
create policy "obligations involved party read" on public.contract_obligations for select using (public.is_org_member(payee_org_id) or exists (select 1 from public.contracts c where c.id = contract_id and (public.is_org_member(c.buyer_org_id) or public.is_org_member(c.seller_org_id))) or public.is_admin());
create policy "deliveries contract party read" on public.deliveries for select using (public.is_org_member(transporter_org_id) or exists (select 1 from public.contracts c where c.id = contract_id and (public.is_org_member(c.buyer_org_id) or public.is_org_member(c.seller_org_id))) or public.is_admin());
create policy "settlements party read" on public.settlements for select using (exists (select 1 from public.contracts c where c.id = contract_id and (public.is_org_member(c.buyer_org_id) or public.is_org_member(c.seller_org_id))) or public.is_admin());
create policy "allocations recipient read" on public.settlement_allocations for select using (public.is_org_member(recipient_org_id) or exists (select 1 from public.settlements s join public.contracts c on c.id = s.contract_id where s.id = settlement_id and (public.is_org_member(c.buyer_org_id) or public.is_org_member(c.seller_org_id))) or public.is_admin());
create policy "audit admin read" on public.audit_events for select using (public.is_admin());

-- Payments, settlement execution, document verification, and writes to accepted/locked/paid states
-- are intentionally server-only operations performed by Edge Functions using the service-role key.
