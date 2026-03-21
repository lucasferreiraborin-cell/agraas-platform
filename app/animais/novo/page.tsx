"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ClientRow = { id: string; name: string };
type PropertyRow = { id: string; name: string | null };

export default function NovoAnimalPage() {
  const router = useRouter();

  // Dados do usuário logado
  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Para admin: seletor de cliente
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Formulário
  const [internalCode, setInternalCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [breed, setBreed] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("active");

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Ao montar: detecta client_id e role do usuário logado
  useEffect(() => {
    async function detectUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthLoading(false); return; }

      const { data: clientData } = await supabase
        .from("clients")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single();

      if (clientData?.role === "admin") {
        setIsAdmin(true);
        const { data: allClients } = await supabase
          .from("clients")
          .select("id, name")
          .order("name");
        setClients((allClients as ClientRow[]) ?? []);
      } else {
        setMyClientId(clientData?.id ?? null);
      }

      setAuthLoading(false);
    }
    detectUser();
  }, []);

  // O client_id efetivo: para cliente normal = myClientId; para admin = selectedClientId
  const effectiveClientId = isAdmin ? selectedClientId : myClientId;

  // Carrega propriedades quando o client efetivo muda
  useEffect(() => {
    async function loadProperties() {
      if (!effectiveClientId) {
        setProperties([]);
        return;
      }
      const { data } = await supabase
        .from("properties")
        .select("id, name")
        .eq("client_id", effectiveClientId)
        .order("name");
      setProperties((data as PropertyRow[]) ?? []);
      setPropertyId("");
    }
    loadProperties();
  }, [effectiveClientId]);

  async function criarAnimal(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveClientId) return;
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("animals").insert({
      internal_code: internalCode || null,
      birth_date: birthDate || null,
      sex: sex || null,
      breed: breed || null,
      current_property_id: propertyId || null,
      status: status || null,
      client_id: effectiveClientId,
    });

    if (error) {
      setMessage(`Erro ao criar animal: ${error.message}`);
      setLoading(false);
      return;
    }

    router.push("/animais");
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#F5F7F4]">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-[#5F6B5F]">
          Carregando...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <Link href="/animais" className="text-sm text-[#4A7C3A] hover:underline">
            ← Voltar para Animais
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Novo animal</h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Registre um novo animal na base da Agraas.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={criarAnimal} className="space-y-5">

            {/* Seletor de cliente — apenas para admin */}
            {isAdmin && (
              <div>
                <label className="mb-2 block text-sm font-medium">Cliente</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Código interno */}
            <div>
              <label className="mb-2 block text-sm font-medium">Código interno</label>
              <input
                type="text"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: AG005"
                required
              />
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="mb-2 block text-sm font-medium">Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              />
            </div>

            {/* Sexo */}
            <div>
              <label className="mb-2 block text-sm font-medium">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione</option>
                <option value="Male">Macho</option>
                <option value="Female">Fêmea</option>
              </select>
            </div>

            {/* Raça */}
            <div>
              <label className="mb-2 block text-sm font-medium">Raça</label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: Nelore"
                required
              />
            </div>

            {/* Propriedade */}
            <div>
              <label className="mb-2 block text-sm font-medium">Propriedade atual</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
                disabled={!effectiveClientId}
              >
                <option value="">
                  {effectiveClientId
                    ? properties.length === 0
                      ? "Nenhuma propriedade cadastrada"
                      : "Selecione uma propriedade"
                    : isAdmin
                    ? "Selecione um cliente primeiro"
                    : "Carregando propriedades..."}
                </option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name ?? p.id}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
              >
                <option value="active">Ativo</option>
                <option value="sold">Vendido</option>
                <option value="slaughtered">Abatido</option>
              </select>
            </div>

            {message && (
              <div className="rounded-lg bg-[#F5F7F4] px-4 py-3 text-sm text-[#1F2A1F]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !effectiveClientId}
              className="rounded-lg bg-[#4A7C3A] px-6 py-3 text-sm font-medium text-white hover:bg-[#3B6B2E] disabled:opacity-60"
            >
              {loading ? "Criando..." : "Criar animal"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
