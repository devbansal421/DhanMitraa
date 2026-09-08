-- An organization may provide more than one business service. This is distinct
-- from organization_memberships, which defines a signed-in person's authority.

create table public.organization_roles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, role)
);

alter table public.organization_roles enable row level security;
create policy "organization roles authenticated read" on public.organization_roles
  for select to authenticated using (true);

-- Only the server/admin workflow may add or revoke a business role after its
-- verification checks are complete.
