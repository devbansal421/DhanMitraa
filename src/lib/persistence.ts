import type { Crop, OfflineTx } from '@/types';
import type { OutboxTransfer, WalletTx } from '@/lib/payments';

const STORAGE_KEYS = {
  crops: 'dhanmitraa:crops:v1',
  offlineTransactions: 'dhanmitraa:offline-transactions:v1',
  preferences: 'dhanmitraa:preferences:v1',
  walletCache: 'dhanmitraa:wallet-cache:v2',
  walletOutbox: 'dhanmitraa:wallet-outbox:v1',
} as const;

export interface UserPreferences {
  offlineMode: boolean;
}

/** Last-known server wallet snapshot, so an offline reload still shows history. */
export interface WalletCache {
  balance: number;
  transactions: WalletTx[];
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app stays usable when storage is unavailable or full.
  }
}

export function loadCrops(fallback: Crop[]) {
  const value = read<unknown>(STORAGE_KEYS.crops, fallback);
  return Array.isArray(value) ? (value as Crop[]) : fallback;
}

export function saveCrops(crops: Crop[]) {
  write(STORAGE_KEYS.crops, crops);
}

export function loadOfflineTransactions(fallback: OfflineTx[]) {
  const value = read<unknown>(STORAGE_KEYS.offlineTransactions, fallback);
  return Array.isArray(value) ? (value as OfflineTx[]) : fallback;
}

export function saveOfflineTransactions(transactions: OfflineTx[]) {
  write(STORAGE_KEYS.offlineTransactions, transactions);
}

export function loadPreferences(): UserPreferences {
  const value = read<Partial<UserPreferences>>(STORAGE_KEYS.preferences, {});
  return { offlineMode: value.offlineMode === true };
}

export function savePreferences(preferences: UserPreferences) {
  write(STORAGE_KEYS.preferences, preferences);
}

export function loadWalletCache(): WalletCache | null {
  const value = read<Partial<WalletCache> | null>(STORAGE_KEYS.walletCache, null);
  if (!value || typeof value.balance !== 'number' || !Array.isArray(value.transactions)) return null;
  return { balance: value.balance, transactions: value.transactions as WalletTx[] };
}

export function saveWalletCache(cache: WalletCache) {
  write(STORAGE_KEYS.walletCache, cache);
}

export function loadWalletOutbox(): OutboxTransfer[] {
  const value = read<unknown>(STORAGE_KEYS.walletOutbox, []);
  return Array.isArray(value) ? (value as OutboxTransfer[]) : [];
}

export function saveWalletOutbox(outbox: OutboxTransfer[]) {
  write(STORAGE_KEYS.walletOutbox, outbox);
}
