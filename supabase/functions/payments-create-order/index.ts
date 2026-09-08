import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Creates a Razorpay order. The secret key lives only here, never in the browser.
// Deploy with: supabase functions deploy payments-create-order
// Secrets:     RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET  (use TEST keys)
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return Response.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user || user.is_anonymous) {
    return Response.json({ error: 'A permanent authenticated user is required' }, { status: 401, headers: corsHeaders });
  }

  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) {
    return Response.json(
      { error: 'The payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.', code: 'NOT_CONFIGURED' },
      { status: 501, headers: corsHeaders },
    );
  }

  let body: { amount?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  const rupees = Math.round(Number(body.amount));
  if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100000) {
    return Response.json({ error: 'Enter an amount between ₹1 and ₹1,00,000.' }, { status: 400, headers: corsHeaders });
  }
  const amountPaise = rupees * 100;

  const auth = btoa(`${keyId}:${keySecret}`);
  let razorpayResponse: Response;
  try {
    razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: `topup_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, purpose: 'wallet_topup' },
      }),
    });
  } catch {
    return Response.json({ error: 'Could not reach the payment gateway.' }, { status: 502, headers: corsHeaders });
  }

  if (!razorpayResponse.ok) {
    const detail = await razorpayResponse.text();
    console.error('Razorpay order error', razorpayResponse.status, detail);
    return Response.json({ error: 'The payment gateway rejected the request.' }, { status: 502, headers: corsHeaders });
  }

  const order = await razorpayResponse.json();

  // Best-effort: record the pending order if the wallet tables exist.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    await admin.from('payment_orders').insert({
      user_id: user.id,
      provider: 'razorpay',
      provider_order_id: order.id,
      amount_paise: amountPaise,
      status: 'created',
    }).then(({ error }) => { if (error) console.warn('payment_orders insert skipped:', error.message); });
  }

  return Response.json(
    { orderId: order.id, amount: order.amount, currency: order.currency, keyId },
    { headers: corsHeaders },
  );
});
