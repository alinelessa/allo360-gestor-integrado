import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  MapPin,
  MessageSquare,
  Minimize2,
  Send,
  Sparkles,
  User2,
  X,
} from "lucide-react";
import { askAssistant, type AssistantMessage } from "@/services/ai/askAssistant";
import { useAuth } from "@/contexts/AuthContext";

const initialSuggestions = [
  "Como está meu estoque baixo?",
  "Quanto tenho a receber em aberto?",
  "Me dê um resumo de hoje",
];

function AlloRingsIcon({ size = 42 }: { size?: number }) {
  const gradientId = useMemo(
    () => `goldGradient-${Math.random().toString(36).slice(2, 9)}`,
    []
  );
  const glowId = useMemo(
    () => `goldGlow-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="5%" y1="0%" x2="95%" y2="100%">
          <stop offset="0%" stopColor="#6f5316">
            <animate
              attributeName="offset"
              values="-1;0;1"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="0.35" stopColor="#c4962f">
            <animate
              attributeName="offset"
              values="-0.65;0.35;1.35"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="0.55" stopColor="#fff0a8">
            <animate
              attributeName="offset"
              values="-0.45;0.55;1.55"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="0.8" stopColor="#d4af37">
            <animate
              attributeName="offset"
              values="-0.2;0.8;1.8"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="1" stopColor="#7a5c1a">
            <animate
              attributeName="offset"
              values="0;1;2"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <circle
          cx="22"
          cy="25"
          r="12"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle
          cx="38"
          cy="25"
          r="12"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle
          cx="30"
          cy="38"
          r="12"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function buildMessage(
  role: "user" | "assistant",
  content: string
): AssistantMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function AIAssistantWidget() {
  const { assistantContext } = useAuth();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    buildMessage(
      "assistant",
      "Olá 👋 Posso responder sobre estoque, financeiro e resumos operacionais. Em seguida vamos conectar isso aos dados reais do sistema."
    ),
  ]);

  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading, open]);

  const sendQuestion = async (questionText?: string) => {
    const text = (questionText ?? message).trim();
    if (!text || loading) return;

    const userMessage = buildMessage("user", text);
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const response = await askAssistant(text, assistantContext);

      const header =
        assistantContext.lojaNome || assistantContext.userName
          ? `Contexto atual: ${assistantContext.lojaNome ?? "Sem loja ativa"}${
              assistantContext.userName ? ` • ${assistantContext.userName}` : ""
            }. `
          : "";

      const assistantMessage = buildMessage(
        "assistant",
        `${header}${response.reply}`
      );

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.suggestions?.length) {
        setSuggestions(response.suggestions);
      }
    } catch {
      const fallback = buildMessage(
        "assistant",
        "Não consegui responder agora. Verifique a conexão e tente novamente."
      );
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-[78px] w-[78px] items-center justify-center transition-transform duration-300 hover:scale-[1.06]"
        title="Abrir assistente"
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.10) 28%, rgba(212,175,55,0.03) 48%, rgba(212,175,55,0) 70%)",
            filter: "blur(8px)",
          }}
        />
        <span
          className="absolute inset-0 animate-pulse rounded-full"
          style={{
            boxShadow:
              "0 0 18px rgba(212,175,55,0.28), 0 0 34px rgba(212,175,55,0.14)",
          }}
        />
        <span className="relative">
          <AlloRingsIcon size={48} />
        </span>
      </button>

      {open && (
        <div
          className="fixed bottom-28 right-6 z-50 flex w-[380px] max-w-[calc(100vw-24px)] animate-fade-in-soft flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[hsl(var(--background)/0.86)] backdrop-blur-2xl"
          style={{
            boxShadow:
              "0 24px 70px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          <div className="relative overflow-hidden border-b border-border/20 px-4 py-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,240,168,0.06),transparent_30%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--surface-high)/0.6)]">
                  <AlloRingsIcon size={28} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                      Assistente Allo360
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af3733] bg-[#d4af3714] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b89025] dark:text-[#f1d98a]">
                      <Sparkles className="h-3 w-3" />
                      Beta
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Seu copiloto para estoque, vendas e financeiro
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {assistantContext.lojaNome && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/20 bg-[hsl(var(--surface-high)/0.65)] px-2 py-1">
                        <MapPin className="h-3 w-3" />
                        {assistantContext.lojaNome}
                      </span>
                    )}

                    {assistantContext.userName && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/20 bg-[hsl(var(--surface-high)/0.65)] px-2 py-1">
                        <User2 className="h-3 w-3" />
                        {assistantContext.userName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/8"
                  onClick={() => setOpen(false)}
                  title="Minimizar"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/8"
                  onClick={() => setOpen(false)}
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[420px] flex-col">
            <div
              ref={messagesRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm"
            >
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 ${
                    item.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {item.role === "assistant" && (
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-high)/0.65)]">
                      <Bot className="h-4 w-4 text-[#b89025] dark:text-[#f1d98a]" />
                    </div>
                  )}

                  <div
                    className={
                      item.role === "assistant"
                        ? "max-w-[85%] rounded-2xl rounded-tl-md border border-border/20 bg-[hsl(var(--surface-high)/0.6)] px-4 py-3 text-foreground"
                        : "max-w-[85%] rounded-2xl rounded-tr-md bg-[linear-gradient(135deg,#c4a45a_0%,#745b18_100%)] px-4 py-3 text-white"
                    }
                  >
                    {item.role === "user" && (
                      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-white/70">
                        <User2 className="h-3.5 w-3.5" />
                        Você
                      </div>
                    )}

                    <p className="leading-6">{item.content}</p>
                  </div>

                  {item.role === "user" && (
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-high)/0.65)]">
                      <User2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-high)/0.65)]">
                    <Bot className="h-4 w-4 text-[#b89025] dark:text-[#f1d98a]" />
                  </div>

                  <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-tl-md border border-border/20 bg-[hsl(var(--surface-high)/0.6)] px-4 py-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-[#b89025] dark:text-[#f1d98a]" />
                    <span>Pensando na resposta...</span>
                  </div>
                </div>
              )}

              <div className="pl-12">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Sugestões
                </p>

                <div className="space-y-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => sendQuestion(item)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-border/20 bg-[hsl(var(--surface-high)/0.6)] px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-[hsl(var(--surface-high)/0.9)]"
                    >
                      <MessageSquare className="h-4 w-4 text-[#b89025] dark:text-[#d4af37]" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border/20 px-3 py-3">
              <div className="flex items-end gap-2 rounded-[1.25rem] border border-border/20 bg-[hsl(var(--surface-high)/0.6)] p-2">
                <textarea
                  placeholder="Pergunte algo sobre seu negócio..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendQuestion();
                    }
                  }}
                  rows={1}
                  className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />

                <button
                  type="button"
                  onClick={() => sendQuestion()}
                  disabled={loading || !message.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#c4a45a_0%,#745b18_100%)] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Enviar"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className="mt-2 px-2 text-[11px] text-muted-foreground">
                Primeira versão do assistente. Próximo passo: conectar aos dados
                reais do Supabase.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}