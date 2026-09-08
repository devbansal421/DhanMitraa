import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantContext {
  path?: string;
  balanceLabel?: string;
}

export type AssistantErrorKind = 'not-configured' | 'offline' | 'generic';

export class AssistantError extends Error {
  kind: AssistantErrorKind;
  /** Extra technical detail (HTTP status, upstream message) for debugging a deploy. */
  detail?: string;
  constructor(kind: AssistantErrorKind, message: string, detail?: string) {
    super(message);
    this.kind = kind;
    this.detail = detail;
  }
}

async function readBody(response: Response): Promise<{ error?: string; code?: string; detail?: string }> {
  try {
    return await response.json();
  } catch {
    try {
      return { error: (await response.text()).slice(0, 300) };
    } catch {
      return {};
    }
  }
}

/**
 * Calls the `assistant` Edge Function. Separates "not deployed / no key" (show
 * setup guidance) from real failures (show the actual reason so a deploy can be
 * fixed).
 */
export async function askAssistant(
  messages: AssistantMessage[],
  locale: string,
  context: AssistantContext,
): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new AssistantError('offline', 'No internet connection.');
  }

  const { data, error } = await supabase.functions.invoke('assistant', {
    body: { messages, locale, context },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      const payload = await readBody(error.context);
      if (payload.code === 'NOT_CONFIGURED' || status === 404 || status === 501) {
        throw new AssistantError('not-configured', payload.error ?? 'The assistant is not set up yet.');
      }
      throw new AssistantError(
        'generic',
        payload.error ?? 'The assistant service returned an error.',
        [`HTTP ${status}`, payload.code, payload.detail].filter(Boolean).join(' · '),
      );
    }
    if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      // Could not reach the function at all — most likely it is not deployed.
      throw new AssistantError('not-configured', 'The assistant function could not be reached.');
    }
    throw new AssistantError('generic', error instanceof Error ? error.message : 'Unknown error.');
  }

  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!reply) throw new AssistantError('generic', 'The assistant returned an empty reply.');
  return reply;
}
