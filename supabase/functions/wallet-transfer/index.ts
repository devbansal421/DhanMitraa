import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Kinds the browser is allowed to initiate. `settlement` / `adjustment` are
// server-internal (settlement payouts, seed grants) and never accepted here.
const KINDS = new Set(['send', 'obligation']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Closed-loop wallet transfer. The browser sends only:
 *   - who to pay: recipientOrgId OR recipientUserId (must be a real wallet holder)
 *   - amountPaise, kind ('send' | 'obligation'), an optional note / obligationId
 *   - a UUID idempotencyKey
 * The server resolves both wallets, then makes ONE atomic double-entry move via
 * public.wallet_transfer(). Overdrafts, unknown payees, and replays are rejected
 * in the database. No balance or resulting status is ever trusted from the client.
 */
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
    return Response.json({ error: 'A permanent signed-in account is required to move money.' }, { status: 401, headers: corsHeaders });
  }

  let body: {
    recipientOrgId?: string;
    recipientUserId?: string;
    amountPaise?: number;
    kind?: string;
    note?: string;
    obligationId?: string;
    idempotencyKey?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  const amountPaise = Math.round(Number(body.amountPaise));
  if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > 5_00_00_00_000) {
    return Response.json({ error: 'Enter an amount greater than ₹0.' }, { status: 400, headers: corsHeaders });
  }
  if (!KINDS.has(body.kind ?? '')) {
    return Response.json({ error: 'Unsupported transfer kind' }, { status: 400, headers: corsHeaders });
  }
  if (!UUID.test(body.idempotencyKey ?? '')) {
    return Response.json({ error: 'A UUID idempotencyKey is required' }, { status: 400, headers: corsHeaders });
  }
  if (body.obligationId && !UUID.test(body.obligationId)) {
    return Response.json({ error: 'Invalid obligationId' }, { status: 400, headers: corsHeaders });
  }
  const hasOrg = typeof body.recipientOrgId === 'string' && UUID.test(body.recipientOrgId);
  const hasUser = typeof body.recipientUserId === 'string' && UUID.test(body.recipientUserId);
  if (hasOrg === hasUser) {
    return Response.json({ error: 'Choose exactly one recipient (an organisation or a person).' }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Sender is always the caller's own wallet.
  const sender = await admin.rpc('wallet_account_for_user', { p_user: user.id });
  if (sender.error || !sender.data) {
    return Response.json({ error: 'Your wallet could not be opened.' }, { status: 400, headers: corsHeaders });
  }

  // Resolve the recipient. An org recipient must actually be a registered
  // participant (it has a row in organization_roles); a user recipient must
  // have a profile. This is what stops "paying" a name that does not exist.
  let recipientAccount: string | null = null;
  if (hasOrg) {
    const role = await admin.from('organization_roles').select('organization_id').eq('organization_id', body.recipientOrgId!).maybeSingle();
    if (role.error || !role.data) {
      return Response.json({ error: 'That organisation is not a verified participant in the network.' }, { status: 404, headers: corsHeaders });
    }
    const acct = await admin.rpc('wallet_account_for_org', { p_org: body.recipientOrgId });
    if (acct.error || !acct.data) {
      return Response.json({ error: 'The recipient wallet could not be opened.' }, { status: 400, headers: corsHeaders });
    }
    recipientAccount = acct.data as string;
  } else {
    const profile = await admin.from('profiles').select('id').eq('id', body.recipientUserId!).maybeSingle();
    if (profile.error || !profile.data) {
      return Response.json({ error: 'That account does not exist.' }, { status: 404, headers: corsHeaders });
    }
    const acct = await admin.rpc('wallet_account_for_user', { p_user: body.recipientUserId });
    if (acct.error || !acct.data) {
      return Response.json({ error: 'The recipient wallet could not be opened.' }, { status: 400, headers: corsHeaders });
    }
    recipientAccount = acct.data as string;
  }

  const { data, error } = await admin.rpc('wallet_transfer', {
    p_sender_account: sender.data,
    p_recipient_account: recipientAccount,
    p_amount_paise: amountPaise,
    p_kind: body.kind,
    p_note: (body.note ?? '').slice(0, 240) || null,
    p_obligation_id: body.obligationId ?? null,
    p_idempotency_key: body.idempotencyKey,
  });

  if (error) {
    const status =
      error.code === 'P0001' ? 409 :   // insufficient balance
      error.code === 'P0002' ? 404 :   // unknown wallet
      error.code === '22023' ? 400 :   // bad amount / same wallet
      error.code === '42501' ? 403 :   // permission
      400;
    const message =
      error.code === 'P0001' ? 'You do not have enough balance for this payment.' :
      error.message;
    return Response.json({ error: message, code: error.code }, { status, headers: corsHeaders });
  }

  return Response.json({
    reference: (data as Record<string, unknown>)?.reference ?? null,
    balancePaise: (data as Record<string, unknown>)?.sender_balance_paise ?? null,
    idempotent: (data as Record<string, unknown>)?.idempotent ?? false,
  }, { headers: corsHeaders });
});
