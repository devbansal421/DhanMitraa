-- DEVELOPMENT ONLY. `supabase db reset` runs this after migrations locally.
-- Never run this in a live project: it creates a known-password demo account.
-- Email: ravi@dhanmitraa.local
-- Password: ChangeMe123!

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'ravi@dhanmitraa.local',
  crypt('ChangeMe123!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Ravi Kumar"}'::jsonb, now(), now()
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '{"sub":"10000000-0000-4000-8000-000000000001","email":"ravi@dhanmitraa.local"}'::jsonb,
  'email', 'ravi@dhanmitraa.local', now(), now()
) on conflict (provider, provider_id) do nothing;

-- The profile is normally created by the auth.users trigger. This makes the seed
-- resilient when it is re-run against a database that already had this auth user.
insert into public.profiles (id, display_name)
values ('10000000-0000-4000-8000-000000000001', 'Ravi Kumar')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name) values
  ('20000000-0000-4000-8000-000000000001', 'Ravi Kumar Farm', 'Ravi Kumar'),
  ('20000000-0000-4000-8000-000000000002', 'Greenfield Fertilizers Private Limited', 'Greenfield Fertilizers'),
  ('20000000-0000-4000-8000-000000000003', 'Arun Logistics', 'Arun Logistics'),
  ('20000000-0000-4000-8000-000000000004', 'Nova Agri Trading', 'Nova Agri Trading'),
  ('20000000-0000-4000-8000-000000000005', 'AgriTech Rentals', 'AgriTech Rentals'),
  ('20000000-0000-4000-8000-000000000006', 'Pioneer Foods', 'Pioneer Foods'),
  ('20000000-0000-4000-8000-000000000007', 'Local Labor Co-op', 'Local Labor Co-op'),
  ('20000000-0000-4000-8000-000000000008', 'CropShield Supplies', 'CropShield Supplies')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, is_owner) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'farmer', true)
on conflict do nothing;

insert into public.organization_roles (organization_id, role) values
  ('20000000-0000-4000-8000-000000000001', 'farmer'),
  ('20000000-0000-4000-8000-000000000002', 'supplier'),
  ('20000000-0000-4000-8000-000000000003', 'transporter'),
  ('20000000-0000-4000-8000-000000000004', 'buyer'),
  ('20000000-0000-4000-8000-000000000005', 'supplier'),
  ('20000000-0000-4000-8000-000000000006', 'buyer'),
  ('20000000-0000-4000-8000-000000000007', 'supplier'),
  ('20000000-0000-4000-8000-000000000008', 'supplier')
on conflict do nothing;

insert into public.crops (id, name, commodity_code, default_unit) values
  ('30000000-0000-4000-8000-000000000001', 'Wheat', 'WHEAT', 'tonne'),
  ('30000000-0000-4000-8000-000000000002', 'Cotton', 'COTTON', 'tonne'),
  ('30000000-0000-4000-8000-000000000003', 'Rice', 'RICE', 'tonne')
on conflict (id) do nothing;

insert into public.seasons (id, name, starts_on, ends_on) values
  ('40000000-0000-4000-8000-000000000001', 'Winter 2026', '2026-10-01', '2027-03-31'),
  ('40000000-0000-4000-8000-000000000002', 'Monsoon 2026', '2026-06-01', '2026-10-31'),
  ('40000000-0000-4000-8000-000000000003', 'Kharif 2026', '2026-06-01', '2026-11-30')
on conflict (id) do nothing;

insert into public.crop_cycles (
  id, farmer_org_id, crop_id, season_id, expected_quantity, quantity_unit,
  estimated_value, currency, maturity_percent, expected_harvest_on, lifecycle_stage, created_by
) values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 4.3, 'tonne', 116100, 'INR', 78, '2026-12-18', 'growing', '10000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 2.1, 'tonne', 84000, 'INR', 42, '2027-02-15', 'inputs_acquired', '10000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 5.8, 'tonne', 143000, 'INR', 91, '2027-01-02', 'buyer_commitment', '10000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.contracts (id, public_reference, crop_cycle_id, buyer_org_id, seller_org_id, status, committed_amount, currency, expected_delivery_on, created_by) values
  ('60000000-0000-4000-8000-000000000001', 'A7F92', '50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'active', 116100, 'INR', '2026-12-18', '10000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002', 'B3C41', '50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'active', 143000, 'INR', '2027-01-02', '10000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.contract_obligations (id, crop_cycle_id, contract_id, payee_org_id, obligation_type, description, agreed_amount, currency, status, sort_order, created_by) values
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'fertilizer', 'Fertilizer', 20000, 'INR', 'secured', 1, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'machinery', 'Machinery', 8000, 'INR', 'secured', 2, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'transport', 'Transport', 5000, 'INR', 'pending_acceptance', 3, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007', 'labor', 'Labor', 7000, 'INR', 'secured', 4, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000002', null, '20000000-0000-4000-8000-000000000002', 'seed', 'Seeds', 12000, 'INR', 'secured', 1, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000002', null, '20000000-0000-4000-8000-000000000008', 'pesticide', 'Pesticide', 6500, 'INR', 'pending_acceptance', 2, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000007', '50000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'fertilizer', 'Fertilizer', 22000, 'INR', 'secured', 1, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000008', '50000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'machinery', 'Machinery', 10000, 'INR', 'secured', 2, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000009', '50000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'transport', 'Transport', 7000, 'INR', 'secured', 3, '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000007', 'labor', 'Labor', 9000, 'INR', 'secured', 4, '10000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

-- Read-only settlement record for the frontend simulation. No payment intent,
-- provider transfer, or money movement is seeded or performed by the browser.
insert into public.settlements (id, contract_id, status, gross_amount, currency, approval_required, idempotency_key) values
  ('a0000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'awaiting_verification', 116100, 'INR', true, 'a1000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.settlement_allocations (id, settlement_id, recipient_org_id, obligation_id, allocation_kind, amount, payout_status) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 'obligation', 20000, 'created'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000002', 'obligation', 8000, 'created'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', 'obligation', 5000, 'created'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000004', 'obligation', 7000, 'created'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', null, 'farmer_proceeds', 76100, 'created')
on conflict (id) do nothing;

insert into public.organization_reputation_summaries (organization_id, reliability_percent, completed_contracts, total_settled, contract_completion_percent, payment_reliability_percent, delivery_reliability_percent, dispute_rate_percent) values
  ('20000000-0000-4000-8000-000000000002', 96, 184, 1240000, 98, 96, 97, 2),
  ('20000000-0000-4000-8000-000000000003', 93, 67, 480000, 94, 92, 95, 4),
  ('20000000-0000-4000-8000-000000000004', 97, 312, 3850000, 99, 97, 95, 1),
  ('20000000-0000-4000-8000-000000000005', 91, 142, 720000, 93, 90, 92, 5),
  ('20000000-0000-4000-8000-000000000006', 94, 201, 2760000, 96, 95, 93, 3),
  ('20000000-0000-4000-8000-000000000007', 89, 98, 340000, 91, 88, 90, 6)
on conflict (organization_id) do nothing;

insert into public.insights (id, subject_org_id, title, severity, description) values
  ('80000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Cash-Flow Risk', 'low', 'Your current crop commitments are within a healthy range relative to projected harvest value.'),
  ('80000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Buyer Concentration', 'medium', '82% of your expected revenue currently depends on one buyer.'),
  ('80000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Transport Cost', 'warning', 'Your transport commitment is 38% above the estimated regional benchmark.')
on conflict (id) do nothing;

insert into public.recommendations (id, subject_org_id, action_text, rank) values
  ('90000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Diversify your buyer network', 1),
  ('90000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Review transport contract', 2),
  ('90000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Maintain ₹15,000 liquidity buffer', 3)
on conflict (id) do nothing;

-- Closed-loop wallet: opening balances. Every credit is a labelled, auditable
-- grant — the only way money enters this demo. `wallet_grant` is idempotent on
-- its key, so re-running the seed does not double-credit.
select public.wallet_grant(
  public.wallet_account_for_user('10000000-0000-4000-8000-000000000001'),
  1800000, 'Advance from Nova Agri Trading — wheat contract A7F92',
  'c1000000-0000-4000-8000-000000000001');
select public.wallet_grant(
  public.wallet_account_for_org('20000000-0000-4000-8000-000000000004'),
  50000000, 'Buyer operating float (demo seed)',
  'c1000000-0000-4000-8000-000000000002');
select public.wallet_grant(
  public.wallet_account_for_org('20000000-0000-4000-8000-000000000006'),
  50000000, 'Buyer operating float (demo seed)',
  'c1000000-0000-4000-8000-000000000003');
