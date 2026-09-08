/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
  /** 'razorpay' turns on the real (test-mode) payment gateway for "Add money". */
  readonly VITE_PAYMENTS_PROVIDER?: 'razorpay';
  /** 'supabase' makes the wallet server-backed (needs migration 202609080008). */
  readonly VITE_WALLET_BACKEND?: 'supabase' | 'local';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
