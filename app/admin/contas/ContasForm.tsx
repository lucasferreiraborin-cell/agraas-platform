"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, CheckCircle } from "lucide-react";

type Conta = {
  id: string; name: string | null; email: string | null; role: string | null;
  tem_login: boolean; email_duplicado: boolean; created_at?: string | null;
};

const ROLES = ["client", "accountant", "buyer", "bank", "admin"];

export default function ContasForm() {
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [eu, setEu] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [mudando, setMudando] = useState<string | null>(null);

  async function carregar() {
    setErro(null);
    const res = await fetch("/api/admin/contas");
    const json = await res.json();
    if (!res.ok) { setErro(json.error ?? `HTTP ${res.status}`); return; }
    setContas(json.contas); setEu(json.eu);
  }
  useEffect(() => { carregar(); }, []);

  async function mudarRole(c: Conta, role: string) {
    if (role === c.role) return;
    if (!confirm(`Mudar ${c.email ?? c.name} de "${c.role}" para "${role}"?`)) return;
    setMudando(c.id); setErro(null); setOk(null);
    try {
      const res = await fetch("/api/admin/contas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: c.id, role }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? `HTTP ${res.status}`); return; }
      setOk(`${c.email ?? c.name}: ${json.de} → ${json.para}`);
      await carregar();
    } finally {
      setMudando(null);
    }
  }

  const admins = (contas ?? []).filter(c => c.role === "admin");

  return (
    <div className="space-y-5">
      {erro && <div className="ag-card border-red-200 bg-red-50 p-4 text-sm text-red-800">{erro}</div>}
      {ok && <div className="ag-card border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle size={16} /> {ok}</div>}

      {contas && admins.length > 1 && (
        <div className="ag-card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>{admins.length} contas com papel admin: {admins.map(a => a.email).join(", ")}. Cada uma delas enxerga os dados de todos os clientes.</span>
        </div>
      )}

      <section className="ag-card-strong p-0 overflow-x-auto">
        {!contas ? (
          <div className="p-6 text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> carregando…</div>
        ) : (
          <table className="ag-table w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Nome</th>
                <th className="text-left">E-mail</th>
                <th className="text-left">Papel</th>
                <th className="text-left">Login</th>
                <th className="text-left">client_id</th>
              </tr>
            </thead>
            <tbody>
              {contas.map(c => (
                <tr key={c.id} className={c.email_duplicado ? "bg-amber-50" : ""}>
                  <td>{c.name ?? "—"}{c.id === eu && <span className="ml-2 ag-badge ag-badge-green">você</span>}</td>
                  <td className="font-mono text-xs">
                    {c.email ?? "—"}
                    {c.email_duplicado && <span className="ml-2 text-amber-700">duplicado</span>}
                  </td>
                  <td>
                    <select
                      value={c.role ?? ""}
                      disabled={mudando === c.id || c.id === eu}
                      onChange={e => mudarRole(c, e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      {c.role && !ROLES.includes(c.role) && <option value={c.role}>{c.role}</option>}
                    </select>
                    {mudando === c.id && <Loader2 size={12} className="inline ml-2 animate-spin" />}
                  </td>
                  <td className="text-xs">{c.tem_login ? "sim" : <span className="text-red-700">sem auth_user_id</span>}</td>
                  <td className="font-mono text-[10px] text-[var(--text-muted)]">{c.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
