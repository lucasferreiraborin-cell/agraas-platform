"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/app/components/Toast";

type ClientRow = { id: string; name: string };
type PropertyRow = { id: string; name: string | null };
type AnimalSearchResult = { id: string; internal_code: string | null; nickname: string | null };

const CATEGORIES = ["Bezerro(a)", "Garrote/Novilha", "Boi/Vaca solteira", "Boi gordo", "Matriz", "Touro", "Reprodutor"];
const BLOOD_TYPES = ["A", "B", "AB", "O", "Desconhecido"];

export default function NovoAnimalPage() {
  const router = useRouter();

  // Dados do usuário logado
  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Para admin: seletor de cliente
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Campos do formulário
  const [nickname, setNickname] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [rfid, setRfid] = useState("");
  const [sex, setSex] = useState("");
  const [category, setCategory] = useState("");
  const [breed, setBreed] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  // Busca de pai e mãe
  const [sireQuery, setSireQuery] = useState("");
  const [sireResults, setSireResults] = useState<AnimalSearchResult[]>([]);
  const [sireId, setSireId] = useState<string | null>(null);
  const [sireLabel, setSireLabel] = useState("");

  const [damQuery, setDamQuery] = useState("");
  const [damResults, setDamResults] = useState<AnimalSearchResult[]>([]);
  const [damId, setDamId] = useState<string | null>(null);
  const [damLabel, setDamLabel] = useState("");

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(false);


  const sireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const damTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detecta client_id e role
  useEffect(() => {
    async function detectUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthLoading(false); return; }
      const { data: clientData } = await supabase
        .from("clients").select("id, role").eq("auth_user_id", user.id).single();
      if (clientData?.role === "admin") {
        setIsAdmin(true);
        const { data: allClients } = await supabase.from("clients").select("id, name").order("name");
        setClients((allClients as ClientRow[]) ?? []);
      } else {
        setMyClientId(clientData?.id ?? null);
      }
      setAuthLoading(false);
    }
    detectUser();
  }, []);

  const effectiveClientId = isAdmin ? selectedClientId : myClientId;

  // Carrega propriedades quando effectiveClientId muda
  useEffect(() => {
    async function loadProperties() {
      if (!effectiveClientId) { setProperties([]); return; }
      const { data } = await supabase
        .from("properties").select("id, name").eq("client_id", effectiveClientId).order("name");
      setProperties((data as PropertyRow[]) ?? []);
      setPropertyId("");
    }
    loadProperties();
  }, [effectiveClientId]);

  // Busca de pai (macho) com debounce
  const searchSire = useCallback((query: string) => {
    if (sireTimer.current) clearTimeout(sireTimer.current);
    if (!query || query.length < 2) { setSireResults([]); return; }
    sireTimer.current = setTimeout(async () => {
      const q = supabase
        .from("animals")
        .select("id, internal_code, nickname")
        .eq("sex", "Male")
        .ilike("internal_code", `%${query}%`)
        .limit(6);
      if (effectiveClientId) q.eq("client_id", effectiveClientId);
      const { data } = await q;
      setSireResults((data as AnimalSearchResult[]) ?? []);
    }, 300);
  }, [effectiveClientId]);

  // Busca de mãe (fêmea) com debounce
  const searchDam = useCallback((query: string) => {
    if (damTimer.current) clearTimeout(damTimer.current);
    if (!query || query.length < 2) { setDamResults([]); return; }
    damTimer.current = setTimeout(async () => {
      const q = supabase
        .from("animals")
        .select("id, internal_code, nickname")
        .eq("sex", "Female")
        .ilike("internal_code", `%${query}%`)
        .limit(6);
      if (effectiveClientId) q.eq("client_id", effectiveClientId);
      const { data } = await q;
      setDamResults((data as AnimalSearchResult[]) ?? []);
    }, 300);
  }, [effectiveClientId]);

  async function criarAnimal(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveClientId) return;
    setLoading(true);

    const { data: newAnimal, error } = await supabase.from("animals").insert({
      nickname: nickname || null,
      internal_code: internalCode || null,
      rfid: rfid || null,
      sex: sex || null,
      category: category || null,
      breed: breed || null,
      blood_type: bloodType || null,
      birth_date: birthDate || null,
      birth_weight: birthWeight ? Number(birthWeight) : null,
      current_property_id: propertyId || null,
      sire_animal_id: sireId || null,
      dam_animal_id: damId || null,
      notes: notes || null,
      status,
      client_id: effectiveClientId,
    }).select("id").single();

    if (error || !newAnimal) {
      showToast("Erro ao salvar — tente novamente", "error");
      setLoading(false);
      return;
    }

    showToast("Animal cadastrado com sucesso");
    router.push(`/animais/${newAnimal.id}`);
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#F5F7F4]">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-[#5F6B5F]">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <Link href="/animais" className="text-sm text-[#4A7C3A] hover:underline">← Voltar para Animais</Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Novo animal</h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">Registre um novo animal com identidade digital completa.</p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={criarAnimal} className="space-y-5">

            {/* Admin: seletor de cliente */}
            {isAdmin && (
              <Field label="Cliente" required>
                <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className={selectClass} required>
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Nome/apelido */}
              <Field label="Nome / apelido">
                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                  className={inputClass} placeholder="Ex.: Braveza" />
              </Field>

              {/* Código interno */}
              <Field label="Código interno" required>
                <input type="text" value={internalCode} onChange={e => setInternalCode(e.target.value)}
                  className={inputClass} placeholder="Ex.: AG005" required />
              </Field>

              {/* RFID */}
              <Field label="RFID">
                <input type="text" value={rfid} onChange={e => setRfid(e.target.value)}
                  className={inputClass} placeholder="Ex.: 982000123456789" />
              </Field>

              {/* Data de nascimento */}
              <Field label="Data de nascimento">
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputClass} />
              </Field>

              {/* Sexo */}
              <Field label="Sexo" required>
                <select value={sex} onChange={e => setSex(e.target.value)} className={selectClass} required>
                  <option value="">Selecione</option>
                  <option value="Male">Macho</option>
                  <option value="Female">Fêmea</option>
                </select>
              </Field>

              {/* Categoria */}
              <Field label="Categoria">
                <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
                  <option value="">Selecione</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              {/* Raça */}
              <Field label="Raça">
                <input type="text" value={breed} onChange={e => setBreed(e.target.value)}
                  className={inputClass} placeholder="Ex.: Nelore" />
              </Field>

              {/* Tipo sanguíneo */}
              <Field label="Tipo sanguíneo">
                <select value={bloodType} onChange={e => setBloodType(e.target.value)} className={selectClass}>
                  <option value="">Selecione</option>
                  {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              {/* Peso ao nascer */}
              <Field label="Peso ao nascer (kg)">
                <input type="number" value={birthWeight} onChange={e => setBirthWeight(e.target.value)}
                  className={inputClass} placeholder="Ex.: 32" min="0" step="0.1" />
              </Field>

              {/* Status */}
              <Field label="Status">
                <select value={status} onChange={e => setStatus(e.target.value)} className={selectClass}>
                  <option value="active">Ativo</option>
                  <option value="sold">Vendido</option>
                  <option value="slaughtered">Abatido</option>
                </select>
              </Field>
            </div>

            {/* Propriedade */}
            <Field label="Propriedade atual">
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
                className={selectClass} disabled={!effectiveClientId}>
                <option value="">
                  {effectiveClientId
                    ? properties.length === 0 ? "Nenhuma propriedade cadastrada" : "Selecione uma propriedade"
                    : isAdmin ? "Selecione um cliente primeiro" : "Carregando..."}
                </option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
              </select>
            </Field>

            {/* Busca de pai */}
            <Field label="Pai (busca por código)">
              {sireId ? (
                <div className="flex items-center gap-3">
                  <span className="flex-1 rounded-lg border border-[#4A7C3A] bg-[#f0f7ec] px-4 py-3 text-sm font-medium text-[#4A7C3A]">
                    {sireLabel}
                  </span>
                  <button type="button" onClick={() => { setSireId(null); setSireLabel(""); setSireQuery(""); }}
                    className="rounded-lg border border-black/10 px-3 py-3 text-sm text-[#5F6B5F] hover:bg-black/5">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={sireQuery}
                    onChange={e => { setSireQuery(e.target.value); searchSire(e.target.value); }}
                    className={inputClass} placeholder="Digite o código do pai (macho)" />
                  {sireResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/10 bg-white shadow-lg">
                      {sireResults.map(a => (
                        <button key={a.id} type="button"
                          onClick={() => { setSireId(a.id); setSireLabel(a.internal_code ?? a.id); setSireQuery(""); setSireResults([]); }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-[#f0f7ec]">
                          <span className="font-medium">{a.internal_code}</span>
                          {a.nickname && <span className="ml-2 text-[#5F6B5F]">({a.nickname})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>

            {/* Busca de mãe */}
            <Field label="Mãe (busca por código)">
              {damId ? (
                <div className="flex items-center gap-3">
                  <span className="flex-1 rounded-lg border border-[#4A7C3A] bg-[#f0f7ec] px-4 py-3 text-sm font-medium text-[#4A7C3A]">
                    {damLabel}
                  </span>
                  <button type="button" onClick={() => { setDamId(null); setDamLabel(""); setDamQuery(""); }}
                    className="rounded-lg border border-black/10 px-3 py-3 text-sm text-[#5F6B5F] hover:bg-black/5">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={damQuery}
                    onChange={e => { setDamQuery(e.target.value); searchDam(e.target.value); }}
                    className={inputClass} placeholder="Digite o código da mãe (fêmea)" />
                  {damResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/10 bg-white shadow-lg">
                      {damResults.map(a => (
                        <button key={a.id} type="button"
                          onClick={() => { setDamId(a.id); setDamLabel(a.internal_code ?? a.id); setDamQuery(""); setDamResults([]); }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-[#f0f7ec]">
                          <span className="font-medium">{a.internal_code}</span>
                          {a.nickname && <span className="ml-2 text-[#5F6B5F]">({a.nickname})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>

            {/* Observações */}
            <Field label="Observações">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`} placeholder="Informações adicionais sobre o animal..." />
            </Field>

            <button type="submit" disabled={loading || !effectiveClientId}
              className="rounded-lg bg-[#4A7C3A] px-6 py-3 text-sm font-medium text-white hover:bg-[#3B6B2E] disabled:opacity-60">
              {loading ? "Criando..." : "Criar animal e abrir passaporte"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#4A7C3A] focus:ring-1 focus:ring-[#4A7C3A]/20";
const selectClass = "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#4A7C3A]";
