-- Preserve pre-contract crop obligations, such as seed and pesticide commitments.
-- Existing contract obligations are backfilled from their contract.

alter table public.contract_obligations add column crop_cycle_id uuid references public.crop_cycles(id) on delete restrict;

update public.contract_obligations o
set crop_cycle_id = c.crop_cycle_id
from public.contracts c
where c.id = o.contract_id;

alter table public.contract_obligations alter column crop_cycle_id set not null;
alter table public.contract_obligations alter column contract_id drop not null;

create or replace function public.assert_obligation_contract_crop()
returns trigger language plpgsql set search_path = public as $$
declare contract_crop_id uuid;
begin
  if new.contract_id is null then return new; end if;
  select crop_cycle_id into contract_crop_id from public.contracts where id = new.contract_id;
  if contract_crop_id is distinct from new.crop_cycle_id then
    raise exception 'An obligation must belong to the same crop cycle as its contract';
  end if;
  return new;
end; $$;

create trigger obligations_contract_crop before insert or update on public.contract_obligations
for each row execute function public.assert_obligation_contract_crop();

create index obligations_crop_cycle_idx on public.contract_obligations(crop_cycle_id, status);

drop policy "obligations involved party read" on public.contract_obligations;
create policy "obligations involved party read" on public.contract_obligations for select using (
  public.is_org_member(payee_org_id)
  or exists (select 1 from public.crop_cycles cc where cc.id = crop_cycle_id and public.is_org_member(cc.farmer_org_id))
  or exists (select 1 from public.contracts c where c.id = contract_id and public.is_org_member(c.buyer_org_id))
  or public.is_admin()
);
