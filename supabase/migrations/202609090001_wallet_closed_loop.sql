-- ============================================================================
-- Closed-loop wallet — a real, server-authoritative, double-entry ledger.
--
-- Replaces the Phase-2 "simulation" wallet (202609080008). Real money never
-- enters or leaves the system (holding customer funds as a balance in India
-- needs an RBI Prepaid Payment Instrument licence). But INSIDE the system every
-- rupee is real and fully accounted for:
--
--   * one wallet per holder — a farmer (profile) or an organisation
--   * every transfer writes TWO ledger rows (debit the sender, credit the
--     recipient) that must balance — enforced in the database, not the browser
--   * you can only pay a wallet that exists (a verified network participant);
--     there is no free-text "ghost" payee
--   * balances can never go negative; ledger history is immutable and audited
--   * a balance only ever rises from a transfer in, a settlement payout, or a
--     clearly-labelled seed grant — never "add money from nowhere"
--
-- All writes go through SECURITY DEFINER functions callable only by the
-- service_role (i.e. the wallet-transfer Edge Function). The browser can read
-- its own wallet and nothing else.
--
-- Safe to re-run locally with `supabase db reset`.
-- ============================================================================

-- 1. Tear down the simulation wallet -----------------------------------------
drop function if exists public.credit_wallets_for_settlement(uuid, uuid);
drop function if exists public.wallet_debit(uuid, bigint, public.wallet_entry_kind, text, text, uuid);
drop trigger  if exists wallet_ledger_apply on public.wallet_ledger;
drop trigger  if exists wallet_ledger_immutable on public.wallet_ledger;
drop function if exists public.wallet_apply_ledger();
drop function if exists public.wallet_reject_history_mutation();
drop table if exists public.wallet_ledger;
drop table if exists public.wallet_accounts;

-- 2. Wallet accounts -------------------------------------------------------
create table public.wallet_accounts (
  id            uuid primary key default gen_random_uuid(),
  holder_kind   text not null check (holder_kind in ('user', 'org')),
  user_id       uuid references public.profiles(id) on delete cascade,
  org_id        uuid references public.organizations(id) on delete cascade,
  label         text not null,
  balance_paise bigint not null default 0 check (balance_paise >= 0),
  currency      char(3) not null default 'INR',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint wallet_holder_shape check (
    (holder_kind = 'user' and user_id is not null and org_id is null) or
    (holder_kind = 'org'  and org_id  is not null and user_id is null)
  )
);
create unique index wallet_accounts_user_idx on public.wallet_accounts (user_id) where user_id is not null;
create unique index wallet_accounts_org_idx  on public.wallet_accounts (org_id)  where org_id  is not null;

-- 3. Double-entry ledger (append-only) -----------------------------------
create table public.wallet_ledger (
  id                      uuid primary key default gen_random_uuid(),
  transfer_id             uuid not null,
  account_id              uuid not null references public.wallet_accounts(id) on delete cascade,
  direction               public.wallet_entry_direction not null,
  amount_paise            bigint not null check (amount_paise > 0),
  kind                    public.wallet_entry_kind not null,
  counterparty_account_id uuid references public.wallet_accounts(id),
  counterparty_label      text not null default '',
  note                    text,
  reference               text not null,
  obligation_id           uuid,
  idempotency_key         uuid not null,
  created_at              timestamptz not null default now(),
  unique (account_id, idempotency_key)
);
create index wallet_ledger_account_idx  on public.wallet_ledger (account_id, created_at desc);
create index wallet_ledger_transfer_idx on public.wallet_ledger (transfer_id);

-- 4. Balance maintenance + immutability guards --------------------------
create or replace function public.wallet_apply_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  update public.wallet_accounts
     set balance_paise = balance_paise + (case when new.direction = 'credit' then new.amount_paise else -new.amount_paise end),
         updated_at = now()
   where id = new.account_id
  returning balance_paise into v_balance;
  if not found then
    raise exception 'Wallet account % does not exist', new.account_id using errcode = 'P0002';
  end if;
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

-- 5. Auto-provision a wallet for every holder --------------------------
create or replace function public.ensure_user_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallet_accounts (holder_kind, user_id, label)
  values ('user', new.id, coalesce(nullif(new.display_name, ''), 'Farmer'))
  on conflict do nothing;
  return new;
end; $$;
create trigger profiles_wallet_provision after insert on public.profiles
  for each row execute function public.ensure_user_wallet();

create or replace function public.ensure_org_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallet_accounts (holder_kind, org_id, label)
  values ('org', new.id, coalesce(nullif(new.display_name, ''), new.legal_name, 'Organisation'))
  on conflict do nothing;
  return new;
end; $$;
create trigger organizations_wallet_provision after insert on public.organizations
  for each row execute function public.ensure_org_wallet();

-- Backfill wallets for holders that already exist.
insert into public.wallet_accounts (holder_kind, user_id, label)
select 'user', p.id, coalesce(nullif(p.display_name, ''), 'Farmer')
from public.profiles p
where not exists (select 1 from public.wallet_accounts w where w.user_id = p.id);

insert into public.wallet_accounts (holder_kind, org_id, label)
select 'org', o.id, coalesce(nullif(o.display_name, ''), o.legal_name, 'Organisation')
from public.organizations o
where not exists (select 1 from public.wallet_accounts w where w.org_id = o.id);

-- 6. Row-level security: a holder (and its org members) may READ only --
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger  enable row level security;

create or replace function public.wallet_account_visible(p_account_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wallet_accounts a
    where a.id = p_account_id
      and (
        a.user_id = auth.uid()
        or a.org_id in (
          select m.organization_id from public.organization_memberships m
          where m.user_id = auth.uid()
        )
      )
  );
$$;
grant execute on function public.wallet_account_visible(uuid) to anon, authenticated;

create policy "wallet account: holder reads" on public.wallet_accounts
  for select using (public.wallet_account_visible(id));
create policy "wallet ledger: holder reads" on public.wallet_ledger
  for select using (public.wallet_account_visible(account_id));

-- 7. Resolve / provision helpers (service role only) ------------------
create or replace function public.wallet_account_for_user(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.wallet_accounts where user_id = p_user;
  if v_id is null then
    insert into public.wallet_accounts (holder_kind, user_id, label)
    values ('user', p_user, coalesce((select display_name from public.profiles where id = p_user), 'Farmer'))
    returning id into v_id;
  end if;
  return v_id;
end; $$;

create or replace function public.wallet_account_for_org(p_org uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.wallet_accounts where org_id = p_org;
  if v_id is null then
    insert into public.wallet_accounts (holder_kind, org_id, label)
    values ('org', p_org, coalesce((select display_name from public.organizations where id = p_org), 'Organisation'))
    returning id into v_id;
  end if;
  return v_id;
end; $$;

-- 8. The only transfer path: one atomic, idempotent, double-entry move -
create or replace function public.wallet_transfer(
  p_sender_account    uuid,
  p_recipient_account uuid,
  p_amount_paise      bigint,
  p_kind              public.wallet_entry_kind,
  p_note              text,
  p_obligation_id     uuid,
  p_idempotency_key   uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ref               text;
  v_sender_label      text;
  v_recipient_label   text;
  v_sender_balance    bigint;
  v_recipient_balance bigint;
  v_existing          uuid;
begin
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;
  if p_sender_account = p_recipient_account then
    raise exception 'Sender and recipient must be different wallets' using errcode = '22023';
  end if;

  select label into v_sender_label from public.wallet_accounts where id = p_sender_account;
  if not found then raise exception 'Unknown sender wallet' using errcode = 'P0002'; end if;
  select label into v_recipient_label from public.wallet_accounts where id = p_recipient_account;
  if not found then raise exception 'Unknown recipient wallet' using errcode = 'P0002'; end if;

  -- Idempotent replay: the sender already recorded this key.
  select transfer_id into v_existing
  from public.wallet_ledger
  where account_id = p_sender_account and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    select balance_paise into v_sender_balance    from public.wallet_accounts where id = p_sender_account;
    select balance_paise into v_recipient_balance from public.wallet_accounts where id = p_recipient_account;
    return jsonb_build_object(
      'idempotent', true,
      'transfer_id', v_existing,
      'reference', (select reference from public.wallet_ledger
                    where account_id = p_sender_account and idempotency_key = p_idempotency_key),
      'sender_balance_paise', v_sender_balance,
      'recipient_balance_paise', v_recipient_balance);
  end if;

  v_ref := 'DM-' || upper(substr(replace(p_idempotency_key::text, '-', ''), 1, 8));

  -- Lock both accounts in a stable order to avoid deadlocks.
  perform 1 from public.wallet_accounts
   where id in (p_sender_account, p_recipient_account) order by id for update;

  insert into public.wallet_ledger (
    transfer_id, account_id, direction, amount_paise, kind,
    counterparty_account_id, counterparty_label, note, reference, obligation_id, idempotency_key)
  values (
    p_idempotency_key, p_sender_account, 'debit', p_amount_paise, p_kind,
    p_recipient_account, v_recipient_label, p_note, v_ref, p_obligation_id, p_idempotency_key);

  insert into public.wallet_ledger (
    transfer_id, account_id, direction, amount_paise, kind,
    counterparty_account_id, counterparty_label, note, reference, obligation_id, idempotency_key)
  values (
    p_idempotency_key, p_recipient_account, 'credit', p_amount_paise, p_kind,
    p_sender_account, v_sender_label, p_note, v_ref, p_obligation_id, p_idempotency_key);

  select balance_paise into v_sender_balance    from public.wallet_accounts where id = p_sender_account;
  select balance_paise into v_recipient_balance from public.wallet_accounts where id = p_recipient_account;
  return jsonb_build_object(
    'idempotent', false,
    'transfer_id', p_idempotency_key,
    'reference', v_ref,
    'sender_balance_paise', v_sender_balance,
    'recipient_balance_paise', v_recipient_balance);
end; $$;

-- 9. Labelled one-sided credit — seed float + settlement payouts only --
create or replace function public.wallet_grant(
  p_recipient_account uuid,
  p_amount_paise      bigint,
  p_memo              text,
  p_idempotency_key   uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_balance bigint; v_ref text;
begin
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;
  if exists (select 1 from public.wallet_ledger
             where account_id = p_recipient_account and idempotency_key = p_idempotency_key) then
    select balance_paise into v_balance from public.wallet_accounts where id = p_recipient_account;
    return jsonb_build_object('idempotent', true, 'balance_paise', v_balance);
  end if;
  v_ref := 'DM-GRT-' || upper(substr(replace(p_idempotency_key::text, '-', ''), 1, 6));
  insert into public.wallet_ledger (
    transfer_id, account_id, direction, amount_paise, kind, counterparty_label, note, reference, idempotency_key)
  values (
    p_idempotency_key, p_recipient_account, 'credit', p_amount_paise, 'adjustment',
    coalesce(p_memo, 'Opening balance'), p_memo, v_ref, p_idempotency_key);
  select balance_paise into v_balance from public.wallet_accounts where id = p_recipient_account;
  return jsonb_build_object('idempotent', false, 'balance_paise', v_balance, 'reference', v_ref);
end; $$;

-- 10. Settlement payout hook (Phase 3 / Step 5 escrow makes this a split) --
create or replace function public.credit_wallets_for_settlement(
  p_settlement_id   uuid,
  p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; v_count int := 0; v_account uuid;
begin
  for r in
    select a.recipient_org_id, sum(a.amount)::bigint as amount
    from public.settlement_allocations a
    where a.settlement_id = p_settlement_id and a.amount > 0
    group by a.recipient_org_id
  loop
    v_account := public.wallet_account_for_org(r.recipient_org_id);
    insert into public.wallet_ledger (
      transfer_id, account_id, direction, amount_paise, kind, counterparty_label, reference, idempotency_key)
    values (
      p_idempotency_key, v_account, 'credit', (r.amount * 100)::bigint, 'settlement', 'Settlement payout',
      'DM-SET-' || upper(substr(replace(p_settlement_id::text, '-', ''), 1, 6)),
      md5(p_idempotency_key::text || ':' || r.recipient_org_id::text)::uuid)
    on conflict (account_id, idempotency_key) do nothing;
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('credited_rows', v_count);
end; $$;

-- 11. Lock every write function to the service role -------------------
revoke all on function public.wallet_transfer(uuid, uuid, bigint, public.wallet_entry_kind, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.wallet_grant(uuid, bigint, text, uuid) from public, anon, authenticated;
revoke all on function public.credit_wallets_for_settlement(uuid, uuid) from public, anon, authenticated;
revoke all on function public.wallet_account_for_user(uuid) from public, anon, authenticated;
revoke all on function public.wallet_account_for_org(uuid) from public, anon, authenticated;

grant execute on function public.wallet_transfer(uuid, uuid, bigint, public.wallet_entry_kind, text, uuid, uuid) to service_role;
grant execute on function public.wallet_grant(uuid, bigint, text, uuid) to service_role;
grant execute on function public.credit_wallets_for_settlement(uuid, uuid) to service_role;
grant execute on function public.wallet_account_for_user(uuid) to service_role;
grant execute on function public.wallet_account_for_org(uuid) to service_role;
