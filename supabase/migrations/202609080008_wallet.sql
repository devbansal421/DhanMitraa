-- Phase 2: server-backed wallet.
--
-- This makes the wallet balance and ledger durable, shared across a user's
-- devices, and auditable — instead of living only in one browser's localStorage.
--
-- IMPORTANT: this is still a SIMULATION ledger. Crediting real customer money
-- into a stored balance in India requires an RBI Prepaid Payment Instrument
-- (PPI) licence, or partnering with a licensed PPI / escrow provider. Only point
-- real (non-test) payment-gateway keys at this once that is in place. See README.
--
-- Apply locally first:  supabase db reset
-- Then push:            supabase db push

create type public.wallet_entry_direction as enum ('credit', 'debit');
create type public.wallet_entry_kind as enum (
  'topup', 'send', 'receive', 'obligation', 'request', 'settlement', 'refund', 'adjustment'
);
create type public.payment_order_status as enum ('created', 'paid', 'failed', 'refunded');

create table public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_paise bigint not null default 0 check (balance_paise >= 0),
  currency char(3) not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only ledger. Every movement is one row; the cached balance above is
-- derived from it by trigger.
create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  account_user_id uuid not null references public.profiles(id) on delete cascade,
  direction public.wallet_entry_direction not null,
  amount_paise bigint not null check (amount_paise > 0),
  kind public.wallet_entry_kind not null,
  counterparty_label text not null default '',
  note text,
  reference text not null,
  related_order_id uuid,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (account_user_id, idempotency_key)
);
create index wallet_ledger_account_idx on public.wallet_ledger (account_user_id, created_at desc);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_order_id text unique,
  provider_payment_id text,
  amount_paise bigint not null check (amount_paise > 0),
  status public.payment_order_status not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.payment_orders enable row level security;

-- Read-only for the owner. All writes go through Edge Functions (service role).
create policy "wallet account own read" on public.wallet_accounts
  for select using (user_id = auth.uid());
create policy "wallet ledger own read" on public.wallet_ledger
  for select using (account_user_id = auth.uid());
create policy "payment orders own read" on public.payment_orders
  for select using (user_id = auth.uid());

-- Keep the cached balance in step with the ledger, and refuse overdrafts.
create or replace function public.wallet_apply_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  insert into public.wallet_accounts (user_id) values (new.account_user_id)
    on conflict (user_id) do nothing;
  update public.wallet_accounts
    set balance_paise = balance_paise + (case when new.direction = 'credit' then new.amount_paise else -new.amount_paise end),
        updated_at = now()
    where user_id = new.account_user_id
    returning balance_paise into v_balance;
  if v_balance < 0 then
    raise exception 'Insufficient wallet balance' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger wallet_ledger_apply after insert on public.wallet_ledger
  for each row execute function public.wallet_apply_ledger();

create or replace function public.wallet_reject_history_mutation()
returns trigger language plpgsql as $$
begin raise exception 'Wallet ledger is immutable'; end; $$;
create trigger wallet_ledger_immutable before update or delete on public.wallet_ledger
  for each row execute function public.wallet_reject_history_mutation();

-- Server-authorized spend. Called only by the wallet-transfer Edge Function.
create or replace function public.wallet_debit(
  p_user uuid,
  p_amount_paise bigint,
  p_kind public.wallet_entry_kind,
  p_counterparty text,
  p_note text,
  p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ref text; v_balance bigint;
begin
  if p_amount_paise <= 0 then
    raise exception 'Amount must be positive' using errcode = '22023';
  end if;
  if exists (select 1 from public.wallet_ledger where account_user_id = p_user and idempotency_key = p_idempotency_key) then
    return jsonb_build_object('idempotent', true,
      'balance_paise', coalesce((select balance_paise from public.wallet_accounts where user_id = p_user), 0));
  end if;
  v_ref := 'DM-' || upper(substr(replace(p_idempotency_key::text, '-', ''), 1, 6));
  insert into public.wallet_ledger (account_user_id, direction, amount_paise, kind, counterparty_label, note, reference, idempotency_key)
  values (p_user, 'debit', p_amount_paise, p_kind, coalesce(p_counterparty, ''), p_note, v_ref, p_idempotency_key);
  select balance_paise into v_balance from public.wallet_accounts where user_id = p_user;
  return jsonb_build_object('idempotent', false, 'reference', v_ref, 'balance_paise', v_balance);
end; $$;

revoke all on function public.wallet_debit(uuid, bigint, public.wallet_entry_kind, text, text, uuid) from public, anon, authenticated;
grant execute on function public.wallet_debit(uuid, bigint, public.wallet_entry_kind, text, text, uuid) to service_role;

-- Phase 3: credit every party's wallet when a settlement is executed. Call this
-- from advance_simulated_settlement (see README) or a scheduled job. Idempotent
-- per (user, settlement) so re-running is safe.
create or replace function public.credit_wallets_for_settlement(
  p_settlement_id uuid,
  p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; v_count integer := 0;
begin
  for r in
    select distinct m.user_id, a.amount
    from public.settlement_allocations a
    join public.organization_memberships m on m.organization_id = a.recipient_org_id
    where a.settlement_id = p_settlement_id and a.amount > 0
  loop
    insert into public.wallet_ledger (account_user_id, direction, amount_paise, kind, counterparty_label, reference, idempotency_key)
    values (
      r.user_id, 'credit', (r.amount * 100)::bigint, 'settlement', 'Settlement payout',
      'DM-SET-' || upper(substr(replace(p_settlement_id::text, '-', ''), 1, 6)),
      md5(p_idempotency_key::text || ':' || r.user_id::text)::uuid
    )
    on conflict (account_user_id, idempotency_key) do nothing;
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('credited_rows', v_count);
end; $$;

revoke all on function public.credit_wallets_for_settlement(uuid, uuid) from public, anon, authenticated;
grant execute on function public.credit_wallets_for_settlement(uuid, uuid) to service_role;
