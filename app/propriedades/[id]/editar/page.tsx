"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BackLink } from "@/app/components/ui/BackLink";
import { showToast } from "@/app/components/Toast";

const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

export default function EditarPropriedadePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loadingInicial, setLoadingInicial] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [areaHectares, setAreaHectares] = useState("");

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, code, state, region, city, area_hectares")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setNaoEncontrada(true);
        setLoadingInicial(false);
        return;
      }

      setNome(data.name ?? "");
      setCodigo(data.code ?? "");
      setEstado(data.state ?? "");
      setMunicipio(data.region ?? data.city ?? "");
      setAreaHectares(data.area_hectares != null ? String(data.area_hectares) : "");
      setLoadingInicial(false);
    }
    carregar();
  }, [id]);

  async function salvarPropriedade(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase
      .from("properties")
      .update({
        name: nome,
        code: codigo || null,
        state: estado || null,
        // region e city são colunas separadas lidas em telas diferentes
        // (/propriedades lê os dois, /propriedades/[id] só region) — mantidas
        // em sincronia aqui pra edição não parecer "não salvou".
        region: municipio || null,
        city: municipio || null,
        area_hectares: areaHectares ? Number(areaHectares) : null,
      })
      .eq("id", id);

    if (error) {
      showToast("Erro ao salvar — tente novamente", "error");
      setSalvando(false);
      return;
    }

    showToast("Propriedade atualizada com sucesso");
    router.push(`/propriedades/${id}`);
  }

  if (loadingInicial) {
    return (
      <main className="min-h-screen bg-[#F5F7F4]">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-[#5F6B5F]">
          Carregando...
        </div>
      </main>
    );
  }

  if (naoEncontrada) {
    return (
      <main className="min-h-screen bg-[#F5F7F4]">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <BackLink href="/propriedades" label="Voltar para Propriedades" />
          <p className="mt-6 text-sm text-[#5F6B5F]">
            Não foi possível localizar esta propriedade, ou você não tem acesso a ela.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <BackLink href={`/propriedades/${id}`} label="Voltar para a propriedade" />

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Editar propriedade</h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Atualize os dados cadastrais desta fazenda.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={salvarPropriedade} className="space-y-5">
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

            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-[#4A7C3A] px-6 py-3 text-sm font-medium text-white hover:bg-[#3B6B2E] disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
