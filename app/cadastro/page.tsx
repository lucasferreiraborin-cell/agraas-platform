"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/app/components/PublicNav";
import { supabase } from "@/lib/supabase";
import { Tractor, Factory, Globe, Package, Handshake, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PROFILES: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: "fazendeiro", Icon: Tractor, label: "Sou fazendeiro" },
  { key: "frigorifico", Icon: Factory, label: "Sou frigorifico / abate" },
  { key: "exportador", Icon: Globe, label: "Sou exportador / trader" },
  { key: "fornecedor", Icon: Package, label: "Sou fornecedor" },
  { key: "parceiro", Icon: Handshake, label: "Quero ser parceiro" },
  { key: "visitante", Icon: Eye, label: "So quero explorar" },
];

const REBANHO = ["Ate 100", "100-500", "500-2000", "2000+"];
const ESPECIES = ["Bovinos", "Ovinos", "Aves", "Misto"];

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [profileType, setProfileType] = useState("");

  const [farmName, setFarmName] = useState("");
  const [state, setState] = useState("");
  const [rebanhoSize, setRebanhoSize] = useState("");
  const [especie, setEspecie] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    const { data, error: authErr } = await supabase.auth.signUp({ email, password });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("clients").insert({
        name: profileType === "fazendeiro" ? farmName || name : companyName || name,
        email, role: "client", auth_user_id: data.user.id,
      });
    }
    setLoading(false);
    router.push("/painel");
  }

  const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 text-[15px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition";

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <div className="mx-auto flex max-w-5xl">
        {/* Sidebar verde (desktop) */}
        <aside className="hidden w-72 shrink-0 bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-2)_100%)] px-8 py-16 lg:block" style={{ minHeight: "calc(100vh - 80px)" }}>
          <p className="text-[2rem] font-semibold tracking-[-0.06em] text-white">Agraas</p>
          <p className="mt-4 text-[14px] leading-7 text-white/60">
            {profileType === "fazendeiro" ? "Rastreie seu rebanho, certifique para Halal e venda com dados verificados." :
             profileType === "frigorifico" ? "Acesse animais com rastreabilidade individual e conformidade Halal." :
             profileType === "exportador" ? "Dados verificados do Brasil para compradores institucionais do mundo." :
             profileType === "fornecedor" ? "Conecte seus produtos a milhares de fazendas em todo o Brasil." :
             "Infraestrutura digital para o agronegocio brasileiro."}
          </p>
          <div className="mt-8 flex items-center gap-2 text-[13px] text-white/40">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${step >= 1 ? "bg-white text-[var(--sidebar-2)]" : "bg-white/20 text-white/50"}`}>1</span>
            <div className={`h-px w-6 ${step >= 2 ? "bg-white/50" : "bg-white/15"}`} />
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${step >= 2 ? "bg-white text-[var(--sidebar-2)]" : "bg-white/20 text-white/50"}`}>2</span>
          </div>
        </aside>

        {/* Form */}
        <div className="flex-1 px-6 py-16 lg:px-16">
          {step === 1 && (
            <div className="max-w-md space-y-6">
              <div>
                <h1 className="text-[1.8rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">Criar conta</h1>
                <p className="mt-1 text-[14px] text-[var(--text-muted)]">Passo 1 de 2</p>
              </div>

              <div className="space-y-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className={inputCls} />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" type="email" className={inputCls} />
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (minimo 8 caracteres)" type="password" className={inputCls} />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp (opcional)" className={inputCls} />
              </div>

              <div>
                <p className="mb-3 text-[14px] font-semibold text-[var(--text-primary)]">Qual e o seu perfil?</p>
                <div className="grid grid-cols-2 gap-3">
                  {PROFILES.map(p => (
                    <button key={p.key} type="button" onClick={() => setProfileType(p.key)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                        profileType === p.key ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] bg-white hover:border-[var(--border-strong)]"
                      }`}>
                      <p.Icon size={18} className={profileType === p.key ? "text-[var(--primary)]" : "text-[var(--text-muted)]"} />
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button"
                disabled={!name || !email || !password || !profileType}
                onClick={() => profileType === "visitante" ? handleSubmit() : setStep(2)}
                className="w-full rounded-xl bg-[var(--primary)] py-4 text-[15px] font-bold text-white hover:bg-[var(--primary-hover)] transition disabled:opacity-40">
                {profileType === "visitante" ? "Criar conta" : "Proximo"}
              </button>

              <p className="text-center text-[13px] text-[var(--text-muted)]">
                Ja tem conta? <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">Entrar</Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-md space-y-6">
              <button type="button" onClick={() => setStep(1)} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]">← Voltar</button>
              <div>
                <h2 className="text-[1.8rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  {profileType === "fazendeiro" ? "Sobre sua fazenda" : profileType === "parceiro" ? "Como quer contribuir?" : "Sobre sua empresa"}
                </h2>
                <p className="mt-1 text-[14px] text-[var(--text-muted)]">Passo 2 de 2</p>
              </div>

              {profileType === "fazendeiro" && (
                <div className="space-y-4">
                  <input value={farmName} onChange={e => setFarmName(e.target.value)} placeholder="Nome da fazenda" className={inputCls} />
                  <input value={state} onChange={e => setState(e.target.value)} placeholder="Estado (ex: GO, MT, MS)" className={inputCls} />
                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Tamanho do rebanho</p>
                    <div className="grid grid-cols-2 gap-2">
                      {REBANHO.map(s => (
                        <button key={s} type="button" onClick={() => setRebanhoSize(s)}
                          className={`rounded-xl border-2 py-3 text-[13px] font-semibold transition ${rebanhoSize === s ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Principal especie</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ESPECIES.map(e => (
                        <button key={e} type="button" onClick={() => setEspecie(e)}
                          className={`rounded-xl border-2 py-3 text-[13px] font-semibold transition ${especie === e ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(profileType === "frigorifico" || profileType === "exportador" || profileType === "fornecedor") && (
                <div className="space-y-4">
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nome da empresa" className={inputCls} />
                  <input value={state} onChange={e => setState(e.target.value)} placeholder="Estado principal" className={inputCls} />
                </div>
              )}

              {profileType === "parceiro" && (
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Como quer contribuir?" rows={4} className={inputCls} />
              )}

              {error && <p className="text-[13px] text-red-600">{error}</p>}

              <button type="button" disabled={loading} onClick={handleSubmit}
                className="w-full rounded-xl bg-[var(--primary)] py-4 text-[15px] font-bold text-white hover:bg-[var(--primary-hover)] transition disabled:opacity-60">
                {loading ? "Criando conta..." : "Criar conta"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
