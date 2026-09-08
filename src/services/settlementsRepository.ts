import { supabase } from '@/lib/supabase';
import { toQueryError } from '@/services/queryState';
import { demoSettlements } from '@/data/demoData';

export type SettlementRecord = { id: string; contractReference: string; grossAmount: number; status: string; approvalRequired: boolean; allocations: { id: string; recipient: string; amount: number; status: string; kind: string }[] };
type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const number = (value: unknown) => typeof value === 'number' ? value : Number(value || 0);

export async function listSettlements(): Promise<SettlementRecord[]> {
  try {
    const list = await listSettlementsFromDb();
    return list.length ? list : demoSettlements;
  } catch {
    return demoSettlements;
  }
}

async function listSettlementsFromDb(): Promise<SettlementRecord[]> {
  const { data: settlementData, error: settlementError } = await supabase.from('settlements').select('*').order('created_at', { ascending: false });
  if (settlementError) throw toQueryError(settlementError);
  const settlements = rows(settlementData);
  if (!settlements.length) return [];
  const ids = settlements.map((row) => text(row.id));
  const contractIds = settlements.map((row) => text(row.contract_id));
  const [allocationsResult, contractsResult] = await Promise.all([
    supabase.from('settlement_allocations').select('*').in('settlement_id', ids),
    supabase.from('contracts').select('id,public_reference').in('id', contractIds),
  ]);
  if (allocationsResult.error) throw toQueryError(allocationsResult.error);
  if (contractsResult.error) throw toQueryError(contractsResult.error);
  const allocations = rows(allocationsResult.data);
  const recipientIds = allocations.map((row) => text(row.recipient_org_id));
  const { data: organizationsData, error: organizationsError } = recipientIds.length ? await supabase.from('organizations').select('id,display_name').in('id', recipientIds) : { data: [], error: null };
  if (organizationsError) throw toQueryError(organizationsError);
  const recipients = new Map(rows(organizationsData).map((row) => [text(row.id), text(row.display_name)]));
  const contracts = new Map(rows(contractsResult.data).map((row) => [text(row.id), text(row.public_reference)]));
  return settlements.map((settlement) => ({ id: text(settlement.id), contractReference: contracts.get(text(settlement.contract_id)) || 'Unknown', grossAmount: number(settlement.gross_amount), status: text(settlement.status), approvalRequired: Boolean(settlement.approval_required), allocations: allocations.filter((allocation) => allocation.settlement_id === settlement.id).map((allocation) => ({ id: text(allocation.id), recipient: recipients.get(text(allocation.recipient_org_id)) || 'Unknown recipient', amount: number(allocation.amount), status: text(allocation.payout_status), kind: text(allocation.allocation_kind) })) }));
}
