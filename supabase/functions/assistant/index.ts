import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TURNS = 12;
const MAX_CHARS = 2000;

// --- Which model provider to use -------------------------------------------
// Free path (recommended for a hackathon): set LLM_API_KEY to a Groq key.
//   LLM_API_KEY   = gsk_...                          (console.groq.com — free, no card)
//   LLM_BASE_URL  = https://api.groq.com/openai/v1   (default)
//   LLM_MODEL     = qwen/qwen3.8-27b                 (default; check /v1/models for your account)
// Works with any OpenAI-compatible endpoint (Groq, Google Gemini's OpenAI
// endpoint, OpenRouter, Together, etc.) — just change the three vars.
//
// Alternative: set ANTHROPIC_API_KEY (+ optional ASSISTANT_MODEL) to use Claude.
const LLM_API_KEY = Deno.env.get('LLM_API_KEY');
const LLM_BASE_URL = Deno.env.get('LLM_BASE_URL') ?? 'https://api.groq.com/openai/v1';
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? 'qwen/qwen3.8-27b';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = Deno.env.get('ASSISTANT_MODEL') ?? 'claude-opus-5';

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', mr: 'Marathi', bn: 'Bengali', ta: 'Tamil',
};

const SITE_MAP = `
- Overview ("/") — a summary of the farmer's position and wallet balance.
- Payments ("/wallet") — send money, request money, add money, pay obligations, see transaction history. Works offline (payments are queued and sync later).
- My Crops ("/crops") — each crop cycle, its value, maturity, and obligations.
- Contracts ("/contracts") — crop-linked contracts with the buyer and the obligations.
- Settlement ("/settlement") — the step-by-step harvest settlement (simulation only).
- Network ("/network") — verified suppliers, transporters, buyers and their reliability.
- Insights ("/insights") — illustrative financial insights (sample data).
Settings (the gear icon, top right) — language, light/dark, larger text, simple mode, daily spending limit.
`;

function systemPrompt(locale: string, contextPath?: string, balanceLabel?: string): string {
  const language = LANG_NAMES[locale] ?? 'English';
  return [
    'You are "Sahayak", a friendly in-app help assistant inside DhanMitraa, a payments and crop-finance app used by farmers and small rural businesses in India.',
    `Reply ONLY in ${language}. Use short, simple sentences. Assume the reader may have limited reading ability and a small phone screen. Prefer 2-4 short sentences. Do not use markdown headings or tables.`,
    'Your job is to help people USE this app and understand basic agri-finance terms (obligation, settlement, contract, buyer commitment). When they want to go somewhere, name the exact menu item to tap.',
    'IMPORTANT: All money features in this app are a SIMULATION for demonstration. No real money moves. Never tell a user they have really sent or received money, and never give personalised financial, investment, tax, or legal advice. If asked for that, say you can only help with using the app.',
    `App sections:\n${SITE_MAP}`,
    contextPath ? `The user is currently on the "${contextPath}" screen.` : '',
    balanceLabel ? `Their simulated wallet balance is ${balanceLabel}.` : '',
  ].filter(Boolean).join('\n\n');
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

class UpstreamError extends Error {
  detail: string;
  constructor(detail: string) {
    super('UPSTREAM');
    this.detail = detail;
  }
}

// If the configured model name is wrong/retired, retry once with another
// commonly-available Groq model so a typo does not brick the assistant.
const OPENAI_FALLBACK_MODEL = 'openai/gpt-oss-20b';

async function callOpenAICompatible(system: string, messages: ChatMessage[]): Promise<string> {
  const attempt = async (model: string) => {
    const response = await fetch(`${LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LLM_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error('LLM error', model, response.status, text.slice(0, 500));
      const reason = (() => { try { return JSON.parse(text)?.error?.message ?? text; } catch { return text; } })();
      throw new UpstreamError(`model "${model}" -> ${response.status}: ${String(reason).slice(0, 160)}`);
    }
    const data = JSON.parse(text);
    const choice = data?.choices?.[0]?.message ?? {};
    // Reasoning models (gpt-oss …) may leave `content` empty and put the answer
    // in `reasoning` when the token cap is hit mid-thought.
    return String(choice.content || choice.reasoning || '').trim();
  };

  try {
    const reply = await attempt(LLM_MODEL);
    if (reply) return reply;
    throw new UpstreamError(`model "${LLM_MODEL}" returned an empty reply`);
  } catch (error) {
    if (error instanceof UpstreamError && LLM_MODEL !== OPENAI_FALLBACK_MODEL && LLM_BASE_URL.includes('groq.com')) {
      console.warn('Retrying assistant with fallback model', OPENAI_FALLBACK_MODEL);
      return await attempt(OPENAI_FALLBACK_MODEL);
    }
    throw error;
  }
}

async function callAnthropic(system: string, messages: ChatMessage[]): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1024, output_config: { effort: 'low' }, system, messages }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('Anthropic error', response.status, text.slice(0, 500));
    throw new UpstreamError(`anthropic -> ${response.status}: ${text.slice(0, 160)}`);
  }
  const data = await response.json();
  if (data.stop_reason === 'refusal') return 'I can only help with using this app.';
  return Array.isArray(data.content)
    ? data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim()
    : '';
}

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

  if (!LLM_API_KEY && !ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'The assistant is not configured. Set LLM_API_KEY (free — see README) on this function.', code: 'NOT_CONFIGURED' },
      { status: 501, headers: corsHeaders },
    );
  }

  let body: { messages?: ChatMessage[]; locale?: string; context?: { path?: string; balanceLabel?: string } };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return Response.json({ error: 'Send at least one user message.' }, { status: 400, headers: corsHeaders });
  }

  const locale = typeof body.locale === 'string' && body.locale in LANG_NAMES ? body.locale : 'en';
  const system = systemPrompt(locale, body.context?.path, body.context?.balanceLabel);

  try {
    const reply = LLM_API_KEY
      ? await callOpenAICompatible(system, messages)
      : await callAnthropic(system, messages);
    return Response.json(
      { reply: reply || 'Sorry, I could not answer that. Please try asking a different way.' },
      { headers: corsHeaders },
    );
  } catch (error) {
    const detail = error instanceof UpstreamError ? error.detail : String(error).slice(0, 200);
    return Response.json(
      { error: 'The assistant model could not answer.', code: 'UPSTREAM_ERROR', detail },
      { status: 502, headers: corsHeaders },
    );
  }
});
