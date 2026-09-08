-- Run after `supabase db reset`:
-- supabase test db --local supabase/tests/settlement_workflow.sql
begin;

insert into public.crop_cycles (id, farmer_org_id, crop_id, expected_quantity, estimated_value, created_by) values
('c0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, 100, '10000000-0000-4000-8000-000000000001');
insert into public.contracts (id, public_reference, crop_cycle_id, buyer_org_id, seller_org_id, status, committed_amount, created_by) values
('d0000000-0000-4000-8000-000000000001', 'TEST-SETTLEMENT-1', 'c0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'active', 100, '10000000-0000-4000-8000-000000000001');
insert into public.contract_obligations (id, crop_cycle_id, contract_id, payee_org_id, obligation_type, description, agreed_amount, status, created_by) values
('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'fertilizer', 'Test fertilizer', 10, 'secured', '10000000-0000-4000-8000-000000000001');
insert into public.settlements (id, contract_id, gross_amount, idempotency_key) values
('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 100, 'a0000000-0000-4000-8000-000000000011');

do $$ begin
  begin
    perform public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000001', 'prepare', 'a0000000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111');
    raise exception 'expected unauthorized transition to fail';
  exception when sqlstate '42501' then null; end;
end $$;

select public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000001', 'prepare', 'a0000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001');
select public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000001', 'prepare', 'a0000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001');
do $$ declare event_count integer; allocation_total numeric; begin
  select count(*) into event_count from public.settlement_events where settlement_id = 'f0000000-0000-4000-8000-000000000001';
  select sum(amount) into allocation_total from public.settlement_allocations where settlement_id = 'f0000000-0000-4000-8000-000000000001';
  if event_count <> 1 then raise exception 'duplicate prepare created % events', event_count; end if;
  if allocation_total <> 100 then raise exception 'prepared allocations do not balance: %', allocation_total; end if;
end $$;

insert into public.organization_memberships (organization_id, user_id, role) values
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'admin');
select public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000001', 'verify', 'a0000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001');
select public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000001', 'approve', 'a0000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001');
select public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000001', 'execute', 'a0000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001');
select public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000001', 'execute', 'a0000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001');
do $$ declare event_count integer; begin
  select count(*) into event_count from public.settlement_events where settlement_id = 'f0000000-0000-4000-8000-000000000001' and event_type = 'simulation_completed';
  if event_count <> 1 then raise exception 'duplicate execute created % completion events', event_count; end if;
end $$;

insert into public.crop_cycles (id, farmer_org_id, crop_id, expected_quantity, estimated_value, created_by) values
('c0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, 100, '10000000-0000-4000-8000-000000000001');
insert into public.contracts (id, public_reference, crop_cycle_id, buyer_org_id, seller_org_id, status, committed_amount, created_by) values
('d0000000-0000-4000-8000-000000000002', 'TEST-SETTLEMENT-2', 'c0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'active', 100, '10000000-0000-4000-8000-000000000001');
insert into public.contract_obligations (id, crop_cycle_id, contract_id, payee_org_id, obligation_type, description, agreed_amount, status, created_by) values
('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'fertilizer', 'Over-limit obligation', 101, 'secured', '10000000-0000-4000-8000-000000000001');
insert into public.settlements (id, contract_id, gross_amount, idempotency_key) values
('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 100, 'a0000000-0000-4000-8000-000000000017');
do $$ begin
  begin
    perform public.advance_simulated_settlement('f0000000-0000-4000-8000-000000000002', 'prepare', 'a0000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000001');
    raise exception 'expected unbalanced settlement to fail';
  exception when sqlstate 'P0001' then
    if position('does not cover locked obligations' in sqlerrm) = 0 then raise; end if;
  end;
end $$;

rollback;
