"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimario, campo, rotuloCampo } from "../ui";
import { criarMaquina, type EstadoForm } from "../maquinas/actions";

const INICIAL: EstadoForm = { versao: 0 };

const TIPOS: [string, string][] = [
  ["trator", "Trator"], ["caminhonete", "Caminhonete"], ["caminhao", "Caminhão"],
  ["colheitadeira", "Colheitadeira"], ["pulverizador", "Pulverizador"], ["moto", "Moto"], ["outro", "Outro"],
];
const COM_ODOMETRO = new Set(["caminhonete", "caminhao", "moto"]);

/** Cadastro rápido de máquina: reaproveita a action do módulo de máquinas. */
export default function Passo2() {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState(criarMaquina, INICIAL);
  const v = estado.valores ?? {};
  const [tipo, setTipo] = useState("trator");
  const [medidor, setMedidor] = useState("horimetro");

  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, estado.versao, router]);

  function escolherTipo(t: string) {
    setTipo(t);
    setMedidor(COM_ODOMETRO.has(t) ? "odometro" : "horimetro");
  }

  return (
    <form key={estado.versao} action={acao} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="mq-nome" className={rotuloCampo}>Nome da máquina</label>
          <input id="mq-nome" name="nome" required maxLength={80} autoComplete="off" defaultValue={v.nome ?? ""}
            placeholder="Ex.: Trator John Deere 6110" className={campo} />
        </div>
        <div>
          <label htmlFor="mq-tipo" className={rotuloCampo}>Tipo</label>
          <select id="mq-tipo" name="tipo" className={campo} value={tipo} onChange={(e) => escolherTipo(e.target.value)}>
            {TIPOS.map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mq-medidor" className={rotuloCampo}>Como mede o uso</label>
          <select id="mq-medidor" name="medidor" className={campo} value={medidor} onChange={(e) => setMedidor(e.target.value)}>
            <option value="horimetro">Horímetro (horas)</option>
            <option value="odometro">Odômetro (km)</option>
          </select>
        </div>
      </div>

      <div aria-live="polite">
        {estado.erro && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
        {estado.ok && <p role="status" className="rounded-2xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">{estado.ok}</p>}
      </div>

      <button type="submit" disabled={pendente} className={`${btnPrimario} w-full !py-3.5 sm:w-auto`}>
        {pendente ? "Adicionando…" : "Adicionar máquina"}
      </button>
    </form>
  );
}
