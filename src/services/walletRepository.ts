import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { WalletTx } from '@/lib/payments';

/**
 * Phase 2 server-backed wallet reads/writes.
 *
 * Enabled only when `VITE_WALLET_BACKEND=supabase` AND the wallet migration
 * (202609080008_wallet.sql) has been applied. Otherwise the app uses the
 * localStorage simulation unchanged.
 */
export function isServerWallet() {
  return import.meta.env.VITE_WALLET_BACKEND === 'supabase';
}

type LedgerRow = {
  id: string;
  direction: 'credit' | 'debit';
  amount_paise: number;
  kind: WalletTx['kind'] | 'settlement' | 'adjustment';
  counterparty_label: string;
  note: string | null;
  reference: string;
  created_at: string;
};

function toTx(row: LedgerRow): WalletTx {
  const kind: WalletTx['kind'] =
    row.kind === 'settlement' ? 'receive' : row.kind === 'adjustment' ? 'topup' : row.kind;
  return {
    id: row.id,
    direction: row.direction === 'credit' ? 'in' : 'out',
    kind,
    amount: Math.round(row.amount_paise / 100),
    counterparty: row.counterparty_label || 'Unknown',
    note: row.note ?? undefined,
    reference: row.reference,
    createdAt: row.created_at,
    status: 'completed',
  };
}

export interface ServerWalletSnapshot {
  balance: number; // rupees
  transactions: WalletTx[];
}

/** Loads the current balance + recent ledger. Throws if the tables are absent. */
export async function loadServerWallet(): Promise<ServerWalletSnapshot> {
  const [account, ledger] = await Promise.all([
    supabase.from('wallet_accounts').select('balance_paise').maybeSingle(),
    supabase.from('wallet_ledger').select('id,direction,amount_paise,kind,counterparty_label,note,reference,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (account.error) throw account.error;
  if (ledger.error) throw ledger.error;

  return {
    balance: Math.round(((account.data?.balance_paise as number | undefined) ?? 0) / 100),
    transactions: ((ledger.data ?? []) as LedgerRow[]).map(toTx),
  };
}

export type ServerTransferKind = 'send' | 'obligation' | 'adjustment';

export async function serverDebit(input: {
  amountRupees: number;
  kind: ServerTransferKind;
  counterparty: string;
  note?: string;
  idempotencyKey: string;
}): Promise<{ balance: number; reference?: string }> {
  const { data, error } = await supabase.functions.invoke('wallet-transfer', {
    body: {
      amountPaise: Math.round(input.amountRupees * 100),
      kind: input.kind,
      counterparty: input.counterparty,
      note: input.note,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => ({}));
      throw new Error(payload?.error ?? 'The wallet service returned an error.');
    }
    throw error;
  }
  return {
    balance: Math.round(((data?.balance_paise as number | undefined) ?? 0) / 100),
    reference: data?.reference as string | undefined,
  };
}
