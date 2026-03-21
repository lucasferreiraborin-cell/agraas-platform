"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string;
};

type PropertyRow = {
  id: string;
  name: string | null;
};

export default function NovoAnimalPage() {
  const [clientId, setClientId] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [breed, setBreed] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("active");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Carrega clientes uma vez
  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true });

      if (data) setClients(data as ClientRow[]);
    }

    loadClients();
  }, []);

  // Recarrega propriedades quando o cliente muda
  useEffect(() => {
    async function loadProperties() {
      let query = supabase
        .from("properties")
        .select("id, name")
        .order("name", { ascending: true });

      if (clientId) {
        query = query.eq("client_id", clientId) as typeof query;
      }

      const { data } = await query;
      if (data) setProperties(data as PropertyRow[]);
      setPropertyId(""); // reset ao trocar de cliente
    }

    loadProperties();
  }, [clientId]);

  async function criarAnimal(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      internal_code: internalCode || null,
      birth_date: birthDate || null,
      sex: sex || null,
      breed: breed || null,
      current_property_id: propertyId || null,
      status: status || null,
      client_id: clientId || null,
    };

    const { error } = await supabase.from("animals").insert(payload);

    if (error) {
      setMessage(`Erro ao criar animal: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Animal criado com sucesso.");
    setInternalCode("");
    setBirthDate("");
    setSex("");
    setBreed("");
    setPropertyId("");
    setStatus("active");
    // mantém clientId para facilitar cadastro em série
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F7F4] text-[#1F2A1F]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <Link
            href="/animais"
            className="text-sm text-[#4A7C3A] hover:underline"
          >
            ← Voltar para Animais
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Novo animal
          </h1>
          <p className="mt-2 text-sm text-[#5F6B5F]">
            Registre um novo animal na base da Agraas.
          </p>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <form onSubmit={criarAnimal} className="space-y-5">

            {/* Cliente */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Código interno */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Código interno
              </label>
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
              <label className="mb-2 block text-sm font-medium">
                Data de nascimento
              </label>
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
              <label className="mb-2 block text-sm font-medium">
                Propriedade atual
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#4A7C3A]"
                required
                disabled={!clientId}
              >
                <option value="">
                  {clientId
                    ? "Selecione uma propriedade"
                    : "Selecione um cliente primeiro"}
                </option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name ?? property.id}
                  </option>
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

            {message ? (
              <div className="rounded-lg bg-[#F5F7F4] px-4 py-3 text-sm text-[#1F2A1F]">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
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
