import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const actions = new Set(['prepare', 'verify', 'approve', 'execute']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });

  const authorization = request.headers.get('Authorization');
  if (!authorization) return Response.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user || user.is_anonymous) return Response.json({ error: 'A permanent authenticated user is required' }, { status: 401, headers: corsHeaders });

  let body: { settlementId?: string; action?: string; idempotencyKey?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders }); }
  if (!uuid.test(body.settlementId || '') || !uuid.test(body.idempotencyKey || '') || !actions.has(body.action || '')) {
    return Response.json({ error: 'settlementId, idempotencyKey, and a valid action are required' }, { status: 400, headers: corsHeaders });
  }

  // This secret exists only in the Edge runtime. The SQL function still checks
  // the caller identity and role; service-role access is never trusted alone.
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc('advance_simulated_settlement', {
    p_settlement_id: body.settlementId,
    p_action: body.action,
    p_idempotency_key: body.idempotencyKey,
    p_actor_user_id: user.id,
  });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 409;
    return Response.json({ error: error.message, code: error.code }, { status, headers: corsHeaders });
  }
  return Response.json(data, { status: 200, headers: corsHeaders });
});
