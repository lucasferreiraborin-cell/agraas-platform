"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function AgroAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Olá! Sou o assistente da Agraas. Tenho acesso aos dados reais da sua fazenda. Pergunte sobre seus animais, scores, alertas ou sugestões de manejo."
      }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history }),
      });
      const { reply } = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro ao conectar com o assistente. Tente novamente." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-hover)] shadow-2xl transition hover:bg-[#3B6B2E] active:scale-95"
        title="Assistente Agraas"
      >
        <span className="text-2xl">{open ? "✕" : "🤖"}</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex w-[380px] max-w-[calc(100vw-48px)] flex-col rounded-3xl border border-[var(--border)] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-3xl border-b border-[var(--border)] bg-[var(--primary-hover)] px-5 py-4">
            <span className="text-xl">🤖</span>
            <div>
              <p className="text-sm font-semibold text-white">Assistente Agraas</p>
              <p className="text-xs text-white/70">Dados reais da sua fazenda</p>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex max-h-[380px] flex-col gap-3 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  m.role === "user"
                    ? "bg-[var(--primary-hover)] text-white"
                    : "bg-[var(--surface-soft)] text-[var(--text-primary)]"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  <span className="animate-pulse">Consultando dados da fazenda...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões rápidas */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 px-5 pb-3">
              {[
                "Qual meu animal com maior score?",
                "Animais sem pesagem?",
                "Quantos animais tenho?",
              ].map(q => (
                <button key={q} type="button"
                  onClick={() => { setInput(q); }}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-hover)]">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 rounded-b-3xl border-t border-[var(--border)] p-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Pergunte sobre seu rebanho..."
              className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4A7C3A]"
              disabled={loading}
            />
            <button type="button" onClick={send} disabled={loading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-hover)] text-white disabled:opacity-40 hover:bg-[#3B6B2E]">
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
