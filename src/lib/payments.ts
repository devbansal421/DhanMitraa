/**
 * Client-side payments domain for the DhanMitraa wallet.
 *
 * The wallet is a real, server-authoritative closed-loop ledger (see
 * supabase/migrations/202609090001_wallet_closed_loop.sql). This module holds
 * only pure, framework-free helpers: amount validation, Indian-numbering words,
 * and the derived read models the UI renders. Every balance-changing operation
 * happens in Postgres via the wallet-transfer Edge Function.
 */

export type TxDirection = 'in' | 'out';

export type TxKind =
  | 'topup' // credit from a settlement / gateway top-up
  | 'send' // money sent to another participant
  | 'receive' // money received from a participant
  | 'obligation' // payment against a crop obligation
  | 'request' // a "please pay me" request (record only)
  | 'settlement' // a harvest settlement payout
  | 'refund' // a reversed / refunded transfer
  | 'adjustment'; // a labelled opening balance / correction

export type TxStatus =
  | 'completed' // settled in the ledger
  | 'queued'; // captured offline, waiting to sync

export interface WalletTx {
  id: string;
  direction: TxDirection;
  kind: TxKind;
  amount: number; // whole rupees, matching the rest of the app
  counterparty: string;
  note?: string;
  obligationId?: string;
  reference: string; // e.g. DM-8F3K2P
  createdAt: string; // ISO timestamp
  status: TxStatus;
}

/** A transfer captured while offline, replayed (idempotently) on reconnect. */
export interface OutboxTransfer {
  idempotencyKey: string; // UUID — also the server-side idempotency key
  kind: 'send' | 'obligation';
  recipientOrgId?: string;
  recipientUserId?: string;
  counterpartyLabel: string;
  amountRupees: number;
  note?: string;
  obligationId?: string;
  createdAt: string;
}

export type DomainResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function affectsBalance(tx: WalletTx): boolean {
  return tx.status === 'completed' || tx.status === 'queued';
}

export function balanceOf(openingBalance: number, transactions: WalletTx[]): number {
  return transactions.reduce((running, tx) => {
    if (!affectsBalance(tx)) return running;
    return tx.direction === 'in' ? running + tx.amount : running - tx.amount;
  }, openingBalance);
}

export function movementTotals(transactions: WalletTx[]): { moneyIn: number; moneyOut: number } {
  return transactions.reduce(
    (totals, tx) => {
      if (!affectsBalance(tx)) return totals;
      if (tx.direction === 'in') totals.moneyIn += tx.amount;
      else totals.moneyOut += tx.amount;
      return totals;
    },
    { moneyIn: 0, moneyOut: 0 },
  );
}

export function validateAmount(
  raw: number | string,
  options: { balance?: number; requirePositive?: boolean } = {},
): DomainResult<number> {
  const amount = Math.round(Number(raw));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: 'Enter an amount greater than ₹0.' };
  }
  if (amount > 5_00_00_000) {
    return { ok: false, message: 'That amount is too large for a single payment.' };
  }
  if (options.requirePositive !== false && typeof options.balance === 'number' && amount > options.balance) {
    return { ok: false, message: `You only have ${formatPlainINR(options.balance)} available.` };
  }
  return { ok: true, value: amount };
}

export function makeReference(now: Date = new Date()): string {
  const stamp = now.getTime().toString(36).toUpperCase().slice(-4);
  const salt = Math.random().toString(36).toUpperCase().slice(2, 4);
  return `DM-${stamp}${salt}`;
}

export function newTxId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** RFC-4122 v4 — used as the server-side idempotency key for every transfer. */
export function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatPlainINR(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/* --- Amount in words (Indian numbering) — an accessibility + trust aid ------ */

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ` ${ONES[ones]}` : '');
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds ? `${ONES[hundreds]} hundred` : '';
  if (!rest) return head;
  return head ? `${head} ${underHundred(rest)}` : underHundred(rest);
}

export function rupeesToWords(value: number): string {
  let n = Math.round(Math.abs(value));
  if (n === 0) return 'zero rupees';

  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;

  const parts: string[] = [];
  if (crore) parts.push(`${underThousand(crore)} crore`);
  if (lakh) parts.push(`${underThousand(lakh)} lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} thousand`);
  if (n) parts.push(underThousand(n));

  return `${parts.join(' ').replace(/\s+/g, ' ').trim()} rupees`;
}

export function sentenceCase(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
