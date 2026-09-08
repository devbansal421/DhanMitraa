import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Real payment-gateway integration (Razorpay).
 *
 * DEFAULT: disabled — `VITE_PAYMENTS_PROVIDER` is unset, so the app uses the
 * built-in simulation for "Add money".
 *
 * TEST MODE: set `VITE_PAYMENTS_PROVIDER=razorpay` in the frontend and the
 * `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` secrets on the `payments-*` Edge
 * Functions. With Razorpay *test* keys this opens the real Razorpay Checkout,
 * takes test cards / UPI, and the server verifies the signature — but no real
 * money moves.
 *
 * GOING LIVE holds real customer funds in a wallet balance, which in India
 * requires an RBI Prepaid Payment Instrument licence or a licensed PPI / escrow
 * partner. Do not point live keys at this without that. See README.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export function paymentsProvider(): 'none' | 'razorpay' {
  return import.meta.env.VITE_PAYMENTS_PROVIDER === 'razorpay' ? 'razorpay' : 'none';
}

export function isGatewayEnabled() {
  return paymentsProvider() !== 'none';
}

let scriptPromise: Promise<void> | null = null;
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { scriptPromise = null; reject(new Error('Could not load the payment gateway.')); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export type GatewayErrorKind = 'not-configured' | 'offline' | 'dismissed' | 'generic';
export class GatewayError extends Error {
  kind: GatewayErrorKind;
  constructor(kind: GatewayErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

interface TopUpOptions {
  amountRupees: number;
  displayName?: string;
}

/**
 * Runs the full gateway round-trip and resolves with the verified amount in
 * rupees once the server confirms the signature. The caller then credits the
 * wallet (locally in simulation mode, or the webhook does it in server mode).
 */
export async function topUpViaGateway({ amountRupees, displayName }: TopUpOptions): Promise<{ amountRupees: number; paymentId: string }> {
  if (!navigator.onLine) throw new GatewayError('offline', 'No internet connection.');

  // 1. Ask our server to create the order (it holds the secret key).
  const orderResult = await supabase.functions.invoke('payments-create-order', {
    body: { amount: amountRupees },
  });
  if (orderResult.error) {
    if (orderResult.error instanceof FunctionsHttpError) {
      const status = orderResult.error.context.status;
      const payload = await orderResult.error.context.json().catch(() => ({}));
      if (status === 404 || status === 501 || payload?.code === 'NOT_CONFIGURED') {
        throw new GatewayError('not-configured', payload?.error ?? 'The payment gateway is not set up yet.');
      }
      throw new GatewayError('generic', payload?.error ?? 'Could not start the payment.');
    }
    throw new GatewayError('not-configured', 'The payment gateway function is not available.');
  }
  const order = orderResult.data as { orderId: string; amount: number; currency: string; keyId: string };

  // 2. Open Razorpay Checkout.
  await loadCheckoutScript();
  if (!window.Razorpay) throw new GatewayError('generic', 'The payment gateway did not load.');

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'DhanMitraa',
      description: 'Add money (test mode)',
      prefill: displayName ? { name: displayName } : undefined,
      theme: { color: '#173F35' },
      modal: { ondismiss: () => reject(new GatewayError('dismissed', 'Payment cancelled.')) },
      handler: (response) => {
        // 3. Verify the signature on our server before trusting it.
        supabase.functions
          .invoke('payments-verify', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          })
          .then(({ data, error }) => {
            if (error || !data?.verified) {
              reject(new GatewayError('generic', 'We could not verify that payment. If money was taken it will be refunded.'));
              return;
            }
            resolve({ amountRupees, paymentId: response.razorpay_payment_id });
          })
          .catch(() => reject(new GatewayError('generic', 'Verification failed. Please check your wallet in a few minutes.')));
      },
    });
    rzp.open();
  });
}
