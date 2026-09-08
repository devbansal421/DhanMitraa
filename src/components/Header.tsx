import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { Wallet, Wifi, WifiOff, Play, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCurrentIdentity } from '@/components/AuthGate';
import { SettingsMenu } from '@/components/SettingsMenu';
import { useWallet } from '@/wallet';
import { useT } from '@/i18n';
import { formatINRShort } from '@/lib/format';

export function Header() {
  const { setDemoActive } = useStore();
  const { signOut } = useCurrentIdentity();
  const wallet = useWallet();
  const t = useT();
  const [signingOut, setSigningOut] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-base/70 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/wallet"
            className="flex items-center gap-2 rounded-md border border-line bg-ink-surface px-3 py-1.5 transition-colors hover:border-sage-300"
            title={t('header.openPayments')}
          >
            <Wallet className="h-4 w-4 text-gold-200" aria-hidden="true" />
            <span className="text-sm font-medium text-paper">{formatINRShort(wallet.balance)}</span>
            {wallet.queuedCount > 0 && (
              <span className="rounded-full bg-gold-200/20 px-1.5 text-[10px] font-medium text-gold-500">{wallet.queuedCount}</span>
            )}
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-ok-400 animate-pulse-soft' : 'bg-terra-400'}`} />
            <span className="eyebrow">{online ? t('header.networkAvailable') : t('header.noNetwork')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="btn btn-ghost cursor-default md:hidden" aria-label={online ? t('header.online') : t('header.offline')}>
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </span>

          <SettingsMenu />

          <button type="button" onClick={() => setDemoActive(true)} className="btn-gold">
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('header.runDemo')}</span>
          </button>

          <button type="button" onClick={handleSignOut} disabled={signingOut} className="btn btn-ghost" aria-label={t('header.logout')}>
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{signingOut ? t('header.loggingOut') : t('header.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
