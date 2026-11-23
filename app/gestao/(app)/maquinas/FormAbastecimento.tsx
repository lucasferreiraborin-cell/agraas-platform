"use client";

import { useActionState, useState } from "react";
import { btnPrimario, btnSecundario, rotuloCampo } from "../ui";
import { registrarAbastecimento, type EstadoForm } from "./actions";

type MaquinaOpcao = { id: string; nome: string; medidor: "horimetro" | "odometro" };
type Centro = { id: string; nome: string };
type Ultima = { leitura: number; data: string };

// Campos grandes para uso com luva e sol: mesma linguagem do `campo`, só maiores.
const grande =
  "w-full min-h-14 rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 text-[1.05rem] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

const INICIAL: EstadoForm = { versao: 0 };
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function FormAbastecimento({
  maquinas, centros, ultimas, maquinaInicial, hoje,
}: {
  maquinas: MaquinaOpcao[];
  centros: Centro[];
  ultimas: Record<string, Ultima>;
  maquinaInicial?: string;
  hoje: string;
}) {
  const [estado, acao, pendente] = useActionState(registrarAbastecimento, INICIAL);
  const [escolhida, setEscolhida] = useState(maquinaInicial ?? "");
  const v = estado.valores ?? {};
  const maq = maquinas.find((m) => m.id === escolhida);
  const horimetro = (maq?.medidor ?? "horimetro") === "horimetro";
  const ultima = maq ? ultimas[maq.id] : undefined;

  return (
    <form key={estado.versao} action={acao} className="space-y-4">
      <div>
        <label htmlFor="ab-maquina" className={rotuloCampo}>Máquina</label>
        <select
          id="ab-maquina" name="maquina_id" required className={grande}
          defaultValue={v.maquina_id ?? maquinaInicial ?? ""}
          onChange={(e) => setEscolhida(e.target.value)}
        >
          <option value="" disabled>Escolha a máquina</option>
          {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ab-litros" className={rotuloCampo}>Litros</label>
          <input
            id="ab-litros" name="litros" required type="number" inputMode="decimal" step="any" min="0.1"
            placeholder="Ex.: 120" defaultValue={v.litros ?? ""} className={grande}
          />
        </div>
        <div>
          <label htmlFor="ab-leitura" className={rotuloCampo}>
            {horimetro ? "Horímetro (horas)" : "Odômetro (km)"}
          </label>
          <input
            id="ab-leitura" name="leitura" required type="number" inputMode="decimal" step="any" min="0"
            placeholder={ultima ? `Última: ${fmt.format(ultima.leitura)}` : "Leitura do painel"}
            defaultValue={v.leitura ?? ""} className={grande} aria-describedby="ab-leitura-dica"
          />
          <p id="ab-leitura-dica" className="mt-1.5 text-[.78rem] text-[var(--text-muted)]">
            {ultima
              ? `Última leitura: ${fmt.format(ultima.leitura)} em ${dataBR(ultima.data)}.`
              : "Sem a leitura não dá para calcular o consumo."}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="ab-centro" className={rotuloCampo}>Centro de custo</label>
        <select id="ab-centro" name="centro_custo_id" className={grande} defaultValue={v.centro_custo_id ?? ""}>
          <option value="">Sem centro de custo</option>
          {centros.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <p className="mt-1.5 text-[.78rem] text-[var(--text-muted)]">
          Onde o diesel foi usado: talhão, lote ou estrutura. É daqui que sai o custo por centro.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ab-data" className={rotuloCampo}>Data</label>
          <input id="ab-data" name="data" type="date" max={hoje} defaultValue={v.data || hoje} className={grande} />
        </div>
        <div>
          <label htmlFor="ab-operador" className={rotuloCampo}>Operador (opcional)</label>
          <input
            id="ab-operador" name="operador" type="text" maxLength={80} autoComplete="off"
            defaultValue={v.operador ?? ""} className={grande}
          />
        </div>
      </div>

      <div aria-live="polite" className="space-y-3">
        {estado.erro && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>
        )}
        {estado.ok && (
          <p role="status" className="rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">
            {estado.ok}
          </p>
        )}
        {estado.aviso && (
          <div role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-[.88rem] text-amber-900">
            <p>{estado.aviso}</p>
            <p className="mt-1 text-[.8rem]">Corrija o valor acima ou grave mesmo assim.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={pendente} className={`${btnPrimario} min-h-14 w-full text-[1rem] sm:w-auto sm:px-8`}>
          {pendente ? "Gravando…" : "Registrar abastecimento"}
        </button>
        {estado.aviso && (
          <button type="submit" name="confirmar" value="1" disabled={pendente} className={`${btnSecundario} min-h-14 w-full sm:w-auto`}>
            Gravar mesmo assim
          </button>
        )}
      </div>
    </form>
  );
}
