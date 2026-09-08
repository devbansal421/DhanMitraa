-- Network reputation is already visible to signed-in non-guest users. Permit
-- the matching display directory so the frontend can resolve organization
-- names for contract obligations, allocations, and participant cards.
-- The browser selects only id/display_name; legal onboarding documents remain
-- in private storage and settlement/payment writes remain server-only.

drop policy "organizations read member" on public.organizations;
create policy "organizations permanent-user directory read" on public.organizations
  for select to authenticated using (not public.is_anonymous_user());
