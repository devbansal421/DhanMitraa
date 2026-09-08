-- Guests are Supabase anonymous users (Postgres role: authenticated), not the
-- unauthenticated anon role. Keep them out of all shared domain data; today the
-- UI uses its existing mock-data fallback for the guest workspace.

create or replace function public.is_anonymous_user()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

drop policy "reference crops readable" on public.crops;
create policy "reference crops permanent-user read" on public.crops
  for select to authenticated using (not public.is_anonymous_user());

drop policy "reference seasons readable" on public.seasons;
create policy "reference seasons permanent-user read" on public.seasons
  for select to authenticated using (not public.is_anonymous_user());

drop policy "reputation authenticated read" on public.organization_reputation_summaries;
create policy "reputation permanent-user read" on public.organization_reputation_summaries
  for select to authenticated using (not public.is_anonymous_user());

drop policy "organization roles authenticated read" on public.organization_roles;
create policy "organization roles permanent-user read" on public.organization_roles
  for select to authenticated using (not public.is_anonymous_user());
