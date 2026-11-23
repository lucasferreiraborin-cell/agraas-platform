import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { custoDe, litrosPorCentro, precoMedioPonderado, resumirMaquina } from "@/lib/gestao/diesel";
import { brl, dataBR, hojeISO, limitesDoMes, num } from "@/lib/gestao/format";
import { BotaoLink, Cartao, EmAtivacao, Kpi, Selo, Tabela, Titulo, Vazio, td, th } from "../../ui";
import {
  carregarAbastecimentos, carregarCentros, carregarComprasDiesel,
  ORIGEM_NOME, TIPO_MAQUINA, UUID, type Maquina,
} from "../dados";

export const metadata = { title: "Máquina · diesel" };

const BARRAS = 12;

export default async function MaquinaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, clientId } = await contextoGestao();

  const { data: m, error } = await supabase
    .from("maquinas")
    .select("id, nome, tipo, placa_ou_serie, medidor, ativo")
    .eq("id", id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (tabelaAusente(error)) {
    return (
      <>
        <Titulo titulo="Máquinas e diesel" />
        <EmAtivacao modulo="Máquinas e diesel" />
      </>
    );
  }
  if (error) {
    return (
      <>
        <Titulo titulo="Máquina" acao={<BotaoLink href="/gestao/maquinas">Voltar</BotaoLink>} />
        <Vazio titulo="Não foi possível carregar agora" texto="Atualize a página em instantes." />
      </>
    );
  }
  if (!m) notFound();
  const maquina = m as unknown as Maquina;

  const [ab, centros, notas] = await Promise.all([
    carregarAbastecimentos(supabase, clientId, id),
    carregarCentros(supabase, clientId),
    carregarComprasDiesel(supabase, clientId),
  ]);
  const abastecimentos = ab.abastecimentos;
  const precoRef = precoMedioPonderado(notas.compras);

  const resumo = resumirMaquina(abastecimentos, maquina.medidor);
  const hoje = hojeISO();
  const { inicio, fim } = limitesDoMes(hoje);
  const custoMes = custoDe(abastecimentos.filter((a) => a.data >= inicio && a.data <= fim), precoRef);
  const custoTotal = custoDe(abastecimentos, precoRef);

  const nomeCentro = new Map(centros.map((c) => [c.id, c.nome]));
  const porCentro = [...litrosPorCentro(abastecimentos, precoRef)]
    .map(([cid, c]) => ({ nome: cid ? (nomeCentro.get(cid) ?? "Centro removido") : "Sem centro de custo", ...c }))
    .sort((a, b) => b.litros - a.litros);

  const barras = resumo.intervalos.slice(-BARRAS);
  const maximo = Math.max(...barras.map((b) => b.consumo), 0);
  const unidade = resumo.unidade;
  const horimetro = maquina.medidor === "horimetro";

  return (
    <>
      <Titulo
        titulo={maquina.nome}
        subtitulo={`${TIPO_MAQUINA[maquina.tipo] ?? maquina.tipo}${maquina.placa_ou_serie ? ` · ${maquina.placa_ou_serie}` : ""} · ${horimetro ? "horímetro" : "odômetro"}`}
        acao={<BotaoLink href="/gestao/maquinas">Todas as máquinas</BotaoLink>}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
          <Kpi rotulo="Consumo médio" valor={resumo.consumoMedio != null ? `${num(resumo.consumoMedio, 2)} ${unidade}` : "—"}
            detalhe={resumo.consumoMedio != null ? `${resumo.intervalos.length} ${resumo.intervalos.length === 1 ? "intervalo" : "intervalos"} entre leituras` : "Precisa de duas leituras"} />
          <Kpi rotulo="Custo no mês" valor={custoMes.custo > 0 ? brl(custoMes.custo) : "—"}
            detalhe={custoMes.litrosSemPreco > 0 ? `${num(custoMes.litrosSemPreco)} L sem preço` : `${num(custoMes.litros)} L no mês`} />
          <Kpi rotulo="Custo acumulado" valor={custoTotal.custo > 0 ? brl(custoTotal.custo) : "—"}
            detalhe={`${num(custoTotal.litros)} L em ${abastecimentos.length} ${abastecimentos.length === 1 ? "registro" : "registros"}`} />
          <Kpi rotulo="Último abastecimento" valor={dataBR(resumo.ultimoAbastecimento)} />
        </div>

        {(custoTotal.estimado || custoTotal.litrosSemPreco > 0) && (
          <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[.85rem] text-amber-900">
            {custoTotal.litrosSemPreco > 0
              ? "Parte dos litros não tem preço, porque não há nota de diesel importada. Esses litros ficam fora do custo."
              : "Abastecimentos sem preço gravado foram avaliados pelo preço médio das notas de diesel."}
          </p>
        )}

        <Cartao titulo="Consumo ao longo do tempo">
          {barras.length === 0 ? (
            <Vazio
              titulo="Ainda sem consumo calculado"
              texto={`Registre pelo menos dois abastecimentos com a leitura do ${horimetro ? "horímetro" : "odômetro"} para ver o consumo em ${unidade}.`}
            />
          ) : (
            <>
              <p className="mb-4 text-[.82rem] text-[var(--text-muted)]">
                {unidade} em cada intervalo entre leituras (últimos {barras.length}).
                {" "}Barra em âmbar: mais de 20% acima da média das outras leituras
                {!horimetro && ", ou seja, rendimento menor"}.
              </p>
              <ol
                className="flex h-44 items-end gap-1 border-b border-[var(--border)] sm:gap-2"
                aria-label={`Consumo em ${unidade} por intervalo, do mais antigo ao mais recente`}
              >
                {barras.map((b, i) => {
                  const altura = maximo > 0 ? Math.max(4, Math.round((b.consumo / maximo) * 100)) : 4;
                  return (
                    <li
                      key={`${b.data}-${i}`}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                      title={`${dataBR(b.data)}: ${num(b.consumo, 2)} ${unidade}${b.foraDoPadrao ? " (fora do padrão)" : ""}`}
                    >
                      <span className="mb-1 max-w-full truncate text-[.65rem] tabular-nums text-[var(--text-secondary)] sm:text-[.72rem]">
                        {num(b.consumo)}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`w-full rounded-t-md ${b.foraDoPadrao ? "bg-amber-500" : "bg-[var(--primary)]"}`}
                        style={{ height: `${altura * 0.75}%` }}
                      />
                      <span className="sr-only">
                        {dataBR(b.data)}: {num(b.consumo, 2)} {unidade}{b.foraDoPadrao ? ", fora do padrão" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-1 flex justify-between text-[.7rem] text-[var(--text-muted)]" aria-hidden="true">
                <span>{dataBR(barras[0].data)}</span>
                <span>{dataBR(barras[barras.length - 1].data)}</span>
              </div>
            </>
          )}
          {resumo.leiturasInconsistentes > 0 && (
            <p role="note" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[.85rem] text-amber-900">
              {resumo.leiturasInconsistentes} {resumo.leiturasInconsistentes === 1 ? "leitura voltou ou repetiu" : "leituras voltaram ou repetiram"} em relação à anterior
              e ficou fora do cálculo. Confira os registros abaixo.
            </p>
          )}
          <p className="mt-4 text-[.78rem] text-[var(--text-muted)]">
            O consumo pressupõe tanque cheio a cada abastecimento. Com tanque parcial, os valores oscilam.
          </p>
        </Cartao>

        <Cartao titulo="Custo por centro de custo">
          {porCentro.length === 0 ? (
            <Vazio titulo="Sem abastecimentos" texto="Quando houver registros, o diesel aparece dividido por centro de custo." />
          ) : (
            <Tabela>
              <thead>
                <tr>
                  <th className={th}>Centro</th>
                  <th className={`${th} text-right`}>Litros</th>
                  <th className={`${th} text-right`}>Custo</th>
                </tr>
              </thead>
              <tbody>
                {porCentro.map((c) => (
                  <tr key={c.nome}>
                    <td className={td}>{c.nome}</td>
                    <td className={`${td} text-right tabular-nums`}>{num(c.litros)}</td>
                    <td className={`${td} text-right tabular-nums`}>{c.custo > 0 ? brl(c.custo) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </Cartao>

        <Cartao titulo="Abastecimentos" acao={<Link href="/gestao/maquinas#abastecer" className="text-[.85rem] font-semibold text-[var(--primary-hover)] hover:underline">Registrar</Link>}>
          {abastecimentos.length === 0 ? (
            <Vazio titulo="Nenhum abastecimento" texto="Esta máquina ainda não tem registros." />
          ) : (
            <Tabela>
              <thead>
                <tr>
                  <th className={th}>Data</th>
                  <th className={`${th} text-right`}>Litros</th>
                  <th className={`${th} text-right`}>{horimetro ? "Horímetro" : "Odômetro"}</th>
                  <th className={`${th} text-right`}>Preço/L</th>
                  <th className={th}>Centro</th>
                  <th className={th}>Operador</th>
                  <th className={th}>Origem</th>
                </tr>
              </thead>
              <tbody>
                {abastecimentos.slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td className={`${td} whitespace-nowrap`}>{dataBR(a.data)}</td>
                    <td className={`${td} text-right tabular-nums`}>{num(a.litros)}</td>
                    <td className={`${td} text-right tabular-nums`}>{a.medidor_leitura != null ? num(a.medidor_leitura) : "—"}</td>
                    <td className={`${td} text-right tabular-nums`}>{a.preco_litro != null ? brl(a.preco_litro) : "—"}</td>
                    <td className={td}>{(a.centro_custo_id && nomeCentro.get(a.centro_custo_id)) || "—"}</td>
                    <td className={td}>{a.operador || "—"}</td>
                    <td className={td}>{a.origem === "tag" ? <Selo tom="verde">Tag</Selo> : (ORIGEM_NOME[a.origem] ?? a.origem)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
          {abastecimentos.length > 50 && (
            <p className="mt-3 text-[.78rem] text-[var(--text-muted)]">Mostrando os 50 mais recentes de {abastecimentos.length}.</p>
          )}
        </Cartao>
      </div>
    </>
  );
}
