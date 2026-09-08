/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
  /** 'razorpay' turns on the optional test-mode payment gateway (not used by the
   *  closed-loop wallet; reserved for a future "fund from bank" step). */
  readonly VITE_PAYMENTS_PROVIDER?: 'razorpay';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
