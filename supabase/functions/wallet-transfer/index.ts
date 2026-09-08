import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const KINDS = new Set(['send', 'obligation', 'adjustment']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Server-authorized wallet debit (Phase 2). Mirrors the pattern of
// simulate-settlement: the browser never sends a balance or a resulting status,
// only an amount, a kind, and a UUID idempotency key.
// Deploy: supabase functions deploy wallet-transfer
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user || user.is_anonymous) {
    return Response.json({ error: 'A permanent authenticated user is required' }, { status: 401, headers: corsHeaders });
  }

  let body: { amountPaise?: number; kind?: string; counterparty?: string; note?: string; idempotencyKey?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  const amountPaise = Math.round(Number(body.amountPaise));
  if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > 5_00_00_00_000) {
    return Response.json({ error: 'Invalid amount' }, { status: 400, headers: corsHeaders });
  }
  if (!KINDS.has(body.kind ?? '')) {
    return Response.json({ error: 'Invalid kind' }, { status: 400, headers: corsHeaders });
  }
  if (!uuid.test(body.idempotencyKey ?? '')) {
    return Response.json({ error: 'A UUID idempotencyKey is required' }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('wallet_debit', {
    p_user: user.id,
    p_amount_paise: amountPaise,
    p_kind: body.kind,
    p_counterparty: (body.counterparty ?? '').slice(0, 120),
    p_note: (body.note ?? '').slice(0, 240) || null,
    p_idempotency_key: body.idempotencyKey,
  });

  if (error) {
    const status = error.code === 'P0001' ? 409 : error.code === '42501' ? 403 : 400;
    return Response.json({ error: error.message, code: error.code }, { status, headers: corsHeaders });
  }

  return Response.json(data, { headers: corsHeaders });
});
