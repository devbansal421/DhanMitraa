import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@/store';
import type { Obligation } from '@/types';
import {
  makeReference,
  movementTotals,
  newUuid,
  rupeesToWords,
  sentenceCase,
  validateAmount,
  type DomainResult,
  type OutboxTransfer,
  type WalletTx,
} from '@/lib/payments';
import {
  loadWalletCache,
  loadWalletOutbox,
  saveWalletCache,
  saveWalletOutbox,
} from '@/lib/persistence';
import { loadWallet, transfer, WalletUnavailableError } from '@/services/walletRepository';

interface SendInput {
  recipientOrgId?: string;
  recipientUserId?: string;
  label: string;
  amount: number | string;
  note?: string;
}

interface Wallet {
  ready: boolean;
  online: boolean;
  /** True once a wallet has been provisioned and loaded for this account. */
  available: boolean;
  /** Non-fatal load/sync problem to surface, or null. */
  error: string | null;
  balance: number;
  transactions: WalletTx[];
  moneyIn: number;
  moneyOut: number;
  queuedCount: number;
  paidObligationIds: Set<string>;
  recentPayees: string[];
  spentToday: number;
  amountInWords: (amount: number) => string;
  sendMoney: (input: SendInput) => Promise<DomainResult<WalletTx>>;
  payObligation: (obligation: Obligation, cropName?: string) => Promise<DomainResult<WalletTx>>;
  refresh: () => void;
}

const WalletContext = createContext<Wallet | null>(null);

/** An offline-captured transfer, shown in the ledger as a queued outgoing row. */
function outboxToTx(item: OutboxTransfer): WalletTx {
  return {
    id: item.idempotencyKey,
    direction: 'out',
    kind: item.kind,
    amount: item.amountRupees,
    counterparty: item.counterpartyLabel,
    note: item.note,
    obligationId: item.obligationId,
    reference: makeReference(new Date(item.createdAt)),
    createdAt: item.createdAt,
    status: 'queued',
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { toast } = useStore();
  const [serverBalance, setServerBalance] = useState(0);
  const [serverTx, setServerTx] = useState<WalletTx[]>([]);
  const [outbox, setOutbox] = useState<OutboxTransfer[]>([]);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const syncing = useRef(false);

  // Hydrate from the last-known snapshot + outbox so the screen is usable
  // instantly and offline.
  useEffect(() => {
    const cache = loadWalletCache();
    if (cache) {
      setServerBalance(cache.balance);
      setServerTx(cache.transactions);
    }
    setOutbox(loadWalletOutbox());
    setReady(true);
  }, []);

  const persistOutbox = useCallback((next: OutboxTransfer[]) => {
    setOutbox(next);
    saveWalletOutbox(next);
  }, []);

  const refresh = useCallback(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    void loadWallet()
      .then((snapshot) => {
        setServerBalance(snapshot.balance);
        setServerTx(snapshot.transactions);
        setAvailable(true);
        setError(null);
        saveWalletCache({ balance: snapshot.balance, transactions: snapshot.transactions });
      })
      .catch((err: unknown) => {
        if (err instanceof WalletUnavailableError) {
          setAvailable(false);
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'The wallet could not be refreshed.');
        }
      });
  }, []);

  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  // Replay everything captured offline, once, when connectivity returns.
  const flushOutbox = useCallback(async () => {
    if (syncing.current) return;
    const pending = loadWalletOutbox();
    if (pending.length === 0) return;
    syncing.current = true;
    let failures = 0;
    try {
      for (const item of pending) {
        try {
          await transfer({
            kind: item.kind,
            recipientOrgId: item.recipientOrgId,
            recipientUserId: item.recipientUserId,
            amountRupees: item.amountRupees,
            note: item.note,
            obligationId: item.obligationId,
            idempotencyKey: item.idempotencyKey,
          });
        } catch {
          failures += 1;
        }
        const rest = loadWalletOutbox().filter((row) => row.idempotencyKey !== item.idempotencyKey);
        saveWalletOutbox(rest);
        setOutbox(rest);
      }
      toast(
        failures === 0 ? 'Offline payments synced.' : `${failures} offline payment(s) could not be completed.`,
        failures === 0 ? 'success' : 'warning',
      );
    } finally {
      syncing.current = false;
      refresh();
    }
  }, [toast, refresh]);

  useEffect(() => {
    const goOnline = () => { setOnline(true); void flushOutbox(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [flushOutbox]);

  const queuedTx = useMemo(() => outbox.map(outboxToTx), [outbox]);
  const transactions = useMemo(
    () => [...queuedTx].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).concat(serverTx),
    [queuedTx, serverTx],
  );
  const queuedOutTotal = useMemo(() => queuedTx.reduce((sum, tx) => sum + tx.amount, 0), [queuedTx]);
  const balance = Math.max(serverBalance - queuedOutTotal, 0);
  const { moneyIn, moneyOut } = useMemo(() => movementTotals(transactions), [transactions]);
  const queuedCount = outbox.length;

  const paidObligationIds = useMemo(
    () => new Set(transactions.filter((tx) => tx.kind === 'obligation' && tx.obligationId).map((tx) => tx.obligationId as string)),
    [transactions],
  );
  const recentPayees = useMemo(() => {
    const seen: string[] = [];
    for (const tx of transactions) {
      if (tx.direction !== 'out') continue;
      if (!seen.some((name) => name.toLowerCase() === tx.counterparty.toLowerCase())) seen.push(tx.counterparty);
      if (seen.length >= 6) break;
    }
    return seen;
  }, [transactions]);
  const spentToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return transactions
      .filter((tx) => tx.direction === 'out' && new Date(tx.createdAt) >= start)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const runTransfer = useCallback(
    async (
      kind: 'send' | 'obligation',
      amountRaw: number | string,
      recipient: { recipientOrgId?: string; recipientUserId?: string },
      label: string,
      note?: string,
      obligationId?: string,
    ): Promise<DomainResult<WalletTx>> => {
      const name = label.trim();
      if (!name) return { ok: false, message: 'Choose who this payment is for.' };
      if (!recipient.recipientOrgId && !recipient.recipientUserId) {
        return { ok: false, message: 'Choose a verified participant to pay.' };
      }
      const check = validateAmount(amountRaw, { balance });
      if (!check.ok) return check;

      const idempotencyKey = newUuid();
      const createdAt = new Date().toISOString();

      if (!online) {
        const item: OutboxTransfer = {
          idempotencyKey, kind, ...recipient, counterpartyLabel: name,
          amountRupees: check.value, note: note?.trim() || undefined, obligationId, createdAt,
        };
        persistOutbox([...loadWalletOutbox(), item]);
        return { ok: true, value: outboxToTx(item) };
      }

      try {
        const result = await transfer({
          kind, ...recipient, amountRupees: check.value, note: note?.trim() || undefined, obligationId, idempotencyKey,
        });
        setServerBalance(result.balance);
        refresh();
        return {
          ok: true,
          value: {
            id: idempotencyKey, direction: 'out', kind, amount: check.value, counterparty: name,
            note: note?.trim() || undefined, obligationId,
            reference: result.reference ?? makeReference(), createdAt, status: 'completed',
          },
        };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'The payment could not be completed.' };
      }
    },
    [balance, online, persistOutbox, refresh],
  );

  const sendMoney = useCallback<Wallet['sendMoney']>(
    ({ recipientOrgId, recipientUserId, label, amount, note }) =>
      runTransfer('send', amount, { recipientOrgId, recipientUserId }, label, note),
    [runTransfer],
  );

  const payObligation = useCallback<Wallet['payObligation']>(
    (obligation, cropName) => {
      if (paidObligationIds.has(obligation.id)) {
        return Promise.resolve({ ok: false, message: 'This obligation is already paid.' } as DomainResult<WalletTx>);
      }
      if (!obligation.partyOrgId) {
        return Promise.resolve({ ok: false, message: 'This obligation has no linked participant to pay.' } as DomainResult<WalletTx>);
      }
      const note = cropName ? `${obligation.label} · ${cropName}` : obligation.label;
      return runTransfer('obligation', obligation.amount, { recipientOrgId: obligation.partyOrgId }, obligation.party, note, obligation.id);
    },
    [paidObligationIds, runTransfer],
  );

  const amountInWords = useCallback((amount: number) => sentenceCase(rupeesToWords(amount)), []);

  const value = useMemo<Wallet>(
    () => ({
      ready, online, available, error, balance, transactions, moneyIn, moneyOut, queuedCount,
      paidObligationIds, recentPayees, spentToday, amountInWords, sendMoney, payObligation, refresh,
    }),
    [ready, online, available, error, balance, transactions, moneyIn, moneyOut, queuedCount,
      paidObligationIds, recentPayees, spentToday, amountInWords, sendMoney, payObligation, refresh],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
