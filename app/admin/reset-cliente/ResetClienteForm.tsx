"use client";

/**
 * Formulário em dois tempos: inventariar (só conta) → apagar (exige o e-mail
 * do cliente digitado) → contagem "depois". Fala com /api/admin/reset-cliente.
 */

import { useState, useTransition } from "react";
import { Loader2, Search, Trash2, CheckCircle, AlertTriangle } from "lucide-react";

type Cliente = { id: string; name: string; email: string; role: string };

type Tabela = { tabela: string; via: string; linhas: number; status: string; detalhe?: string };

type Inventario = { cliente: Cliente | null; tabelas: Tabela[]; total: number };

type Execucao = Inventario & {
  total_apagado: number;
  passadas: number;
  restantes: Tabela[];
  arquivos: { encontrados: number; removidos: number; erro?: string };
  depois: Inventario;
};

const STATUS_LABEL: Record<string, string> = {
  ok: "",
  inexistente: "tabela não existe neste banco",
  view: "é view — nada a apagar",
  sem_pai: "tabela-pai não existe",
  bloqueada: "bloqueada por outra tabela (FK)",
  erro: "erro",
};

function TabelaLinhas({ tabelas, coluna }: { tabelas: Tabela[]; coluna: string }) {
  const comLinhas = tabelas.filter(t => t.linhas > 0 || (t.status !== "ok" && t.status !== "inexistente"));
  const inexistentes = tabelas.filter(t => t.status === "inexistente").length;
  const vazias = tabelas.filter(t => t.status === "ok" && t.linhas === 0).length;
  return (
    <div className="overflow-x-auto">
      <table className="ag-table w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Tabela</th>
            <th className="text-left">Escopo</th>
            <th className="text-right">{coluna}</th>
            <th className="text-left">Observação</th>
          </tr>
        </thead>
        <tbody>
          {comLinhas.map(t => (
            <tr key={t.tabela} className={t.status === "bloqueada" || t.status === "erro" ? "text-red-700" : ""}>
              <td className="font-mono text-xs">{t.tabela}</td>
              <td className="text-xs text-[var(--text-muted)]">{t.via}</td>
              <td className="text-right tabular-nums">{t.linhas}</td>
              <td className="text-xs">{STATUS_LABEL[t.status] ?? t.status}{t.detalhe ? ` — ${t.detalhe}` : ""}</td>
            </tr>
          ))}
          {comLinhas.length === 0 && (
            <tr><td colSpan={4} className="text-center text-[var(--text-muted)] py-4">Nada encontrado para este cliente.</td></tr>
          )}
        </tbody>
      </table>
      <p className="text-xs text-[var(--text-muted)] mt-2">
        {vazias} tabelas já vazias · {inexistentes} tabelas do repositório que não existem neste banco (normal).
      </p>
    </div>
  );
}

export default function ResetClienteForm({ clientes }: { clientes: Cliente[] }) {
  const [clientId, setClientId] = useState(clientes[0]?.id ?? "");
  const [inventario, setInventario] = useState<Inventario | null>(null);
  const [execucao, setExecucao] = useState<Execucao | null>(null);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const cliente = clientes.find(c => c.id === clientId) ?? null;
  const podeApagar =
    !!inventario && inventario.total > 0 && !!cliente &&
    confirmacao.trim().toLowerCase() === cliente.email.trim().toLowerCase();

  async function chamar(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/reset-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json;
  }

  function inventariar() {
    setErro(null); setExecucao(null); setInventario(null); setConfirmacao("");
    start(async () => {
      try {
        setInventario(await chamar({ client_id: clientId, modo: "inventario" }));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  function apagar() {
    if (!podeApagar) return;
    setErro(null);
    start(async () => {
      try {
        const r = (await chamar({ client_id: clientId, modo: "executar", confirmacao })) as Execucao;
        setExecucao(r);
        setInventario(null);
        setConfirmacao("");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="ag-card p-5">
        <label className="ag-kpi-label block mb-2">Cliente</label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={clientId}
            onChange={e => { setClientId(e.target.value); setInventario(null); setExecucao(null); setConfirmacao(""); }}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm min-w-[320px]"
            disabled={pending}
          >
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.email} · {c.role}
              </option>
            ))}
          </select>
          <button onClick={inventariar} disabled={pending || !clientId} className="ag-button-secondary inline-flex items-center gap-2 disabled:opacity-60">
            {pending && !execucao ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Inventariar
          </button>
        </div>
        {cliente && <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">{cliente.id}</p>}
      </section>

      {erro && (
        <div className="ag-card border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {erro}
        </div>
      )}

      {inventario && (
        <section className="ag-card-strong p-5">
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
            <h2 className="ag-section-title">O que será apagado</h2>
            <span className="ag-kpi-value">{inventario.total.toLocaleString("pt-BR")} linhas</span>
          </div>
          <TabelaLinhas tabelas={inventario.tabelas} coluna="Linhas" />

          {inventario.total > 0 && cliente && (
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <label className="ag-kpi-label block mb-2">
                Para confirmar, digite o e-mail do cliente: <span className="font-mono">{cliente.email}</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={confirmacao}
                  onChange={e => setConfirmacao(e.target.value)}
                  placeholder={cliente.email}
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm min-w-[320px]"
                  disabled={pending}
                  autoComplete="off"
                />
                <button
                  onClick={apagar}
                  disabled={!podeApagar || pending}
                  className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Apagar tudo deste cliente
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Sem volta. A conta de acesso e o plano de contas ficam; todo o resto cai.
              </p>
            </div>
          )}
        </section>
      )}

      {execucao && (
        <section className={`ag-card-strong p-5 ${execucao.restantes.length === 0 && execucao.depois.total === 0 ? "border-emerald-300" : "border-amber-300"}`}>
          <div className="flex items-center gap-2 mb-1">
            {execucao.restantes.length === 0 && execucao.depois.total === 0
              ? <CheckCircle size={18} className="text-emerald-600" />
              : <AlertTriangle size={18} className="text-amber-600" />}
            <h2 className="ag-section-title">
              {execucao.total_apagado.toLocaleString("pt-BR")} linhas apagadas em {execucao.passadas} {execucao.passadas === 1 ? "passada" : "passadas"}
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Fotos: {execucao.arquivos.removidos}/{execucao.arquivos.encontrados} removidas
            {execucao.arquivos.erro ? ` (${execucao.arquivos.erro})` : ""} ·
            Sobrou depois: <strong>{execucao.depois.total}</strong> linhas
            {execucao.restantes.length > 0 && (
              <> · <span className="text-red-700">{execucao.restantes.length} tabela(s) não caíram — veja abaixo</span></>
            )}
          </p>
          <TabelaLinhas tabelas={execucao.tabelas} coluna="Apagadas" />
          {execucao.depois.total > 0 && (
            <div className="mt-6">
              <h3 className="ag-section-subtitle mb-2">Ainda existe</h3>
              <TabelaLinhas tabelas={execucao.depois.tabelas} coluna="Linhas" />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
