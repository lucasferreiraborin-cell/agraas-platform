import Link from "next/link";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { dataBR, hojeISO } from "@/lib/gestao/format";
import { conferenciaTanque, lerQuantidade, saldosPorAlmoxarifado, TOLERANCIA_TANQUE, totaisDeMovimentos } from "@/lib/gestao/estoque";
import { Cartao, EmAtivacao, Kpi, Titulo, Vazio, btnPrimario, btnSecundario, campo, rotuloCampo } from "../../ui";
import { lancarAjusteConferencia } from "../saida/actions";
import { carregarCadastros, carregarLotes } from "../dados";
import { AbasEstoque, Aviso, Barra, linkTexto, qtd } from "../ui-estoque";

export const metadata = { title: "Conferência do tanque" };
export const dynamic = "force-dynamic";

type Busca = { par?: string; contagem?: string; aviso?: string; dif?: string; erro?: string };
const ERROS: Record<string, string> = {
  dados: "Contagem inválida. Use só números (ex.: 1.850 ou 1850,5).",
  motivo: "O ajuste pede um motivo.",
  ativacao: "O estoque ainda está sendo ligado à sua conta. Tente em instantes.",
  saldo: "O saldo mudou enquanto você conferia. Confira de novo.",
  falha: "Não foi possível lançar o ajuste. Tente de novo.",
};
const L = (v: number | null) => (v === null ? "—" : `${qtd(v)} L`);

export default async function TanquePage({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const { supabase, clientId } = await contextoGestao();
  const [cad, { lotes }] = await Promise.all([carregarCadastros(supabase, clientId), carregarLotes(supabase, clientId)]);

  const cabecalho = (
    <>
      <Titulo titulo="Conferência do tanque" subtitulo="Comprado menos o que saiu dá o que deveria estar no tanque. A régua diz o que está. A diferença é perda ou desvio a explicar." />
      <AbasEstoque ativo="tanque" />
    </>
  );
  if (cad.ausente) return <>{cabecalho}<EmAtivacao modulo="Conferência do tanque" /></>;

  const tanques = cad.almoxarifados.filter((a) => a.tipo === "combustivel");
  if (tanques.length === 0) {
    return (
      <>
        {cabecalho}
        <Vazio
          titulo="Nenhum tanque cadastrado"
          texto="Cadastre o tanque de diesel como almoxarifado do tipo “Tanque de combustível”, com a capacidade em litros."
          acao={<Link href="/gestao/estoque/almoxarifados" className={btnPrimario}>Cadastrar o tanque</Link>}
        />
      </>
    );
  }

  const ids = tanques.map((t) => t.id);
  const { data: movRows, error: movErro } = await supabase
    .from("stock_movements")
    .select("product_id, almoxarifado_id, movement_type, destino_tipo, quantity")
    .eq("client_id", clientId)
    .in("almoxarifado_id", ids)
    .limit(20000);
  const movs = ((movRows ?? []) as Array<Record<string, unknown>>).map((m) => ({
    productId: String(m.product_id ?? ""), almoxarifadoId: String(m.almoxarifado_id ?? ""),
    movementType: (m.movement_type as string | null) ?? null, destinoTipo: (m.destino_tipo as string | null) ?? null,
    quantidade: Number(m.quantity ?? 0),
  }));

  const saldos = saldosPorAlmoxarifado(lotes).filter((s) => s.almoxarifadoId && ids.includes(s.almoxarifadoId));
  const porProduto = new Map(cad.produtos.map((p) => [p.id, p]));
  const pares = new Map<string, { produtoId: string; almoxId: string }>();
  for (const s of saldos) pares.set(`${s.productId}:${s.almoxarifadoId}`, { produtoId: s.productId, almoxId: s.almoxarifadoId! });
  for (const m of movs) if (m.productId && m.almoxarifadoId) pares.set(`${m.productId}:${m.almoxarifadoId}`, { produtoId: m.productId, almoxId: m.almoxarifadoId });

  const hoje = hojeISO();
  const dif = sp.dif ? Number(sp.dif) : null;

  return (
    <>
      {cabecalho}
      <div className="space-y-5">
        {sp.aviso === "ajustado" && dif !== null && Number.isFinite(dif) && (
          <Aviso tom="ok">Ajuste de {dif > 0 ? "+" : "−"}{qtd(Math.abs(dif))} L lançado. O saldo do tanque agora é a contagem da régua; o motivo fica na auditoria.</Aviso>
        )}
        {sp.aviso === "sem-diferenca" && <Aviso tom="ok">A régua bateu com o sistema. Nada a ajustar.</Aviso>}
        {sp.erro && <Aviso tom="erro">{ERROS[sp.erro] ?? ERROS.falha}</Aviso>}
        {movErro && !tabelaAusente(movErro) && <Aviso tom="alerta">Não foi possível ler as movimentações. O saldo esperado vem só dos lotes.</Aviso>}

        {pares.size === 0 && (
          <Vazio titulo="Tanque sem diesel lançado" texto="Dê entrada na nota de diesel para o tanque. Depois disso, cada abastecimento registrado em Máquinas e diesel tira do tanque." acao={<Link href="/gestao/estoque/entrada" className={btnSecundario}>Entrada de notas</Link>} />
        )}

        {[...pares.entries()].map(([chave, par]) => {
          const tanque = tanques.find((t) => t.id === par.almoxId)!;
          const prod = porProduto.get(par.produtoId);
          const s = saldos.find((x) => x.productId === par.produtoId && x.almoxarifadoId === par.almoxId);
          const saldo = s?.saldo ?? 0;
          const { entradas, saidas } = totaisDeMovimentos(movs.filter((m) => m.productId === par.produtoId && m.almoxarifadoId === par.almoxId));
          const contando = sp.par === chave;
          const contagem = contando ? lerQuantidade(sp.contagem) : null;
          const conf = conferenciaTanque({ entradas, saidas, saldoSistema: saldo, contagem, capacidade: tanque.capacidadeLitros });
          const ocupacao = tanque.capacidadeLitros ? saldo / tanque.capacidadeLitros : null;
          const formId = `ct-${chave.slice(0, 8)}-${chave.slice(37, 45)}`;
          return (
            <Cartao key={chave} titulo={`${tanque.nome} · ${prod?.nome ?? "Produto"}`}>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi rotulo="Comprado (entradas)" valor={L(entradas)} />
                <Kpi rotulo="Saiu (abastecimentos e ajustes)" valor={L(saidas)} />
                <Kpi rotulo="Deveria ter no tanque" valor={L(saldo)} tom={saldo < 0 ? "perigo" : "neutro"}
                  detalhe={saldo < 0 ? "Negativo: falta lançar nota de diesel" : Math.abs(entradas - saidas - saldo) > 0.01 ? "Pelo saldo dos lotes" : undefined} />
                <Kpi rotulo="Capacidade" valor={tanque.capacidadeLitros ? L(tanque.capacidadeLitros) : "—"}
                  detalhe={ocupacao !== null ? `${Math.round(Math.max(0, ocupacao) * 100)}% ocupado` : "Informe no cadastro do tanque"} />
              </div>
              {ocupacao !== null && <div className="mt-3"><Barra fracao={ocupacao} tom={ocupacao > 1 ? "perigo" : "verde"} /></div>}

              <form method="get" action="/gestao/estoque/tanque" className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
                <input type="hidden" name="par" value={chave} />
                <div className="min-w-0 sm:w-64">
                  <label htmlFor={`${formId}-contagem`} className={rotuloCampo}>Contagem na régua (litros)</label>
                  <input id={`${formId}-contagem`} name="contagem" required inputMode="decimal" autoComplete="off"
                    defaultValue={contando ? sp.contagem ?? "" : ""} placeholder="Ex.: 1.850" className={campo} />
                </div>
                <button type="submit" className={btnSecundario}>Comparar</button>
              </form>

              {contando && conf.situacao === "contagem_invalida" && <Aviso tom="erro" className="mt-4">{ERROS.dados}</Aviso>}
              {contando && conf.diferenca !== null && (
                <div className="mt-4 space-y-3">
                  {conf.situacao === "acima_da_capacidade" ? (
                    <Aviso tom="erro">A contagem passa da capacidade do tanque ({L(tanque.capacidadeLitros)}). Confira a leitura da régua ou a capacidade cadastrada.</Aviso>
                  ) : (
                    <Aviso tom={conf.situacao === "dentro_da_tolerancia" ? "ok" : conf.situacao === "perda" ? "erro" : "alerta"}>
                      <p className="font-semibold">
                        {conf.diferenca === 0 ? "Bateu." : conf.diferenca < 0 ? `Faltam ${L(-conf.diferenca)} no tanque.` : `Sobram ${L(conf.diferenca)} no tanque.`}
                        {conf.percentual !== null && conf.diferenca !== 0 ? ` (${(Math.abs(conf.percentual) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% do comprado)` : ""}
                      </p>
                      <p className="mt-1">
                        {conf.situacao === "dentro_da_tolerancia"
                          ? `Dentro de ${TOLERANCIA_TANQUE * 100}% do comprado: medição (temperatura e régua), não perda.`
                          : conf.situacao === "perda"
                            ? "Perda ou desvio a explicar: abastecimento não registrado, vazamento ou retirada."
                            : "Sobra: abastecimento lançado a mais, nota de diesel em dobro ou saldo inicial que não entrou."}
                      </p>
                    </Aviso>
                  )}
                  {conf.diferenca !== 0 && conf.situacao !== "acima_da_capacidade" && (
                    <form action={lancarAjusteConferencia} className="rounded-2xl border border-[var(--border)] p-4">
                      <input type="hidden" name="produto_id" value={par.produtoId} />
                      <input type="hidden" name="almoxarifado_id" value={par.almoxId} />
                      <input type="hidden" name="contagem" value={String(contagem)} />
                      <label htmlFor={`${formId}-motivo`} className={rotuloCampo}>Motivo do ajuste</label>
                      <input id={`${formId}-motivo`} name="motivo" required minLength={3} maxLength={300} className={campo}
                        defaultValue={`Conferência do tanque em ${dataBR(hoje)}: régua ${qtd(contagem)} L, sistema ${qtd(saldo)} L`} />
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[.78rem] text-[var(--text-muted)]">O saldo do tanque passa a ser a contagem. Fica registrado quem lançou e por quê.</p>
                        <button type="submit" className={btnPrimario}>
                          Lançar ajuste de {conf.diferenca > 0 ? "+" : "−"}{qtd(Math.abs(conf.diferenca))} L
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </Cartao>
          );
        })}

        <p className="text-[.78rem] text-[var(--text-muted)]">
          Outro produto (peça, insumo) contou diferente? Use <Link href="/gestao/estoque/saida" className={linkTexto}>Saídas → Ajuste</Link> com o motivo.
        </p>
      </div>
    </>
  );
}
