import type { Crop, CropStage, Obligation } from '@/types';
import { supabase } from '@/lib/supabase';
import { toQueryError } from '@/services/queryState';
import { demoCrops } from '@/data/demoData';

type Row = Record<string, unknown>;
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const asText = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown): number => typeof value === 'number' ? value : Number(value || 0);
// The database tracks six obligation states; the read model only distinguishes
// "money is committed" from "still being arranged". `locked`/`paid` happen once a
// settlement is prepared or executed and must still count as secured. `cancelled`
// and `draft` obligations are not real commitments and are dropped entirely.
const SECURED_OBLIGATION_STATUSES = new Set(['secured', 'locked', 'paid']);
const HIDDEN_OBLIGATION_STATUSES = new Set(['cancelled', 'draft']);
const formatDate = (value: unknown) => {
  const date = asText(value);
  return date ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`)) : 'Not scheduled';
};

/** Browser-facing read model for crop and obligation screens. Falls back to
 *  illustrative demo content when the workspace has no crop cycles yet. */
export async function listCrops(): Promise<Crop[]> {
  try {
    const crops = await listCropsFromDb();
    return crops.length ? crops : demoCrops;
  } catch {
    return demoCrops;
  }
}

async function listCropsFromDb(): Promise<Crop[]> {
  const { data: cycleRows, error: cyclesError } = await supabase.from('crop_cycles').select('*').order('expected_harvest_on');
  if (cyclesError) throw toQueryError(cyclesError);
  const cycles = asRows(cycleRows);
  if (!cycles.length) return [];

  const cycleIds = cycles.map((row) => asText(row.id));
  const cropIds = cycles.map((row) => asText(row.crop_id));
  const seasonIds = cycles.map((row) => asText(row.season_id)).filter(Boolean);
  const [cropsResult, seasonsResult, obligationsResult, contractsResult] = await Promise.all([
    supabase.from('crops').select('id,name').in('id', cropIds),
    seasonIds.length ? supabase.from('seasons').select('id,name').in('id', seasonIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('contract_obligations').select('*').in('crop_cycle_id', cycleIds).order('sort_order'),
    supabase.from('contracts').select('*').in('crop_cycle_id', cycleIds),
  ]);
  for (const result of [cropsResult, seasonsResult, obligationsResult, contractsResult]) if (result.error) throw toQueryError(result.error);

  const obligations = asRows(obligationsResult.data);
  const payeeIds = obligations.map((row) => asText(row.payee_org_id));
  const buyerIds = asRows(contractsResult.data).map((row) => asText(row.buyer_org_id));
  const organizationIds = [...new Set([...payeeIds, ...buyerIds].filter(Boolean))];
  const { data: payees, error: payeesError } = organizationIds.length
    ? await supabase.from('organizations').select('id,display_name').in('id', organizationIds)
    : { data: [], error: null };
  if (payeesError) throw toQueryError(payeesError);
  const names = new Map(asRows(payees).map((row) => [asText(row.id), asText(row.display_name, 'Unknown participant')]));
  const cropNames = new Map(asRows(cropsResult.data).map((row) => [asText(row.id), asText(row.name)]));
  const seasonNames = new Map(asRows(seasonsResult.data).map((row) => [asText(row.id), asText(row.name, 'Unscheduled season')]));
  const contracts = new Map(asRows(contractsResult.data).map((row) => [asText(row.crop_cycle_id), row]));

  return cycles.map((cycle) => {
    const contract = contracts.get(asText(cycle.id));
    const cycleObligations: Obligation[] = obligations
      .filter((row) => row.crop_cycle_id === cycle.id && !HIDDEN_OBLIGATION_STATUSES.has(asText(row.status)))
      .map((row) => ({
        id: asText(row.id), label: asText(row.description, asText(row.obligation_type)), party: names.get(asText(row.payee_org_id)) || 'Unknown participant', partyOrgId: asText(row.payee_org_id), amount: asNumber(row.agreed_amount), status: SECURED_OBLIGATION_STATUSES.has(asText(row.status)) ? 'secured' : 'pending',
      }));
    return {
      id: asText(cycle.id), name: cropNames.get(asText(cycle.crop_id)) || 'Unnamed crop', season: seasonNames.get(asText(cycle.season_id)) || 'Unscheduled season', tonnes: asNumber(cycle.expected_quantity), estimatedValue: asNumber(cycle.estimated_value), maturity: asNumber(cycle.maturity_percent), expectedHarvestDate: formatDate(cycle.expected_harvest_on),
      stage: asText(cycle.lifecycle_stage, 'planted') as CropStage, obligations: cycleObligations,
      buyerCommitment: contract ? asNumber(contract.committed_amount) : undefined,
      buyer: contract ? names.get(asText(contract.buyer_org_id)) : undefined,
      contractId: contract ? asText(contract.public_reference) : undefined,
    } as Crop;
  });
}
