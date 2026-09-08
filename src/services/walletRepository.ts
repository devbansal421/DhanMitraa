import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TxKind, WalletTx } from '@/lib/payments';
import { demoWallet } from '@/data/demoData';

/**
 * Reads and writes for the closed-loop wallet.
 *
 * Reads come straight from the RLS-protected `wallet_accounts` / `wallet_ledger`
 * tables (the caller can only ever see their own). The single write path is the
 * `wallet-transfer` Edge Function, which performs an atomic double-entry move in
 * Postgres.
 */

type AccountRow = { id: string; balance_paise: number };

type LedgerRow = {
  id: string;
  direction: 'credit' | 'debit';
  amount_paise: number;
  kind: TxKind;
  counterparty_label: string;
  note: string | null;
  reference: string;
  obligation_id: string | null;
  created_at: string;
};

function toTx(row: LedgerRow): WalletTx {
  return {
    id: row.id,
    direction: row.direction === 'credit' ? 'in' : 'out',
    kind: row.kind,
    amount: Math.round(row.amount_paise / 100),
    counterparty: row.counterparty_label || 'Unknown',
    note: row.note ?? undefined,
    obligationId: row.obligation_id ?? undefined,
    reference: row.reference,
    createdAt: row.created_at,
    status: 'completed',
  };
}

export interface WalletSnapshot {
  accountId: string;
  balance: number; // rupees
  transactions: WalletTx[];
}

export class WalletUnavailableError extends Error {}

/** Loads the signed-in user's wallet account + recent ledger. Falls back to an
 *  illustrative demo ledger when no wallet is provisioned yet. */
export async function loadWallet(): Promise<WalletSnapshot> {
  try {
    return await loadWalletFromDb();
  } catch {
    return { accountId: 'demo', balance: demoWallet.balance, transactions: demoWallet.transactions };
  }
}

async function loadWalletFromDb(): Promise<WalletSnapshot> {
  const account = await supabase
    .from('wallet_accounts')
    .select('id,balance_paise')
    .not('user_id', 'is', null)
    .maybeSingle();
  if (account.error) throw account.error;
  if (!account.data) throw new WalletUnavailableError('No wallet is provisioned for this account yet.');

  const { id, balance_paise } = account.data as AccountRow;
  const ledger = await supabase
    .from('wallet_ledger')
    .select('id,direction,amount_paise,kind,counterparty_label,note,reference,obligation_id,created_at')
    .eq('account_id', id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (ledger.error) throw ledger.error;

  return {
    accountId: id,
    balance: Math.round((balance_paise ?? 0) / 100),
    transactions: ((ledger.data ?? []) as LedgerRow[]).map(toTx),
  };
}

export interface TransferInput {
  kind: 'send' | 'obligation';
  recipientOrgId?: string;
  recipientUserId?: string;
  amountRupees: number;
  note?: string;
  obligationId?: string;
  idempotencyKey: string;
}

export interface TransferResult {
  reference: string | null;
  balance: number; // sender balance in rupees, after the move
  idempotent: boolean;
}

export async function transfer(input: TransferInput): Promise<TransferResult> {
  const { data, error } = await supabase.functions.invoke('wallet-transfer', {
    body: {
      recipientOrgId: input.recipientOrgId,
      recipientUserId: input.recipientUserId,
      amountPaise: Math.round(input.amountRupees * 100),
      kind: input.kind,
      note: input.note,
      obligationId: input.obligationId,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => ({}));
      throw new Error(payload?.error ?? 'The wallet service returned an error.');
    }
    throw error instanceof Error ? error : new Error('Could not reach the wallet service.');
  }
  return {
    reference: (data?.reference as string | null) ?? null,
    balance: Math.round(((data?.balancePaise as number | undefined) ?? 0) / 100),
    idempotent: Boolean(data?.idempotent),
  };
}
