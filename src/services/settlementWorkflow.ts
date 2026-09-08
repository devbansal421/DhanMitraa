import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SettlementAction = 'prepare' | 'verify' | 'approve' | 'execute';

function newIdempotencyKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * `functions.invoke` collapses every non-2xx response into the same opaque
 * "Edge Function returned a non-2xx status code" message. The function's JSON
 * body carries the real reason (e.g. "Only an admin may approve …") and a code;
 * pull it out so callers can show something actionable.
 */
async function toReadableError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body.error === 'string') {
        return Object.assign(new Error(body.error), { code: body.code as string | undefined });
      }
    } catch {
      // Body was not JSON — fall through to the generic error.
    }
  }
  return error instanceof Error ? error : new Error('Could not reach the settlement service.');
}

/** Advances the server-authorized, simulation-only settlement state machine. */
export async function advanceSettlement(settlementId: string, action: SettlementAction) {
  const { data, error } = await supabase.functions.invoke('simulate-settlement', {
    body: { settlementId, action, idempotencyKey: newIdempotencyKey() },
  });
  if (error) throw await toReadableError(error);
  return data;
}
