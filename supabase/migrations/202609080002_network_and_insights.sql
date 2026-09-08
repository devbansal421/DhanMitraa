-- Network reputation and generated agricultural-finance insight records.
-- These tables are intentionally separate from contracts: their values are derived,
-- not a source of truth for payment, delivery, or settlement decisions.

create type public.insight_severity as enum ('low', 'medium', 'warning', 'healthy');

create table public.organization_reputation_summaries (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  reliability_percent numeric(5,2) not null check (reliability_percent between 0 and 100),
  completed_contracts integer not null default 0 check (completed_contracts >= 0),
  total_settled numeric(14,2) not null default 0 check (total_settled >= 0),
  currency char(3) not null default 'INR',
  contract_completion_percent numeric(5,2) not null check (contract_completion_percent between 0 and 100),
  payment_reliability_percent numeric(5,2) not null check (payment_reliability_percent between 0 and 100),
  delivery_reliability_percent numeric(5,2) not null check (delivery_reliability_percent between 0 and 100),
  dispute_rate_percent numeric(5,2) not null check (dispute_rate_percent between 0 and 100),
  calculated_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  subject_org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  severity public.insight_severity not null,
  description text not null check (char_length(trim(description)) > 0),
  inputs_snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at >= generated_at)
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  subject_org_id uuid not null references public.organizations(id) on delete cascade,
  insight_id uuid references public.insights(id) on delete set null,
  action_text text not null check (char_length(trim(action_text)) > 0),
  rank smallint not null default 0 check (rank >= 0),
  status text not null default 'open' check (status in ('open', 'dismissed', 'completed')),
  generated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index insights_subject_idx on public.insights(subject_org_id, generated_at desc);
create index recommendations_subject_idx on public.recommendations(subject_org_id, status, rank);

alter table public.organization_reputation_summaries enable row level security;
alter table public.insights enable row level security;
alter table public.recommendations enable row level security;

-- A signed-in user can inspect network reputation, but organization membership is
-- still required for private insights and recommendations.
create policy "reputation authenticated read" on public.organization_reputation_summaries
  for select to authenticated using (true);
create policy "insights subject member read" on public.insights
  for select using (public.is_org_member(subject_org_id) or public.is_admin());
create policy "recommendations subject member read" on public.recommendations
  for select using (public.is_org_member(subject_org_id) or public.is_admin());

-- Reputations and insights are calculated by scheduled jobs/Edge Functions using
-- service-role credentials; no browser write policy is deliberately provided.
