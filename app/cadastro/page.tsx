"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Tractor, Factory, Globe, Package, Handshake, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthShell from "@/app/components/ui/AuthShell";

const PROFILES: {
  key: string;
  Icon: LucideIcon;
  label: string;
  hint: string;
  sidebar: string;
}[] = [
  {
    key: "fazendeiro",
    Icon: Tractor,
    label: "Sou fazendeiro",
    hint: "Rebanho, talhões e passaporte digital",
    sidebar: "Rastreie seu rebanho, certifique para Halal e venda com dados verificados.",
  },
  {
    key: "frigorifico",
    Icon: Factory,
    label: "Frigorífico / abate",
    hint: "Animais com rastreabilidade individual",
    sidebar: "Receba animais com rastreabilidade individual e conformidade Halal auditável.",
  },
  {
    key: "exportador",
    Icon: Globe,
    label: "Exportador / trader",
    hint: "Lotes e embarques certificados",
    sidebar: "Lotes e embarques verificados do Brasil para compradores institucionais do mundo.",
  },
  {
    key: "fornecedor",
    Icon: Package,
    label: "Fornecedor",
    hint: "Insumos, máquinas e serviços",
    sidebar: "Conecte seus produtos a milhares de fazendas em todo o Brasil.",
  },
  {
    key: "parceiro",
    Icon: Handshake,
    label: "Parceiro",
    hint: "Distribuição, tecnologia ou financeiro",
    sidebar: "Construa o ecossistema Agraas junto com o time.",
  },
  {
    key: "visitante",
    Icon: Eye,
    label: "Só quero explorar",
    hint: "Ver a plataforma sem comprometimento",
    sidebar: "Infraestrutura digital para o agronegócio brasileiro. Veja por dentro.",
  },
];

const REBANHO = ["Até 100", "100–500", "500–2.000", "2.000+"];
const ESPECIES = ["Bovinos", "Ovinos", "Aves", "Misto"];

const DEFAULT_SIDEBAR =
  "A infraestrutura do agro brasileiro. Pecuária, grãos e exportação sobre uma única camada.";

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (pw.length === 0) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Muito fraca", "Fraca", "Boa", "Forte"] as const;
  return { score: Math.min(score, 3) as 0 | 1 | 2 | 3, label: labels[Math.min(score, 3)] };
}

function sanitizeAuthError(message: string) {
  const m = message.toLowerCase();
  // P2.1 pentest fix — do NOT return a different message for "already registered".
  // Supabase signUp returns `identities: []` (empty) when the email already exists,
  // which lets an attacker enumerate valid accounts. We unify the response:
  // any outcome that results in "no new session" shows the same generic message.
  // The branch below that checks `data.user && identities.length === 0` handles
  // the silent-duplicate case without revealing email existence.
  if (m.includes("invalid") && m.includes("email"))
    return "E-mail inválido.";
  if (m.includes("password") && (m.includes("weak") || m.includes("short")))
    return "Senha muito curta. Use pelo menos 8 caracteres.";
  return "Não foi possível criar a conta. Tente novamente em alguns instantes.";
}

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [profileType, setProfileType] = useState("");

  const [farmName, setFarmName] = useState("");
  const [state, setState] = useState("");
  const [rebanhoSize, setRebanhoSize] = useState("");
  const [especie, setEspecie] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");

  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = password === passwordConfirm || passwordConfirm === "";

  const sidebarMessage = useMemo(() => {
    const p = PROFILES.find((p) => p.key === profileType);
    return p?.sidebar ?? DEFAULT_SIDEBAR;
  }, [profileType]);

  const canAdvanceStep1 =
    name.length > 1 &&
    /@/.test(email) &&
    password.length >= 8 &&
    passwordConfirm === password &&
    profileType !== "";

  async function handleSubmit() {
    if (password !== passwordConfirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: authErr } = await supabase.auth.signUp({ email, password });

    if (authErr) {
      setError(sanitizeAuthError(authErr.message));
      setLoading(false);
      return;
    }

    // P2.1 pentest fix — Supabase silently returns a user object with an empty
    // `identities` array when the email is already registered (instead of an error).
    // We must NOT differentiate this case in the UX — show the same success message
    // whether the account is new or already exists, to prevent email enumeration.
    const isNewUser = data.user && Array.isArray(data.user.identities) && data.user.identities.length > 0;

    if (isNewUser && data.user) {
      await supabase.from("clients").insert({
        name: profileType === "fazendeiro" ? farmName || name : companyName || name,
        email,
        role: "client",
        auth_user_id: data.user.id,
      });
      setLoading(false);
      router.push("/painel");
    } else {
      // Either a duplicate email (identities=[]) or email-confirmation flow.
      // Show a generic message — do not reveal whether the account existed.
      setLoading(false);
      router.push("/cadastro/confirmacao");
    }
  }

  // Focus first input on step change
  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>("input[data-autofocus]");
    el?.focus();
  }, [step]);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

  return (
    <AuthShell
      sidebarMessage={sidebarMessage}
      sidebarBadges={["Halal", "EUDR", "MAPA", "SIF"]}
      step={{ current: step, total: profileType === "visitante" ? 1 : 2 }}
    >
      {step === 1 && (
        <div className="space-y-7">
          <div>
            <h1 className="text-[1.8rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
              Criar conta
            </h1>
            <p className="mt-2 text-[.9375rem] text-[var(--text-muted)]">
              Leva menos de 2 minutos.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                Nome completo
              </label>
              <input
                data-autofocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className={inputCls}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                E-mail
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                type="email"
                className={inputCls}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                Senha
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                type="password"
                className={inputCls}
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex h-1 gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-colors ${
                          i <= strength.score
                            ? strength.score === 0
                              ? "bg-red-400"
                              : strength.score === 1
                              ? "bg-amber-400"
                              : strength.score === 2
                              ? "bg-yellow-400"
                              : "bg-emerald-500"
                            : "bg-[var(--border)]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[.6875rem] text-[var(--text-muted)]">
                    {strength.label}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                Confirmar senha
              </label>
              <input
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Digite a senha novamente"
                type="password"
                className={`${inputCls} ${!passwordsMatch ? "!border-red-300 !ring-red-100" : ""}`}
                autoComplete="new-password"
              />
              {!passwordsMatch && (
                <p className="mt-1.5 text-[.75rem] text-red-600">As senhas não coincidem.</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                WhatsApp <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 9 9999-9999"
                className={inputCls}
                autoComplete="tel"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-[.8125rem] font-semibold text-[var(--text-primary)]">
              Qual é o seu perfil?
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PROFILES.map((p) => {
                const active = profileType === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setProfileType(p.key)}
                    className={`group flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-[0_0_0_3px_var(--primary-soft)]"
                        : "border-[var(--border)] bg-white hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                        active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
                      }`}
                    >
                      <p.Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[.8125rem] font-semibold text-[var(--text-primary)]">
                        {p.label}
                      </p>
                      <p className="mt-0.5 text-[.6875rem] leading-tight text-[var(--text-muted)] line-clamp-2">
                        {p.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={!canAdvanceStep1 || loading}
            onClick={() =>
              profileType === "visitante" ? handleSubmit() : setStep(2)
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-[.9375rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Criando conta
              </>
            ) : profileType === "visitante" ? (
              <>
                Criar conta
                <ArrowRight size={15} />
              </>
            ) : (
              <>
                Próximo passo
                <ArrowRight size={15} />
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.8125rem] text-red-700">
              {error}
            </div>
          )}

          <p className="text-center text-[.875rem] text-[var(--text-muted)]">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-7">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 text-[.8125rem] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            <ArrowLeft size={13} /> Voltar
          </button>

          <div>
            <h2 className="text-[1.8rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
              {profileType === "fazendeiro"
                ? "Sua fazenda"
                : profileType === "parceiro"
                ? "Como quer contribuir?"
                : "Sua empresa"}
            </h2>
            <p className="mt-2 text-[.9375rem] text-[var(--text-muted)]">Quase lá.</p>
          </div>

          {profileType === "fazendeiro" && (
            <div className="space-y-4">
              <input
                data-autofocus
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="Nome da fazenda"
                className={inputCls}
              />
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Estado (ex: GO, MT, MS)"
                className={inputCls}
              />
              <div>
                <p className="mb-2 text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  Tamanho do rebanho
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {REBANHO.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRebanhoSize(s)}
                      className={`rounded-xl border py-3 text-[.8125rem] font-semibold transition ${
                        rebanhoSize === s
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  Principal espécie
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ESPECIES.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEspecie(e)}
                      className={`rounded-xl border py-3 text-[.8125rem] font-semibold transition ${
                        especie === e
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(profileType === "frigorifico" ||
            profileType === "exportador" ||
            profileType === "fornecedor") && (
            <div className="space-y-4">
              <input
                data-autofocus
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
                className={inputCls}
              />
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Estado principal"
                className={inputCls}
              />
            </div>
          )}

          {profileType === "parceiro" && (
            <textarea
              data-autofocus
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conte brevemente como quer contribuir"
              rows={5}
              className={`${inputCls} resize-none`}
            />
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.8125rem] text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-[.9375rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Criando conta
              </>
            ) : (
              <>
                Criar conta
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      )}
    </AuthShell>
  );
}
