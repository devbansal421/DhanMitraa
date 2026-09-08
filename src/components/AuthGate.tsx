import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { SettingsMenu } from '@/components/SettingsMenu';
import { useT } from '@/i18n';

type Mode = 'sign-in' | 'sign-up';

type CurrentIdentity = {
  displayName: string;
  isGuest: boolean;
  signOut: () => Promise<void>;
};

const AuthIdentityContext = createContext<CurrentIdentity>({ displayName: 'Account', isGuest: false, signOut: async () => {} });

export function useCurrentIdentity() {
  return useContext(AuthIdentityContext);
}

/** Email confirmations return here; the URL must be allowed by Supabase Auth. */
function authRedirectUrl() {
  return import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin;
}

function sessionDisplayName(session: Session | null) {
  const metadataName = session?.user.user_metadata?.display_name;
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return session?.user.email?.split('@')[0] || 'Account';
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(data.session);
        setConnectionError(error?.message ?? null);
        setLoading(false);
      }
    }).catch(() => {
      if (active) {
        setConnectionError('Unable to connect to authentication. Check your Supabase configuration and network connection.');
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setConnectionError(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-paper-muted">Connecting securely…</div>;
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return <AuthForm connectionError={connectionError} />;

  return (
    <AuthIdentityContext.Provider value={{ displayName: sessionDisplayName(session), isGuest: Boolean(session.user.is_anonymous), signOut }}>
      {children}
    </AuthIdentityContext.Provider>
  );
}

function AuthForm({ connectionError }: { connectionError: string | null }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: authRedirectUrl(),
        },
      });
    setPending(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === 'sign-up' && !result.data.session) {
      setMessage(t('auth.checkEmail'));
    }
  };

  const continueAsGuest = async () => {
    setPending(true);
    setMessage(null);
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: 'Guest' } },
    });
    setPending(false);
    if (error) setMessage(error.message);
  };

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-10">
      <SettingsMenu className="absolute right-4 top-4" />
      <section className="modal w-full max-w-md p-6 sm:p-8">
        <div className="section-num mb-3">DhanMitraa</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-paper">{mode === 'sign-in' ? t('auth.welcomeBack') : t('auth.createAccount')}</h1>
        <p className="mt-2 text-sm leading-6 text-paper-muted">{t('auth.tagline')}</p>

        {connectionError && <p role="alert" className="mt-5 rounded-md border border-terra-400/30 bg-terra-400/5 px-3 py-2 text-sm text-paper">{connectionError}</p>}

        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === 'sign-up' && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-paper">{t('auth.yourName')}</span>
              <input className="input" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper">{t('auth.email')}</span>
            <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper">{t('auth.password')}</span>
            <input className="input" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />
          </label>
          {message && <p role="alert" className="rounded-md border border-gold-300/40 bg-gold-50 px-3 py-2 text-sm text-paper">{message}</p>}
          <button className="btn-gold w-full" disabled={pending} type="submit">{pending ? t('auth.pleaseWait') : mode === 'sign-in' ? t('auth.signIn') : t('auth.createAccountBtn')}</button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-paper-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t('auth.or')}</div>
        <button type="button" className="btn w-full btn-ghost" disabled={pending} onClick={continueAsGuest}>
          {t('auth.continueAsGuest')}
        </button>
        <p className="mt-2 text-center text-xs leading-5 text-paper-muted">{t('auth.guestNote')}</p>
        <button type="button" className="mt-5 w-full text-sm text-sage-500 hover:text-paper" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage(null); }}>
          {mode === 'sign-in' ? t('auth.needAccount') : t('auth.haveAccount')}
        </button>
      </section>
    </main>
  );
}
