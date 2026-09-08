import type { WalletTx } from '@/lib/payments';

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build a plain-CSV wallet statement. Kept separate from the download so it can
 *  be unit-tested and reused (e.g. for a future email/export feature). */
export function buildStatementCsv(transactions: WalletTx[]): string {
  const header = ['Date', 'Type', 'Direction', 'Counterparty', 'Note', 'Amount (INR)', 'Status', 'Reference'];
  const rows = transactions.map((tx) => [
    new Date(tx.createdAt).toISOString(),
    tx.kind,
    tx.direction === 'in' ? 'credit' : 'debit',
    tx.counterparty,
    tx.note ?? '',
    tx.amount,
    tx.status,
    tx.reference,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadStatement(transactions: WalletTx[]) {
  const csv = buildStatementCsv(transactions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dhanmitraa-statement-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
