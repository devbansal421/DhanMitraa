import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '@/store';
import type { Obligation } from '@/types';
import {
  balanceOf,
  makeReference,
  movementTotals,
  newTxId,
  rupeesToWords,
  sampleTransactions,
  sentenceCase,
  validateAmount,
  SAMPLE_OPENING_BALANCE,
  type DomainResult,
  type WalletMeta,
  type WalletTx,
} from '@/lib/payments';
import {
  loadWalletMeta,
  loadWalletTransactions,
  saveWalletMeta,
  saveWalletTransactions,
} from '@/lib/persistence';
import { isServerWallet, loadServerWallet, serverDebit, type ServerTransferKind } from '@/services/walletRepository';

interface SendInput { to: string; amount: number | string; note?: string }
interface RequestInput { from: string; amount: number | string; note?: string }

interface Wallet {
  ready: boolean;
  online: boolean;
  /** true once the Phase-2 server wallet has loaded successfully. */
  serverActive: boolean;
  balance: number;
  openingBalance: number;
  transactions: WalletTx[];
  moneyIn: number;
  moneyOut: number;
  queuedCount: number;
  paidObligationIds: Set<string>;
  recentPayees: string[];
  spentToday: number;
  amountInWords: (amount: number) => string;
  addMoney: (amount: number | string, source?: string) => DomainResult<WalletTx>;
  sendMoney: (input: SendInput) => DomainResult<WalletTx>;
  requestMoney: (input: RequestInput) => DomainResult<WalletTx>;
  payObligation: (obligation: Obligation, cropName?: string) => DomainResult<WalletTx>;
  markRequestReceived: (id: string) => void;
  resetWallet: () => void;
  /** Re-pull the server wallet (after a gateway top-up, or on reconnect). */
  refreshServer: () => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERVER_KINDS: Record<WalletTx['kind'], ServerTransferKind | null> = {
  send: 'send', obligation: 'obligation', topup: null, receive: null, request: null,
};

const WalletContext = createContext<Wallet | null>(null);

const EMPTY_META: WalletMeta = { openingBalance: SAMPLE_OPENING_BALANCE, seeded: false };

export function WalletProvider({ children }: { children: ReactNode }) {
  const { toast } = useStore();
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [meta, setMeta] = useState<WalletMeta>(EMPTY_META);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [serverActive, setServerActive] = useState(false);
  const [serverBalance, setServerBalance] = useState(0);

  // Load persisted ledger once, seeding a sample history on first ever open so
  // the screen is not empty during a demo.
  useEffect(() => {
    const storedMeta = loadWalletMeta(EMPTY_META);
    if (storedMeta.seeded) {
      setMeta(storedMeta);
      setTransactions(loadWalletTransactions([]));
    } else {
      const seeded = sampleTransactions();
      const nextMeta: WalletMeta = { openingBalance: SAMPLE_OPENING_BALANCE, seeded: true };
      setMeta(nextMeta);
      setTransactions(seeded);
      saveWalletMeta(nextMeta);
      saveWalletTransactions(seeded);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveWalletTransactions(transactions);
  }, [ready, transactions]);

  useEffect(() => {
    if (ready) saveWalletMeta(meta);
  }, [ready, meta]);

  // Phase 2: if the server wallet is enabled and reachable, it becomes the
  // source of truth. Any failure (flag off, migration not applied, offline,
  // guest) silently leaves the localStorage simulation in charge.
  const refreshServer = useCallback(() => {
    if (!isServerWallet()) return;
    void loadServerWallet()
      .then((snapshot) => {
        setServerActive(true);
        setServerBalance(snapshot.balance);
        setTransactions(snapshot.transactions);
      })
      .catch(() => setServerActive(false));
  }, []);

  useEffect(() => { refreshServer(); }, [refreshServer]);

  // When connectivity returns, "sync" anything captured offline.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setTransactions((current) => {
        if (!current.some((tx) => tx.status === 'queued')) return current;
        const synced = current.map((tx) => (tx.status === 'queued' ? { ...tx, status: 'completed' as const } : tx));
        toast('Offline payments synced.', 'success');
        return synced;
      });
      refreshServer();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [toast, refreshServer]);

  const localBalance = useMemo(() => balanceOf(meta.openingBalance, transactions), [meta.openingBalance, transactions]);
  const balance = serverActive ? serverBalance : localBalance;

  // In server mode, push each debit to the server and reconcile. On failure the
  // optimistic local row is rolled back.
  const mirrorDebit = useCallback((tx: WalletTx) => {
    const kind = SERVER_KINDS[tx.kind];
    if (!kind) return;
    const idempotencyKey = UUID_RE.test(tx.id) ? tx.id : crypto.randomUUID();
    void serverDebit({ amountRupees: tx.amount, kind, counterparty: tx.counterparty, note: tx.note, idempotencyKey })
      .then((res) => setServerBalance(res.balance))
      .catch((error: unknown) => {
        setTransactions((current) => current.filter((item) => item.id !== tx.id));
        toast(error instanceof Error ? error.message : 'The payment could not be completed.', 'warning');
      });
  }, [toast]);
  const { moneyIn, moneyOut } = useMemo(() => movementTotals(transactions), [transactions]);
  const queuedCount = useMemo(() => transactions.filter((tx) => tx.status === 'queued').length, [transactions]);
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
      .filter((tx) => tx.direction === 'out' && tx.status !== 'pending' && new Date(tx.createdAt) >= start)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const record = useCallback((tx: WalletTx) => {
    setTransactions((current) => [tx, ...current]);
  }, []);

  const spend = useCallback(
    (kind: WalletTx['kind'], amountRaw: number | string, counterparty: string, note?: string, obligationId?: string): DomainResult<WalletTx> => {
      const name = counterparty.trim();
      if (!name) return { ok: false, message: 'Enter who this payment is for.' };
      const check = validateAmount(amountRaw, { balance });
      if (!check.ok) return check;
      const tx: WalletTx = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : newTxId(),
        direction: 'out',
        kind,
        amount: check.value,
        counterparty: name,
        note: note?.trim() || undefined,
        obligationId,
        reference: makeReference(),
        createdAt: new Date().toISOString(),
        status: online ? 'completed' : 'queued',
      };
      record(tx);
      if (serverActive && online) mirrorDebit(tx);
      return { ok: true, value: tx };
    },
    [balance, online, record, serverActive, mirrorDebit],
  );

  const addMoney = useCallback<Wallet['addMoney']>(
    (amountRaw, source) => {
      const check = validateAmount(amountRaw, { requirePositive: false });
      if (!check.ok) return check;
      const tx: WalletTx = {
        id: newTxId(),
        direction: 'in',
        kind: 'topup',
        amount: check.value,
        counterparty: source?.trim() || 'Bank / UPI (simulation)',
        note: 'Added money',
        reference: makeReference(),
        createdAt: new Date().toISOString(),
        status: 'completed',
      };
      record(tx);
      if (serverActive) {
        // A real top-up is credited server-side by the gateway webhook; show it
        // immediately, then reconcile.
        setServerBalance((current) => current + check.value);
        window.setTimeout(() => refreshServer(), 1500);
      }
      return { ok: true, value: tx };
    },
    [record, serverActive, refreshServer],
  );

  const sendMoney = useCallback<Wallet['sendMoney']>(
    ({ to, amount, note }) => spend('send', amount, to, note),
    [spend],
  );

  const payObligation = useCallback<Wallet['payObligation']>(
    (obligation, cropName) => {
      if (paidObligationIds.has(obligation.id)) {
        return { ok: false, message: 'This obligation is already paid in the wallet.' };
      }
      const note = cropName ? `${obligation.label} · ${cropName}` : obligation.label;
      return spend('obligation', obligation.amount, obligation.party, note, obligation.id);
    },
    [paidObligationIds, spend],
  );

  const requestMoney = useCallback<Wallet['requestMoney']>(
    ({ from, amount, note }) => {
      const name = from.trim();
      if (!name) return { ok: false, message: 'Enter who you are requesting from.' };
      const check = validateAmount(amount, { requirePositive: false });
      if (!check.ok) return check;
      const tx: WalletTx = {
        id: newTxId(),
        direction: 'in',
        kind: 'request',
        amount: check.value,
        counterparty: name,
        note: note?.trim() || 'Payment request',
        reference: makeReference(),
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      record(tx);
      return { ok: true, value: tx };
    },
    [record],
  );

  const markRequestReceived = useCallback((id: string) => {
    setTransactions((current) =>
      current.map((tx) => (tx.id === id && tx.kind === 'request' ? { ...tx, status: 'completed' as const } : tx)),
    );
  }, []);

  const resetWallet = useCallback(() => {
    if (serverActive) {
      toast('The server wallet keeps a permanent ledger and cannot be reset here.', 'info');
      refreshServer();
      return;
    }
    const seeded = sampleTransactions();
    const nextMeta: WalletMeta = { openingBalance: SAMPLE_OPENING_BALANCE, seeded: true };
    setMeta(nextMeta);
    setTransactions(seeded);
    toast('Wallet reset to the sample ledger.', 'info');
  }, [toast, serverActive, refreshServer]);

  const amountInWords = useCallback((amount: number) => sentenceCase(rupeesToWords(amount)), []);

  const value = useMemo<Wallet>(
    () => ({
      ready,
      online,
      serverActive,
      balance,
      openingBalance: meta.openingBalance,
      transactions,
      moneyIn,
      moneyOut,
      queuedCount,
      paidObligationIds,
      recentPayees,
      spentToday,
      amountInWords,
      addMoney,
      sendMoney,
      requestMoney,
      payObligation,
      markRequestReceived,
      resetWallet,
      refreshServer,
    }),
    [ready, online, serverActive, balance, meta.openingBalance, transactions, moneyIn, moneyOut, queuedCount, paidObligationIds, recentPayees, spentToday, amountInWords, addMoney, sendMoney, requestMoney, payObligation, markRequestReceived, resetWallet, refreshServer],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
