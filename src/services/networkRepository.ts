import type { Participant } from '@/types';
import { supabase } from '@/lib/supabase';
import { toQueryError } from '@/services/queryState';
import { demoParticipants } from '@/data/demoData';

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const number = (value: unknown) => typeof value === 'number' ? value : Number(value || 0);
const roleLabel: Record<string, Participant['type']> = { farmer: 'Farmer', buyer: 'Buyer', supplier: 'Supplier', transporter: 'Transporter' };

export async function listParticipants(): Promise<Participant[]> {
  try {
    const list = await listParticipantsFromDb();
    return list.length ? list : demoParticipants;
  } catch {
    return demoParticipants;
  }
}

async function listParticipantsFromDb(): Promise<Participant[]> {
  const { data: roleData, error: roleError } = await supabase.from('organization_roles').select('organization_id,role');
  if (roleError) throw toQueryError(roleError);
  const roles = rows(roleData).filter((row) => roleLabel[text(row.role)]);
  if (!roles.length) return [];
  const ids = [...new Set(roles.map((row) => text(row.organization_id)))];
  const [organizationsResult, reputationResult] = await Promise.all([
    supabase.from('organizations').select('id,display_name').in('id', ids),
    supabase.from('organization_reputation_summaries').select('*').in('organization_id', ids),
  ]);
  if (organizationsResult.error) throw toQueryError(organizationsResult.error);
  if (reputationResult.error) throw toQueryError(reputationResult.error);
  const orgNames = new Map(rows(organizationsResult.data).map((row) => [text(row.id), text(row.display_name)]));
  const scores = new Map(rows(reputationResult.data).map((row) => [text(row.organization_id), row]));
  return roles.map((role) => {
    const score = scores.get(text(role.organization_id));
    return {
      id: text(role.organization_id), name: orgNames.get(text(role.organization_id)) || 'Unknown participant', type: roleLabel[text(role.role)], reliability: number(score?.reliability_percent), completedContracts: number(score?.completed_contracts), totalSettled: number(score?.total_settled),
      metrics: { contractCompletion: number(score?.contract_completion_percent), paymentReliability: number(score?.payment_reliability_percent), deliveryReliability: number(score?.delivery_reliability_percent), disputeRate: number(score?.dispute_rate_percent) },
    };
  });
}
