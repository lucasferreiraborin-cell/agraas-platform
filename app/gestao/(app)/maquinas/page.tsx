import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { analisarDiesel, custoDe, type Medidor } from "@/lib/gestao/diesel";
import { brl, dataBR, hojeISO, limitesDoMes, num, somaDias } from "@/lib/gestao/format";
import {
  BotaoLink, Cartao, EmAtivacao, Kpi, Selo, Tabela, Titulo, Vazio, btnSecundario, td, th,
} from "../ui";
import {
  carregarAbastecimentos, carregarCentros, carregarComprasDiesel, carregarMaquinas,
  ORIGEM_NOME, TIPO_MAQUINA,
} from "./dados";
import { FormAbastecimento } from "./FormAbastecimento";
import { FormMaquina } from "./FormMaquina";

export const metadata = { title: "Máquinas e diesel" };

const litros = (v: number) => `${num(v)} L`;
const linkMaquina = "font-semibold text-[var(--primary-hover)] underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

export default async function MaquinasPage() {
  const { supabase, clientId } = await contextoGestao();

  const [mq, ab, centros, notas] = await Promise.all([
    carregarMaquinas(supabase, clientId),
    carregarAbastecimentos(supabase, clientId),
    carregarCentros(supabase, clientId),
    carregarComprasDiesel(supabase, clientId),
  ]);

  if (mq.ausente || ab.ausente) {
    return (
      <>
        <Titulo titulo="Máquinas e diesel" />
        <EmAtivacao modulo="Máquinas e diesel" />
      </>
    );
  }
  if (mq.error || ab.error) {
    return (
      <>
        <Titulo titulo="Máquinas e diesel" />
        <Vazio titulo="Não foi possível carregar agora" texto="Atualize a página em instantes. Se continuar, avise o suporte." />
      </>
    );
  }

  const { maquinas } = mq;
  const { abastecimentos } = ab; // do mais recente para o mais antigo
  const { compras } = notas;
  const hoje = hojeISO();
  const { inicio, fim } = limitesDoMes(hoje);
  const corteAlerta = somaDias(hoje, -30);

  const medidores = Object.fromEntries(maquinas.map((m) => [m.id, m.medidor])) as Record<string, Medidor>;
  const analise = analisarDiesel({ comprasDiesel: compras, abastecimentos }, medidores);
  const doMes = abastecimentos.filter((a) => a.data >= inicio && a.data <= fim);
  const custoMes = custoDe(doMes, analise.precoMedio);

  const nomeMaquina = new Map(maquinas.map((m) => [m.id, m.nome]));
  const nomeCentro = new Map(centros.map((c) => [c.id, c.nome]));

  const ultimas: Record<string, { leitura: number; data: string }> = {};
  for (const a of abastecimentos) {
    if (a.medidor_leitura != null && !ultimas[a.maquina_id]) ultimas[a.maquina_id] = { leitura: a.medidor_leitura, data: a.data };
  }

  const semNotas = compras.length === 0;
  const { conferencia, estoque } = analise;

  const kpiEstoque = semNotas
    ? { valor: "—", detalhe: "Sem nota de diesel importada", tom: "neutro" as const }
    : { valor: litros(estoque.saldo), detalhe: `${litros(estoque.comprado)} comprados − ${litros(estoque.abastecido)} abastecidos`, tom: estoque.saldo < 0 ? "perigo" as const : "neutro" as const };

  const kpiConferencia =
    conferencia.situacao === "sem_compras"
      ? { valor: "—", detalhe: "Precisa de nota de diesel para comparar", tom: "neutro" as const }
      : conferencia.situacao === "conciliado"
        ? { valor: "Conciliado", detalhe: `Diferença de ${litros(Math.abs(estoque.saldo))}, dentro de 5%`, tom: "verde" as const }
        : conferencia.situacao === "abastecido_acima"
          ? { valor: `−${litros(conferencia.litros)}`, detalhe: "Abastecido acima do comprado. Falta nota?", tom: "perigo" as const }
          : { valor: litros(conferencia.litros), detalhe: "Comprado e não abastecido. Confira o tanque.", tom: "alerta" as const };

  return (
    <>
      <Titulo
        titulo="Máquinas e diesel"
        subtitulo="Da nota de diesel ao custo por máquina e por centro."
        acao={maquinas.length > 0 ? <BotaoLink href="#abastecer" primario>Registrar abastecimento</BotaoLink> : undefined}
      />

      <div className="space-y-6">
        {semNotas && (
          <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[.85rem] text-amber-900">
            {notas.falhou
              ? "Não foi possível ler as notas fiscais agora. O estoque e o preço médio ficam vazios até a próxima atualização."
              : "Nenhuma nota de diesel (NCM 2710.19.21) encontrada. Os números abaixo vêm só dos abastecimentos; o estoque e o preço médio aparecem quando uma NF-e de diesel entrar."}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-5">
          <Kpi rotulo="Diesel em estoque" valor={kpiEstoque.valor} detalhe={kpiEstoque.detalhe} tom={kpiEstoque.tom} />
          <Kpi
            rotulo="Gasto no mês"
            valor={custoMes.custo > 0 ? brl(custoMes.custo) : "—"}
            detalhe={
              custoMes.litrosSemPreco > 0
                ? `${litros(custoMes.litrosSemPreco)} sem preço, fora da conta`
                : custoMes.estimado ? "Inclui estimativa pelo preço médio" : undefined
            }
          />
          <Kpi
            rotulo="Preço médio do litro"
            valor={analise.precoMedio != null ? brl(analise.precoMedio) : "—"}
            detalhe={analise.precoMedio != null ? "Média ponderada das notas" : "Sem nota de diesel"}
          />
          <Kpi rotulo="Abastecido no mês" valor={litros(custoMes.litros)} detalhe={`${doMes.length} ${doMes.length === 1 ? "registro" : "registros"}`} />
          <Kpi rotulo="Comprado × abastecido" valor={kpiConferencia.valor} detalhe={kpiConferencia.detalhe} tom={kpiConferencia.tom} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Cartao titulo="Registrar abastecimento" className="scroll-mt-4 lg:col-span-2">
            <div id="abastecer" className="scroll-mt-24" />
            {maquinas.length === 0 ? (
              <p className="text-[.9rem] text-[var(--text-muted)]">Cadastre a primeira máquina abaixo para começar a registrar.</p>
            ) : (
              <FormAbastecimento
                maquinas={maquinas.filter((m) => m.ativo).map((m) => ({ id: m.id, nome: m.nome, medidor: m.medidor }))}
                centros={centros}
                ultimas={ultimas}
                hoje={hoje}
              />
            )}
          </Cartao>

          <Cartao titulo="Tag de abastecimento">
            <Selo>Em integração</Selo>
            <p className="mt-3 text-[.88rem] leading-relaxed text-[var(--text-secondary)]">
              Os abastecimentos poderão entrar sozinhos pela tag do parceiro de hardware, sem digitar no celular.
              A integração ainda não está ativa: hoje o registro é manual ou por planilha.
            </p>
          </Cartao>
        </div>

        <Cartao titulo="Máquinas">
          {maquinas.length === 0 ? (
            <Vazio titulo="Nenhuma máquina cadastrada" texto="Cadastre tratores, caminhonetes e demais máquinas para acompanhar o consumo." />
          ) : (
            <Tabela>
              <thead>
                <tr>
                  <th className={th}>Máquina</th>
                  <th className={`${th} text-right`}>Consumo médio</th>
                  <th className={`${th} text-right`}>Custo no mês</th>
                  <th className={th}>Último abastecimento</th>
                  <th className={th}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {maquinas.map((m) => {
                  const r = analise.porMaquina.get(m.id);
                  const custo = custoDe(doMes.filter((a) => a.maquina_id === m.id), analise.precoMedio);
                  const consumoAlto = r?.intervalos.some((i) => i.foraDoPadrao && i.data >= corteAlerta) ?? false;
                  return (
                    <tr key={m.id}>
                      <td className={td}>
                        <Link href={`/gestao/maquinas/${m.id}`} className={linkMaquina}>{m.nome}</Link>
                        <p className="text-[.75rem] text-[var(--text-muted)]">
                          {TIPO_MAQUINA[m.tipo] ?? m.tipo}{m.placa_ou_serie ? ` · ${m.placa_ou_serie}` : ""}{m.ativo ? "" : " · inativa"}
                        </p>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {r?.consumoMedio != null ? `${num(r.consumoMedio, 2)} ${r.unidade}` : "—"}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {custo.custo > 0 ? brl(custo.custo) : custo.litros > 0 ? `${litros(custo.litros)} s/ preço` : "—"}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{dataBR(r?.ultimoAbastecimento)}</td>
                      <td className={td}>
                        {consumoAlto ? <Selo tom="alerta">Consumo alto</Selo>
                          : (r?.leiturasInconsistentes ?? 0) > 0 ? <Selo tom="alerta">Conferir leituras</Selo>
                          : r?.consumoMedio != null ? <Selo tom="verde">No padrão</Selo>
                          : <span title="Precisa de duas leituras do medidor"><Selo>Sem base</Selo></span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabela>
          )}

          <details className="mt-5 rounded-xl border border-[var(--border)]" open={maquinas.length === 0}>
            <summary className={`${btnSecundario} w-full cursor-pointer list-none justify-start border-0 sm:w-auto [&::-webkit-details-marker]:hidden`}>
              Nova máquina
            </summary>
            <div className="border-t border-[var(--border)] p-4"><FormMaquina /></div>
          </details>
        </Cartao>

        <Cartao titulo="Abastecimentos recentes">
          {abastecimentos.length === 0 ? (
            <Vazio titulo="Nenhum abastecimento registrado" texto="O primeiro registro leva menos de um minuto, direto do celular." />
          ) : (
            <Tabela>
              <thead>
                <tr>
                  <th className={th}>Data</th>
                  <th className={th}>Máquina</th>
                  <th className={`${th} text-right`}>Litros</th>
                  <th className={`${th} text-right`}>Leitura</th>
                  <th className={th}>Centro</th>
                  <th className={th}>Operador</th>
                  <th className={th}>Origem</th>
                </tr>
              </thead>
              <tbody>
                {abastecimentos.slice(0, 15).map((a) => (
                  <tr key={a.id}>
                    <td className={`${td} whitespace-nowrap`}>{dataBR(a.data)}</td>
                    <td className={td}>
                      <Link href={`/gestao/maquinas/${a.maquina_id}`} className={linkMaquina}>{nomeMaquina.get(a.maquina_id) ?? "Máquina"}</Link>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{num(a.litros)}</td>
                    <td className={`${td} text-right tabular-nums`}>{a.medidor_leitura != null ? num(a.medidor_leitura) : "—"}</td>
                    <td className={td}>{(a.centro_custo_id && nomeCentro.get(a.centro_custo_id)) || "—"}</td>
                    <td className={td}>{a.operador || "—"}</td>
                    <td className={td}>{ORIGEM_NOME[a.origem] ?? a.origem}</td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </Cartao>
      </div>
    </>
  );
}
