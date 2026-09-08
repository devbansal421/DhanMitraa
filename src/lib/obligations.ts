import type { Crop, Obligation, ObligationStatus } from '@/types';

export interface ObligationInput {
  label: string;
  party: string;
  amount: number;
  status: ObligationStatus;
}

export type DomainResult<T> = { ok: true; value: T } | { ok: false; message: string };

function validInput(input: ObligationInput): DomainResult<ObligationInput> {
  const label = input.label.trim();
  const party = input.party.trim();
  const amount = Number(input.amount);

  if (!label) return { ok: false, message: 'Enter an obligation name.' };
  if (!party) return { ok: false, message: 'Enter the party responsible for this obligation.' };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: 'Enter an amount greater than ₹0.' };

  return { ok: true, value: { label, party, amount: Math.round(amount), status: input.status } };
}

function obligationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `obligation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createObligation(crops: Crop[], cropId: string, input: ObligationInput): DomainResult<Crop[]> {
  const result = validInput(input);
  if (!result.ok) return result;

  const crop = crops.find((item) => item.id === cropId);
  if (!crop) return { ok: false, message: 'This crop is no longer available.' };

  const obligation: Obligation = { id: obligationId(), partyOrgId: '', ...result.value };
  return { ok: true, value: crops.map((item) => item.id === cropId ? { ...item, obligations: [...item.obligations, obligation] } : item) };
}

export function updateObligation(crops: Crop[], cropId: string, obligationId: string, input: ObligationInput): DomainResult<Crop[]> {
  const result = validInput(input);
  if (!result.ok) return result;

  const crop = crops.find((item) => item.id === cropId);
  if (!crop || !crop.obligations.some((item) => item.id === obligationId)) {
    return { ok: false, message: 'This obligation is no longer available.' };
  }

  return {
    ok: true,
    value: crops.map((item) => item.id === cropId
      ? { ...item, obligations: item.obligations.map((obligation) => obligation.id === obligationId ? { ...obligation, ...result.value } : obligation) }
      : item),
  };
}

export function deleteObligation(crops: Crop[], cropId: string, obligationId: string): DomainResult<Crop[]> {
  const crop = crops.find((item) => item.id === cropId);
  if (!crop || !crop.obligations.some((item) => item.id === obligationId)) {
    return { ok: false, message: 'This obligation is no longer available.' };
  }

  return {
    ok: true,
    value: crops.map((item) => item.id === cropId ? { ...item, obligations: item.obligations.filter((item) => item.id !== obligationId) } : item),
  };
}
