-- Secure, simulated settlement workflow. Browser clients can only read these
-- records; every state change is computed and authorized in this function.

create type public.settlement_event_type as enum (
  'prepared', 'verification_confirmed', 'approval_granted',
  'simulation_started', 'simulation_completed'
);

create table public.settlement_obligation_snapshots (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete restrict,
  obligation_id uuid not null references public.contract_obligations(id) on delete restrict,
  recipient_org_id uuid not null references public.organizations(id) on delete restrict,
  obligation_type public.obligation_type not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null,
  obligation_status public.obligation_status not null,
  captured_at timestamptz not null default now(),
  unique (settlement_id, obligation_id)
);

create table public.settlement_events (
  id bigint generated always as identity primary key,
  settlement_id uuid not null references public.settlements(id) on delete restrict,
  sequence_no integer not null check (sequence_no > 0),
  event_type public.settlement_event_type not null,
  previous_status public.settlement_status,
  next_status public.settlement_status not null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key uuid not null,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique (settlement_id, sequence_no),
  unique (settlement_id, idempotency_key)
);

create index settlement_events_settlement_idx on public.settlement_events(settlement_id, occurred_at);
create index settlement_snapshots_settlement_idx on public.settlement_obligation_snapshots(settlement_id);

alter table public.settlement_events enable row level security;
alter table public.settlement_obligation_snapshots enable row level security;

create policy "settlement events party read" on public.settlement_events for select using (
  exists (
    select 1 from public.settlements s join public.contracts c on c.id = s.contract_id
    where s.id = settlement_id
      and (public.is_org_member(c.buyer_org_id) or public.is_org_member(c.seller_org_id) or public.is_admin())
  )
);
create policy "settlement snapshots party read" on public.settlement_obligation_snapshots for select using (
  exists (
    select 1 from public.settlements s join public.contracts c on c.id = s.contract_id
    where s.id = settlement_id
      and (public.is_org_member(c.buyer_org_id) or public.is_org_member(c.seller_org_id) or public.is_admin())
  )
);

create or replace function public.reject_settlement_history_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Settlement history is immutable';
end;
$$;

create trigger settlement_events_immutable before update or delete on public.settlement_events
for each row execute function public.reject_settlement_history_mutation();
create trigger settlement_snapshots_immutable before update or delete on public.settlement_obligation_snapshots
for each row execute function public.reject_settlement_history_mutation();

create or replace function public.settlement_actor_has_role(actor_id uuid, organization_id uuid, required_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.user_id = $1 and m.organization_id = $2 and m.role = $3
  );
$$;

-- Execute through the Edge Function only. The function derives every amount
-- from persisted obligations and never accepts client totals or status values.
create or replace function public.advance_simulated_settlement(
  p_settlement_id uuid,
  p_action text,
  p_idempotency_key uuid,
  p_actor_user_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_settlement public.settlements%rowtype;
  v_contract public.contracts%rowtype;
  v_previous public.settlement_status;
  v_next public.settlement_status;
  v_event public.settlement_event_type;
  v_sequence integer;
  v_locked_total numeric(14,2);
  v_allocation_total numeric(14,2);
  v_result jsonb;
  v_existing jsonb;
begin
  if p_action not in ('prepare', 'verify', 'approve', 'execute') then
    raise exception 'Unsupported settlement action' using errcode = '22023';
  end if;
  if p_actor_user_id is null or public.is_anonymous_user() then
    raise exception 'A permanent authenticated user is required' using errcode = '42501';
  end if;

  select event_data into v_existing from public.settlement_events
  where settlement_id = p_settlement_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('idempotent', true, 'result', v_existing -> 'result');
  end if;

  select * into v_settlement from public.settlements where id = p_settlement_id for update;
  if not found then raise exception 'Settlement not found' using errcode = 'P0002'; end if;
  select * into v_contract from public.contracts where id = v_settlement.contract_id;

  if p_action = 'prepare' then
    if not (public.settlement_actor_has_role(p_actor_user_id, v_contract.seller_org_id, 'farmer')
      or public.settlement_actor_has_role(p_actor_user_id, v_contract.buyer_org_id, 'buyer')
      or exists (select 1 from public.organization_memberships where user_id = p_actor_user_id and role = 'admin')) then
      raise exception 'Only a contract farmer, buyer, or admin may prepare a settlement' using errcode = '42501';
    end if;
    if v_settlement.status <> 'draft' then raise exception 'Settlement is not ready to prepare' using errcode = 'P0001'; end if;
    if v_contract.status not in ('active', 'fulfilment', 'settlement_pending') then raise exception 'Contract is not eligible for settlement' using errcode = 'P0001'; end if;
    if exists (select 1 from public.contract_obligations where contract_id = v_contract.id and status not in ('secured', 'locked')) then
      raise exception 'All contract obligations must be secured before settlement' using errcode = 'P0001';
    end if;
    select coalesce(sum(agreed_amount), 0) into v_locked_total from public.contract_obligations where contract_id = v_contract.id and status in ('secured', 'locked');
    if v_locked_total > v_settlement.gross_amount then
      raise exception 'Settlement amount does not cover locked obligations' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.settlement_obligation_snapshots where settlement_id = v_settlement.id)
      or exists (select 1 from public.settlement_allocations where settlement_id = v_settlement.id) then
      raise exception 'Settlement distribution has already been prepared' using errcode = 'P0001';
    end if;

    insert into public.settlement_obligation_snapshots (settlement_id, obligation_id, recipient_org_id, obligation_type, description, amount, currency, obligation_status)
    select v_settlement.id, o.id, o.payee_org_id, o.obligation_type, o.description, o.agreed_amount, o.currency, o.status
    from public.contract_obligations o where o.contract_id = v_contract.id and o.status in ('secured', 'locked');
    insert into public.settlement_allocations (settlement_id, recipient_org_id, obligation_id, allocation_kind, amount, payout_status)
    select v_settlement.id, o.payee_org_id, o.id, 'obligation', o.agreed_amount, 'created'
    from public.contract_obligations o where o.contract_id = v_contract.id and o.status in ('secured', 'locked');
    insert into public.settlement_allocations (settlement_id, recipient_org_id, allocation_kind, amount, payout_status)
    values (v_settlement.id, v_contract.seller_org_id, 'farmer_proceeds', v_settlement.gross_amount - v_locked_total, 'created');
    select coalesce(sum(amount), 0) into v_allocation_total from public.settlement_allocations where settlement_id = v_settlement.id;
    if v_allocation_total <> v_settlement.gross_amount then raise exception 'Settlement allocations do not balance' using errcode = 'P0001'; end if;
    update public.contract_obligations set status = 'locked' where contract_id = v_contract.id and status = 'secured';
    v_next := 'awaiting_verification'; v_event := 'prepared';
  elsif p_action = 'verify' then
    if not (public.settlement_actor_has_role(p_actor_user_id, v_contract.buyer_org_id, 'buyer')
      or exists (select 1 from public.organization_memberships where user_id = p_actor_user_id and role = 'admin')) then
      raise exception 'Only a contract buyer or admin may verify settlement' using errcode = '42501';
    end if;
    if v_settlement.status <> 'awaiting_verification' then raise exception 'Settlement is not awaiting verification' using errcode = 'P0001'; end if;
    v_next := 'awaiting_approval'; v_event := 'verification_confirmed';
  elsif p_action = 'approve' then
    if not exists (select 1 from public.organization_memberships where user_id = p_actor_user_id and role = 'admin') then
      raise exception 'Only an admin may approve simulated settlement' using errcode = '42501';
    end if;
    if v_settlement.status <> 'awaiting_approval' then raise exception 'Settlement is not awaiting approval' using errcode = 'P0001'; end if;
    v_next := 'executing'; v_event := 'approval_granted';
  else
    if not exists (select 1 from public.organization_memberships where user_id = p_actor_user_id and role = 'admin') then
      raise exception 'Only an admin may execute simulated settlement' using errcode = '42501';
    end if;
    if v_settlement.status <> 'executing' then raise exception 'Settlement is not approved for simulation' using errcode = 'P0001'; end if;
    v_next := 'completed'; v_event := 'simulation_completed';
  end if;

  v_previous := v_settlement.status;
  if p_action = 'approve' then
    update public.settlements set status = v_next, approved_by = p_actor_user_id, approved_at = now() where id = v_settlement.id;
  elsif p_action = 'execute' then
    update public.settlements set status = v_next, executed_at = now() where id = v_settlement.id;
  else
    update public.settlements set status = v_next where id = v_settlement.id;
  end if;
  select coalesce(max(sequence_no), 0) + 1 into v_sequence from public.settlement_events where settlement_id = v_settlement.id;
  v_result := jsonb_build_object('settlement_id', v_settlement.id, 'previous_status', v_previous, 'status', v_next, 'simulation_only', true);
  insert into public.settlement_events (settlement_id, sequence_no, event_type, previous_status, next_status, actor_user_id, idempotency_key, event_data)
  values (v_settlement.id, v_sequence, v_event, v_previous, v_next, p_actor_user_id, p_idempotency_key, jsonb_build_object('action', p_action, 'result', v_result));
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, before_data, after_data, request_id)
  values (p_actor_user_id, 'SIMULATED_SETTLEMENT_' || upper(p_action), 'settlements', v_settlement.id, jsonb_build_object('status', v_previous), jsonb_build_object('status', v_next, 'simulation_only', true), p_idempotency_key);
  return jsonb_build_object('idempotent', false, 'result', v_result);
end;
$$;

revoke all on function public.advance_simulated_settlement(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.advance_simulated_settlement(uuid, text, uuid, uuid) to service_role;
