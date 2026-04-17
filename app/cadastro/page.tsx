"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/app/components/PublicNav";
import { supabase } from "@/lib/supabase";

const PROFILES = [
  { key: "fazendeiro", icon: "🐄", label: "Sou fazendeiro" },
  { key: "frigorifico", icon: "🏭", label: "Sou frigorífico/abate" },
  { key: "exportador", icon: "🌍", label: "Sou exportador/trader" },
  { key: "fornecedor", icon: "💊", label: "Sou fornecedor" },
  { key: "parceiro", icon: "🤝", label: "Quero ser parceiro" },
  { key: "visitante", icon: "👀", label: "Só quero explorar" },
] as const;

const REBANHO_SIZES = ["Até 100", "100-500", "500-2000", "2000+"];
const ESPECIES = ["Bovinos", "Ovinos", "Aves", "Misto"];

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [profileType, setProfileType] = useState("");

  // Step 2
  const [farmName, setFarmName] = useState("");
  const [state, setState] = useState("");
  const [rebanhoSize, setRebanhoSize] = useState("");
  const [especie, setEspecie] = useState("");
  const [exporta, setExporta] = useState("");
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
        email,
        role: "client",
        auth_user_id: data.user.id,
      });
    }

    setLoading(false);
    router.push("/dashboard");
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-[#3B5E2B] focus:ring-2 focus:ring-[#3B5E2B]/10";

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="mx-auto max-w-lg px-6 py-16">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {[1, 2].map(s => (
            <div key={s} className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step >= s ? "bg-[#3B5E2B] text-white" : "bg-gray-200 text-gray-400"
            }`}>{s}</div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao ecossistema Agraas</h1>
              <p className="mt-2 text-sm text-gray-500">Conta pra gente um pouco sobre você</p>
            </div>

            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className={inputCls} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" type="email" className={inputCls} />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (mínimo 8 caracteres)" type="password" className={inputCls} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp (opcional)" className={inputCls} />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-gray-700">Qual é o seu perfil?</p>
              <div className="grid grid-cols-2 gap-3">
                {PROFILES.map(p => (
                  <button key={p.key} type="button" onClick={() => setProfileType(p.key)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                      profileType === p.key ? "border-[#3B5E2B] bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}>
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!name || !email || !password || !profileType}
              onClick={() => profileType === "visitante" ? handleSubmit() : setStep(2)}
              className="w-full rounded-xl bg-[#3B5E2B] py-4 text-base font-bold text-white transition hover:bg-[#2d4a21] disabled:opacity-40"
            >
              {profileType === "visitante" ? "Criar conta" : "Próximo →"}
            </button>

            <p className="text-center text-sm text-gray-500">
              Já tem conta? <Link href="/login" className="font-semibold text-[#3B5E2B] hover:underline">Entrar</Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {profileType === "fazendeiro" ? "Sobre sua fazenda" :
                 profileType === "frigorifico" ? "Sobre seu frigorífico" :
                 profileType === "exportador" ? "Sobre sua operação" :
                 profileType === "fornecedor" ? "Sobre sua empresa" :
                 "Como quer contribuir?"}
              </h2>
            </div>

            {profileType === "fazendeiro" && (
              <div className="space-y-4">
                <input value={farmName} onChange={e => setFarmName(e.target.value)} placeholder="Nome da fazenda" className={inputCls} />
                <input value={state} onChange={e => setState(e.target.value)} placeholder="Estado (ex: GO, MT, MS)" className={inputCls} />
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Tamanho do rebanho</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REBANHO_SIZES.map(s => (
                      <button key={s} type="button" onClick={() => setRebanhoSize(s)}
                        className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${rebanhoSize === s ? "border-[#3B5E2B] bg-emerald-50 text-[#3B5E2B]" : "border-gray-200 text-gray-700"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Principal espécie</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ESPECIES.map(e => (
                      <button key={e} type="button" onClick={() => setEspecie(e)}
                        className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${especie === e ? "border-[#3B5E2B] bg-emerald-50 text-[#3B5E2B]" : "border-gray-200 text-gray-700"}`}>
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full rounded-xl bg-[#3B5E2B] py-4 text-base font-bold text-white transition hover:bg-[#2d4a21] disabled:opacity-60"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
