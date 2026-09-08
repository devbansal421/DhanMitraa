import { createClient } from 'npm:@supabase/supabase-js@2';

// Razorpay -> our server webhook. This is the RELIABLE path: even if the browser
// closes after payment, this fires and credits the wallet.
//
// Deploy: supabase functions deploy payments-webhook --no-verify-jwt
// Secret: RAZORPAY_WEBHOOK_SECRET  (set the same value in the Razorpay dashboard)
// In config.toml this function has verify_jwt = false — Razorpay is not a
// Supabase user; we authenticate the request by its signature instead.

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !serviceRoleKey) return new Response('Not configured', { status: 501 });

  const rawBody = await request.text();
  const signature = request.headers.get('X-Razorpay-Signature') ?? '';
  const expected = await hmacHex(secret, rawBody);
  if (!timingSafeEqual(expected, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; notes?: Record<string, string> } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  if (event.event !== 'payment.captured') {
    return new Response('Ignored', { status: 200 });
  }

  const payment = event.payload?.payment?.entity;
  const userId = payment?.notes?.user_id;
  const amountPaise = payment?.amount;
  const paymentId = payment?.id;
  if (!userId || !amountPaise || !paymentId) {
    return new Response('Incomplete payload', { status: 200 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey, { auth: { persistSession: false } });

  // Idempotent: derive a stable UUID from the payment id so a retried webhook
  // cannot double-credit the wallet.
  const digest = await hmacHex('dhanmitraa-ledger', paymentId); // 64 hex chars
  const idempotencyKey = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;

  const { error } = await admin.from('wallet_ledger').insert({
    account_user_id: userId,
    direction: 'credit',
    amount_paise: amountPaise,
    kind: 'topup',
    counterparty_label: 'UPI / card (Razorpay)',
    reference: `RZP-${paymentId.slice(-8).toUpperCase()}`,
    idempotency_key: idempotencyKey,
  });

  if (error && !/duplicate key|unique constraint/i.test(error.message)) {
    console.error('wallet_ledger credit failed', error.message);
    return new Response('Ledger write failed', { status: 500 });
  }

  await admin.from('payment_orders')
    .update({ provider_payment_id: paymentId, status: 'paid', updated_at: new Date().toISOString() })
    .eq('provider_order_id', payment?.order_id ?? '')
    .then(({ error: e }) => { if (e) console.warn('order update skipped', e.message); });

  return new Response('OK', { status: 200 });
});
