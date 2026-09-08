import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

// Verifies a Razorpay Checkout success payload server-side before the client is
// allowed to trust it. Deploy: supabase functions deploy payments-verify
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
  if (userError || !user) {
    return Response.json({ error: 'A signed-in user is required' }, { status: 401, headers: corsHeaders });
  }

  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keySecret) {
    return Response.json({ error: 'Gateway not configured.', code: 'NOT_CONFIGURED' }, { status: 501, headers: corsHeaders });
  }

  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({ error: 'Missing payment fields.' }, { status: 400, headers: corsHeaders });
  }

  const expected = await hmacHex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
  const verified = timingSafeEqual(expected, razorpay_signature);

  if (verified) {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
      await admin.from('payment_orders')
        .update({ provider_payment_id: razorpay_payment_id, status: 'paid', updated_at: new Date().toISOString() })
        .eq('provider_order_id', razorpay_order_id)
        .then(({ error }) => { if (error) console.warn('payment_orders update skipped:', error.message); });
    }
  }

  return Response.json({ verified }, { status: verified ? 200 : 400, headers: corsHeaders });
});
