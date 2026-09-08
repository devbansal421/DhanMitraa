export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export function formatINRShort(amount: number): string {
  if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(1) + 'Cr';
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000) return '₹' + (amount / 1000).toFixed(0) + 'k';
  return '₹' + amount;
}

export function formatINRCompact(amount: number): string {
  if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'k';
  return '₹' + amount;
}
