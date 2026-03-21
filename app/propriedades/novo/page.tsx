"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

export default function NovaPropriedadePage() {
  const router = useRouter();

  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Campos do formulário
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [areaHectares, setAreaHectares] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Detecta client_id e role do usuário logado
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
        setClients(allClients ?? []);
      } else {
        setMyClientId(clientData?.id ?? null);
      }

      setAuthLoading(false);
    }
    detectUser();
  }, []);

  const effectiveClientId = isAdmin ? selectedClientId : myClientId;

  async function salvarPropriedade(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveClientId) return;
    setLoading(true);
    setError("");

    const { error: insertError } = await supabase.from("properties").insert({
      name: nome,
      code: codigo || null,
      state: estado || null,
      region: municipio || null,
      area_hectares: areaHectares ? Number(areaHectares) : null,
      client_id: effectiveClientId,
      status: "Ativa",
    });

    if (insertError) {
      setError(`Erro ao salvar: ${insertError.message}`);
      setLoading(false);
      return;
    }

    router.push("/propriedades");
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
          <Link href="/propriedades" className="text-sm text-[#4A7C3A] hover:underline">
            ← Voltar para Propriedades
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Nova propriedade</h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Cadastre uma fazenda para começar a rastrear sua operação.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={salvarPropriedade} className="space-y-5">

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

            {/* Nome */}
            <div>
              <label className="mb-2 block text-sm font-medium">Nome da fazenda *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: Fazenda Santa Helena"
                required
              />
            </div>

            {/* Código */}
            <div>
              <label className="mb-2 block text-sm font-medium">Código</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: PROP-007"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="mb-2 block text-sm font-medium">Estado *</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione o estado</option>
                {UF_LIST.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            {/* Município */}
            <div>
              <label className="mb-2 block text-sm font-medium">Município</label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: Rio Verde"
              />
            </div>

            {/* Área */}
            <div>
              <label className="mb-2 block text-sm font-medium">Área (hectares)</label>
              <input
                type="number"
                value={areaHectares}
                onChange={(e) => setAreaHectares(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                placeholder="Ex.: 1200"
                min="0"
                step="0.01"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !effectiveClientId}
              className="rounded-lg bg-[#4A7C3A] px-6 py-3 text-sm font-medium text-white hover:bg-[#3B6B2E] disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Cadastrar fazenda"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
