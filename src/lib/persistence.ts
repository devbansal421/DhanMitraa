import type { Crop, OfflineTx } from '@/types';
import type { WalletMeta, WalletTx } from '@/lib/payments';

const STORAGE_KEYS = {
  crops: 'dhanmitraa:crops:v1',
  offlineTransactions: 'dhanmitraa:offline-transactions:v1',
  preferences: 'dhanmitraa:preferences:v1',
  walletTransactions: 'dhanmitraa:wallet-transactions:v1',
  walletMeta: 'dhanmitraa:wallet-meta:v1',
} as const;

export interface UserPreferences {
  offlineMode: boolean;
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
    // The prototype remains usable when storage is unavailable or full.
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

export function loadWalletTransactions(fallback: WalletTx[]): WalletTx[] {
  const value = read<unknown>(STORAGE_KEYS.walletTransactions, fallback);
  return Array.isArray(value) ? (value as WalletTx[]) : fallback;
}

export function saveWalletTransactions(transactions: WalletTx[]) {
  write(STORAGE_KEYS.walletTransactions, transactions);
}

export function loadWalletMeta(fallback: WalletMeta): WalletMeta {
  const value = read<Partial<WalletMeta>>(STORAGE_KEYS.walletMeta, fallback);
  return {
    openingBalance: typeof value.openingBalance === 'number' ? value.openingBalance : fallback.openingBalance,
    seeded: value.seeded === true,
  };
}

export function saveWalletMeta(meta: WalletMeta) {
  write(STORAGE_KEYS.walletMeta, meta);
}
