import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Wheat, FileText, Split, Users, BarChart3 } from 'lucide-react';
import { useCurrentIdentity } from '@/components/AuthGate';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n/en';

const navItems: { to: string; key: TranslationKey; num: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { to: '/', key: 'nav.overview', num: '01', icon: LayoutDashboard, end: true },
  { to: '/wallet', key: 'nav.payments', num: '02', icon: Wallet },
  { to: '/crops', key: 'nav.crops', num: '03', icon: Wheat },
  { to: '/contracts', key: 'nav.contracts', num: '04', icon: FileText },
  { to: '/settlement', key: 'nav.settlement', num: '05', icon: Split },
  { to: '/network', key: 'nav.network', num: '06', icon: Users },
  { to: '/insights', key: 'nav.insights', num: '07', icon: BarChart3 },
];

export function Sidebar() {
  const { displayName, isGuest } = useCurrentIdentity();
  const t = useT();
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <>
      <aside className="hidden w-56 shrink-0 h-screen sticky top-0 border-r border-line bg-ink-surface/90 backdrop-blur-md lg:flex lg:flex-col">
        <div className="px-5 pt-6 pb-8">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="w-8 h-8 text-gold-200" fill="none" aria-hidden="true">
              <path d="M16 4 C16 4, 8 10, 8 18 C8 24, 12 28, 16 28 C20 28, 24 24, 24 18 C24 10, 16 4, 16 4 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M16 10 L16 22 M12 16 L20 16 M12 19 L20 19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            </svg>
            <div>
              <div className="font-display text-base font-medium text-paper tracking-tight leading-none">DhanMitraa</div>
              <div className="eyebrow mt-1">Agri Finance OS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative ${isActive ? 'text-sage-500 bg-sage-50' : 'text-paper-dim hover:text-paper hover:bg-sage-50/70'}`}
              >
                {({ isActive }) => <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sage-500" />}
                  <span className={`font-mono text-[10px] ${isActive ? 'text-sage-400' : 'text-paper-faint group-hover:text-paper-muted'}`}>{item.num}</span>
                  <Icon className="w-4 h-4" strokeWidth={1.8} />
                  <span className="text-sm font-medium">{t(item.key)}</span>
                </>}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-line">
          <div className="flex items-center gap-3 px-2 py-2 rounded">
              <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center text-xs font-semibold text-paper">{initials || 'A'}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-paper truncate">{displayName}</div>
              <div className="text-[10px] text-paper-muted">{isGuest ? 'Guest preview — limited access' : 'Signed-in account'}</div>
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink-surface/95 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 backdrop-blur-md lg:hidden" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium transition-colors ${isActive ? 'text-sage-500 bg-sage-50' : 'text-paper-muted hover:bg-sage-50 hover:text-paper'}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              <span className="truncate max-w-full">{t(item.key)}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
