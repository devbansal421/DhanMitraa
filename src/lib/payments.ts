/**
 * Client-side payments domain for the DhanMitraa wallet.
 *
 * Everything here is a SIMULATION. No real money moves; there is no bank, UPI,
 * or payout provider connected. The module exists to model a trustworthy,
 * low-friction payment experience for farmers and rural businesses, and to give
 * the rest of the app a clean seam to swap for a server-backed wallet later
 * (see the roadmap in README).
 */

export type TxDirection = 'in' | 'out';

export type TxKind =
  | 'topup' // money added from a (simulated) bank / UPI source
  | 'send' // money sent to another participant
  | 'receive' // money received from a buyer or participant
  | 'obligation' // payment against a crop obligation
  | 'request'; // an outgoing "please pay me" request

export type TxStatus =
  | 'completed' // settled in the simulated ledger
  | 'queued' // captured offline, waiting to sync
  | 'pending'; // a request that has not been fulfilled yet

export interface WalletTx {
  id: string;
  direction: TxDirection;
  kind: TxKind;
  amount: number; // whole rupees, matching the rest of the app
  counterparty: string;
  note?: string;
  obligationId?: string;
  reference: string; // human-readable, e.g. DM-8F3K2P
  createdAt: string; // ISO timestamp
  status: TxStatus;
}

export interface WalletMeta {
  openingBalance: number;
  seeded: boolean;
}

export type DomainResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** A queued or completed transaction counts against/for the balance; a pending
 *  request does not move money until it is fulfilled. */
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

/* --- Sample ledger so the wallet looks alive on first open ----------------- */

export const SAMPLE_OPENING_BALANCE = 12_000;

export function sampleTransactions(reference: Date = new Date()): WalletTx[] {
  const daysAgo = (days: number) => {
    const date = new Date(reference);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };
  return [
    {
      id: newTxId(), direction: 'in', kind: 'receive', amount: 9_000,
      counterparty: 'Nova Agri Trading', note: 'Advance against wheat contract',
      reference: makeReference(), createdAt: daysAgo(12), status: 'completed',
    },
    {
      id: newTxId(), direction: 'out', kind: 'obligation', amount: 2_400,
      counterparty: 'Greenfield Fertilizers', note: 'Fertilizer top-up',
      reference: makeReference(), createdAt: daysAgo(9), status: 'completed',
    },
    {
      id: newTxId(), direction: 'out', kind: 'send', amount: 1_800,
      counterparty: 'Arun Logistics', note: 'Part payment for transport',
      reference: makeReference(), createdAt: daysAgo(5), status: 'completed',
    },
    {
      id: newTxId(), direction: 'in', kind: 'topup', amount: 2_000,
      counterparty: 'Bank account ••4471', note: 'Added money',
      reference: makeReference(), createdAt: daysAgo(3), status: 'completed',
    },
  ];
}
