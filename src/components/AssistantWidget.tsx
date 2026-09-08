import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, RotateCcw, Send, Sparkles, Volume2, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useWallet } from '@/wallet';
import { formatINR } from '@/lib/format';
import { askAssistant, AssistantError, type AssistantMessage } from '@/services/assistant';

const BCP47: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN' };

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function AssistantWidget() {
  const { t, lang } = useI18n();
  const wallet = useWallet();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string; retryText?: string } | null>(null);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending, open]);

  const runAsk = async (conversation: AssistantMessage[], retryText: string) => {
    setError(null);
    setPending(true);
    try {
      const reply = await askAssistant(conversation, lang, {
        path: location.pathname,
        balanceLabel: formatINR(wallet.balance),
      });
      setMessages([...conversation, { role: 'assistant', content: reply }]);
    } catch (err) {
      const kind = err instanceof AssistantError ? err.kind : 'generic';
      if (kind === 'not-configured') setError({ message: t('assistant.notConfigured') });
      else if (kind === 'offline') setError({ message: t('assistant.offline'), retryText });
      else setError({
        message: t('assistant.error'),
        detail: err instanceof AssistantError ? err.detail ?? err.message : String(err),
        retryText,
      });
    } finally {
      setPending(false);
    }
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    setDraft('');
    const next: AssistantMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    void runAsk(next, content);
  };

  const retry = () => {
    if (pending || messages.length === 0) return;
    // The conversation already ends with the unanswered user turn.
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    void runAsk(messages, error?.retryText || lastUser);
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = BCP47[lang] ?? 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = BCP47[lang] ?? 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) void send(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const quickQuestions = [t('assistant.quick1'), t('assistant.quick2'), t('assistant.quick3'), t('assistant.quick4')];
  const micAvailable = typeof window !== 'undefined' && Boolean(getSpeechRecognition());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('assistant.open')}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-gold-300/40 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        style={{ backgroundColor: 'rgb(var(--btn-primary-bg))', color: 'rgb(var(--btn-primary-fg))' }}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5 animate-pulse-soft" />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-line bg-ink-surface shadow-[0_20px_50px_rgba(0,0,0,0.28)] animate-scale-in lg:bottom-24 lg:right-6" style={{ maxHeight: 'min(70vh, 32rem)' }}>
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-200/15">
                <Sparkles className="h-4 w-4 text-gold-200" />
              </span>
              <div>
                <div className="text-sm font-semibold text-paper">{t('assistant.title')}</div>
                <div className="text-[11px] text-paper-muted">{t('assistant.subtitle')}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button type="button" onClick={() => { setMessages([]); setError(null); }} className="text-[11px] text-paper-muted hover:text-paper">
                  {t('assistant.clear')}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="text-paper-faint hover:text-paper" aria-label={t('common.close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto scrollbar-thin px-4 py-4">
            {messages.length === 0 && !error && (
              <div className="space-y-2">
                <p className="text-sm text-paper-muted">{t('assistant.disclaimer')}</p>
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void send(question)}
                    className="block w-full rounded-md border border-line px-3 py-2 text-left text-sm text-paper transition-colors hover:border-sage-300 hover:bg-sage-50/60"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.role === 'user' ? 'bg-sage-500' : 'border border-line bg-ink-elevated/50 text-paper'}`}
                  style={message.role === 'user' ? { color: 'rgb(var(--btn-primary-fg))' } : undefined}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  {message.role === 'assistant' && 'speechSynthesis' in window && (
                    <button
                      type="button"
                      onClick={() => speak(message.content)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-paper-muted hover:text-paper"
                    >
                      <Volume2 className="h-3 w-3" /> {t('payment.speak')}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pending && <p className="text-sm text-paper-muted">{t('assistant.thinking')}</p>}
            {error && (
              <div role="alert" className="rounded-md border border-terra-400/25 bg-terra-400/5 px-3 py-2 text-sm text-terra-500">
                <p>{error.message}</p>
                {error.detail && <p className="mt-1 break-words font-mono text-[10px] text-paper-muted">{error.detail}</p>}
                {error.retryText && !pending && (
                  <button type="button" onClick={retry} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-paper hover:underline">
                    <RotateCcw className="h-3 w-3" /> {t('common.retry')}
                  </button>
                )}
              </div>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t border-line p-3"
            onSubmit={(event) => { event.preventDefault(); void send(draft); }}
          >
            {micAvailable && (
              <button
                type="button"
                onClick={toggleListening}
                aria-label={t('assistant.listen')}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${listening ? 'border-terra-400 bg-terra-400/10 text-terra-500 animate-pulse-soft' : 'border-line text-paper-muted hover:text-paper'}`}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(draft); }
              }}
              rows={1}
              placeholder={t('assistant.placeholder')}
              className="input max-h-24 flex-1 resize-none py-2"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              aria-label={t('assistant.send')}
              className="btn-gold h-9 w-9 shrink-0 p-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
