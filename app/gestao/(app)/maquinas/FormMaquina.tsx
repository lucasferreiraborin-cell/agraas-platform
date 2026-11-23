"use client";

import { useActionState } from "react";
import { btnPrimario, campo, rotuloCampo } from "../ui";
import { criarMaquina, type EstadoForm } from "./actions";

const INICIAL: EstadoForm = { versao: 0 };

const TIPOS: [string, string][] = [
  ["trator", "Trator"], ["caminhonete", "Caminhonete"], ["caminhao", "Caminhão"],
  ["colheitadeira", "Colheitadeira"], ["pulverizador", "Pulverizador"], ["moto", "Moto"], ["outro", "Outro"],
];

export function FormMaquina() {
  const [estado, acao, pendente] = useActionState(criarMaquina, INICIAL);
  const v = estado.valores ?? {};

  return (
    <form key={estado.versao} action={acao} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="mq-nome" className={rotuloCampo}>Nome</label>
          <input id="mq-nome" name="nome" required maxLength={80} autoComplete="off" defaultValue={v.nome ?? ""}
            placeholder="Ex.: Trator John Deere 6110" className={campo} />
        </div>
        <div>
          <label htmlFor="mq-tipo" className={rotuloCampo}>Tipo</label>
          <select id="mq-tipo" name="tipo" className={campo} defaultValue={v.tipo ?? "trator"}>
            {TIPOS.map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mq-medidor" className={rotuloCampo}>Medidor</label>
          <select id="mq-medidor" name="medidor" className={campo} defaultValue={v.medidor ?? "horimetro"}>
            <option value="horimetro">Horímetro (horas)</option>
            <option value="odometro">Odômetro (km)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="mq-placa" className={rotuloCampo}>Placa ou série (opcional)</label>
          <input id="mq-placa" name="placa_ou_serie" maxLength={40} autoComplete="off" defaultValue={v.placa_ou_serie ?? ""} className={campo} />
        </div>
      </div>

      <div aria-live="polite">
        {estado.erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
        {estado.ok && (
          <p role="status" className="rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">{estado.ok}</p>
        )}
      </div>

      <button type="submit" disabled={pendente} className={`${btnPrimario} w-full sm:w-auto`}>
        {pendente ? "Cadastrando…" : "Cadastrar máquina"}
      </button>
    </form>
  );
}
