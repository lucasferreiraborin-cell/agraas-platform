import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, dataBR } from "@/lib/gestao/format";
import {
  categoriaPorNcm, conversaoParaProdutoNovo, formatarNcm, indexar, nomeSugerido, normalizarDoc, resolverItem,
  type ViaSugestao,
} from "@/lib/gestao/de-para";
import { categoriaGerencialSugerida, DESTINO_NOME, idDaCategoria, normalizarNomeCategoria, type DestinoTipo } from "@/lib/gestao/estoque";
import { BotaoLink, Cartao, EmAtivacao, Selo, Titulo, btnSecundario, campo } from "../../../ui";
import { carregarCadastros, carregarCentros, carregarLotes, carregarMaquinasAtivas, type Almoxarifado, type Categoria } from "../../dados";
import { AbasEstoque, Aviso, custoUnit, linkTexto, qtdUn } from "../../ui-estoque";
import { estornarEntrada } from "../actions";
import { ConferenciaNota, type LinhaConferencia } from "../ConferenciaNota";
import { carregarApelidos, carregarNotaParaConferencia } from "../dados";

export const metadata = { title: "Conferir nota" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIA: Record<ViaSugestao, string> = {
  gtin: "mesmo código de barras", mesmo_nome: "mesmo nome", ncm_nome: "mesmo NCM e nome parecido", ncm: "mesmo NCM", nome: "nome parecido",
};
const ERROS: Record<string, string> = {
  movimentado: "Parte deste lote já saiu do estoque (ou foi usada em outra entrada). Em vez de desfazer, registre um ajuste em Saídas.",
  motivo: "Diga em poucas palavras por que a entrada vai ser desfeita.",
  ativacao: "O estoque ainda está sendo ligado à sua conta. Tente em instantes.",
  estorno: "Não foi possível desfazer agora. Tente de novo.",
};

/** Almoxarifado provável para um produto novo, pelo grupo da categoria sugerida. */
function almoxSugerido(categoriaId: string | null, categorias: Categoria[], almox: Almoxarifado[]): string | null {
  const ativos = almox.filter((a) => a.ativo);
  if (ativos.length === 0) return null;
  const cat = categorias.find((c) => c.id === categoriaId);
  const nome = normalizarNomeCategoria(cat?.nome);
  const grupo = normalizarNomeCategoria(cat?.grupo);
  const tipo = nome === "diesel" || nome.startsWith("gasolina") ? "combustivel"
    : grupo.startsWith("maquinas") || nome.startsWith("oleos") || nome.startsWith("arla") ? "pecas"
    : grupo.startsWith("insumos") ? "insumos" : null;
  return (tipo ? ativos.find((a) => a.tipo === tipo)?.id : undefined)
    ?? ativos.find((a) => a.tipo === "geral")?.id ?? (ativos.length === 1 ? ativos[0].id : null);
}

export default async function ConferirNotaPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origem?: string; aviso?: string; erro?: string; n?: string; ign?: string; prod?: string; forn?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const { supabase, clientId } = await contextoGestao();

  const [cad, nota, { apelidos }, maquinas, centros, { lotes }] = await Promise.all([
    carregarCadastros(supabase, clientId),
    carregarNotaParaConferencia(supabase, clientId, id, sp.origem === "legado" ? "legado" : "canonica"),
    carregarApelidos(supabase, clientId),
    carregarMaquinasAtivas(supabase, clientId),
    carregarCentros(supabase, clientId),
    carregarLotes(supabase, clientId),
  ]);

  const voltar = <p className="mb-3 text-[.85rem]"><Link href="/gestao/estoque/entrada" className={linkTexto}>← Entrada de notas</Link></p>;
  if (cad.ausente) return <>{voltar}<Titulo titulo="Conferir nota" /><AbasEstoque ativo="entrada" /><EmAtivacao modulo="Entrada de notas no estoque" /></>;
  if (!nota) notFound();

  const titulo = nota.numero ? `NF-e ${nota.numero}` : "NF-e sem número";
  const subtitulo = [nota.emitente, dataBR(nota.data), nota.valor !== null ? brl(nota.valor) : null].filter(Boolean).join(" · ");
  const cabecalho = <>{voltar}<Titulo titulo={titulo} subtitulo={subtitulo} acao={<BotaoLink href={`/gestao/notas/${nota.id}${nota.origem === "legado" ? "?origem=legado" : ""}`}>Ver a nota</BotaoLink>} /><AbasEstoque ativo="entrada" /></>;

  if (!nota.compra) {
    return (
      <>
        {cabecalho}
        <Aviso tom="info">Pelos dados da nota, ela é uma venda (ou contranota) da fazenda — não entra no estoque. Se for uma compra, confira o emitente e o destinatário na nota.</Aviso>
      </>
    );
  }

  const categoriasAtivas = cad.categorias.filter((c) => c.ativo);
  const almoxAtivos = cad.almoxarifados.filter((a) => a.ativo);
  const produtosAtivos = cad.produtos.filter((p) => p.ativo);
  const nomeCat = new Map(cad.categorias.map((c) => [c.id, c.nome]));
  const historico = cad.produtos
    .filter((p) => p.ncm && p.categoriaId && nomeCat.has(p.categoriaId))
    .map((p) => ({ ncm: p.ncm, categoriaNome: nomeCat.get(p.categoriaId!)! }));
  const indice = indexar(produtosAtivos.map((p) => ({ id: p.id, nome: p.nome, unidade: p.unidade, categoria: p.categoriaPlataforma, ncm: p.ncm })), apelidos);
  const apelidoPorId = new Map(apelidos.map((a) => [a.id, a]));

  const pendentes = nota.itens.filter((i) => !i.loteId);
  const lancados = nota.itens.filter((i) => i.loteId);

  const linhas: LinhaConferencia[] = pendentes.map((i) => {
    const r = resolverItem({ descricao: i.descricao, ncm: i.ncm, gtin: i.gtin, fornecedorDoc: nota.emitenteDoc }, indice);
    const sug = r.ligado ? null : r.sugestoes[0] ?? null;
    const ap = r.ligado && r.apelidoId ? apelidoPorId.get(r.apelidoId) : undefined;
    const conv = conversaoParaProdutoNovo({ descricao: i.descricao, unidade: i.unidade });
    const cat = categoriaGerencialSugerida({ ncm: i.ncm, descricao: i.descricao }, historico);
    const categoriaSugerida = idDaCategoria(categoriasAtivas, cat?.nome);
    return {
      itemId: i.id,
      descricao: i.descricao,
      ncmFmt: i.ncm ? formatarNcm(i.ncm) : null,
      unidadeNota: i.unidade,
      quantidadeNota: i.quantidade,
      unitario: i.unitario,
      total: i.total,
      produtoSugerido: r.ligado ? r.produtoId : sug?.produtoId ?? null,
      confianca: r.ligado ? "lembrado" : sug?.confianca ?? null,
      via: r.ligado ? "confirmado numa nota anterior deste fornecedor" : sug ? VIA[sug.via] : null,
      apelido: ap ? { produtoId: ap.produtoId, unidadeNota: ap.unidadeNota, fatorConversao: ap.fatorConversao } : null,
      novoNome: nomeSugerido(i.descricao) || i.descricao.slice(0, 120),
      novoUnidade: conv.unidade,
      novoFator: conv.fator,
      categoriaSugerida,
      categoriaMotivo: categoriaSugerida ? cat?.motivo ?? null : null,
      categoriaPlataforma: categoriaPorNcm(i.ncm, i.descricao)?.categoria ?? null,
      almoxSugerido: almoxSugerido(categoriaSugerida, cad.categorias, cad.almoxarifados),
    };
  });

  // Fornecedor: aviso de cadastro automático quando o emitente ainda não está nos fornecedores.
  let fornecedorAviso: string | null = null;
  const doc = normalizarDoc(nota.emitenteDoc);
  if (pendentes.length > 0 && (doc || nota.emitente)) {
    const { data: forn } = await supabase.from("suppliers").select("cnpj, name").eq("client_id", clientId).limit(2000);
    const existe = (forn ?? []).some((f) => (doc && normalizarDoc(String(f.cnpj ?? "")) === doc)
      || (!doc && normalizarNomeCategoria(String(f.name ?? "")) === normalizarNomeCategoria(nota.emitente)));
    if (!existe) fornecedorAviso = `${nota.emitente ?? "O emitente"} entra nos seus fornecedores ao confirmar (fica registrado na auditoria).`;
  }

  // Itens já lançados: lote, produto e destino.
  const idsLote = lancados.map((i) => i.loteId!);
  const { data: movs } = idsLote.length > 0
    ? await supabase.from("stock_movements").select("batch_id, destino_tipo, maquina_id, centro_custo_id").eq("client_id", clientId).in("batch_id", idsLote)
    : { data: [] as Array<Record<string, unknown>> };
  const destinoDoLote = new Map(((movs ?? []) as Array<Record<string, unknown>>).filter((m) => m.destino_tipo && m.destino_tipo !== "entrada").map((m) => [String(m.batch_id), m]));
  const nomeMaq = new Map(maquinas.map((m) => [m.id, m.nome]));
  const nomeCentro = new Map(centros.map((c) => [c.id, c.nome]));
  const nomeAlmox = new Map(cad.almoxarifados.map((a) => [a.id, a.nome]));
  const porProduto = new Map(cad.produtos.map((p) => [p.id, p]));
  const porLote = new Map(lotes.map((l) => [l.id, l]));

  const contagem = (v: string | undefined) => Math.max(0, Math.trunc(Number(v) || 0));
  const [nLanc, nIgn, nProd, nForn] = [contagem(sp.n), contagem(sp.ign), contagem(sp.prod), contagem(sp.forn)];
  const aviso = sp.aviso === "estornado"
    ? "Entrada desfeita. O item voltou para a conferência."
    : sp.aviso === "entrada"
      ? [
          `${nLanc} ${nLanc === 1 ? "item entrou" : "itens entraram"} no estoque com o custo da nota.`,
          nIgn > 0 ? `${nIgn} já ${nIgn === 1 ? "tinha entrado" : "tinham entrado"} antes.` : "",
          nProd > 0 ? `${nProd} ${nProd === 1 ? "produto novo cadastrado" : "produtos novos cadastrados"}.` : "",
          nForn > 0 ? "Fornecedor cadastrado pelo emitente da nota (fica na auditoria)." : "",
        ].filter(Boolean).join(" ")
      : null;
  const erro = sp.erro ? ERROS[sp.erro] ?? ERROS.estorno : null;

  return (
    <>
      {cabecalho}
      <div className="space-y-5">
        {aviso && <Aviso tom="ok">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {cad.falhou && <Aviso tom="alerta">Parte dos cadastros não pôde ser lida agora. Atualize antes de confirmar.</Aviso>}

        {pendentes.length > 0 && (categoriasAtivas.length === 0 || almoxAtivos.length === 0) && (
          <Aviso tom="alerta">
            Antes da primeira entrada:{" "}
            {categoriasAtivas.length === 0 && <><Link href="/gestao/estoque/categorias" className={linkTexto}>crie as categorias</Link>{almoxAtivos.length === 0 ? " e " : "."}</>}
            {almoxAtivos.length === 0 && <><Link href="/gestao/estoque/almoxarifados" className={linkTexto}>cadastre um almoxarifado</Link>.</>}
            {" "}Aplicação direta em máquina ou centro já funciona sem almoxarifado.
          </Aviso>
        )}

        {pendentes.length > 0 ? (
          <Cartao titulo={`Conferir ${pendentes.length} ${pendentes.length === 1 ? "item" : "itens"}`}>
            <p className="mb-4 text-[.85rem] text-[var(--text-secondary)]">
              Confira o produto, a quantidade na unidade do estoque e o destino. O custo é o da nota; converter a unidade muda a quantidade, nunca o valor.
            </p>
            <ConferenciaNota
              key={pendentes.map((i) => i.id).join(",")}
              notaId={nota.id}
              origem={nota.origem}
              linhas={linhas}
              produtos={produtosAtivos.map((p) => ({ id: p.id, nome: p.nome, unidade: p.unidade, categoriaId: p.categoriaId, almoxPadraoId: p.almoxarifadoPadraoId }))}
              categorias={categoriasAtivas.map((c) => ({ id: c.id, nome: c.nome, grupo: c.grupo }))}
              almoxarifados={almoxAtivos.map((a) => ({ id: a.id, nome: a.nome }))}
              maquinas={maquinas}
              centros={centros}
              fornecedorAviso={fornecedorAviso}
            />
          </Cartao>
        ) : (
          <Aviso tom="ok">Todos os itens desta nota já estão no estoque.</Aviso>
        )}

        {lancados.length > 0 && (
          <Cartao titulo={`Já no estoque (${lancados.length})`}>
            <ul className="divide-y divide-[var(--border)]">
              {lancados.map((i) => {
                const lote = porLote.get(i.loteId!);
                const prod = lote ? porProduto.get(lote.productId) : undefined;
                const mov = destinoDoLote.get(i.loteId!);
                const direto = !!mov;
                const destino = direto
                  ? [DESTINO_NOME[(mov.destino_tipo as DestinoTipo)] ?? "Aplicação direta", mov.maquina_id ? nomeMaq.get(String(mov.maquina_id)) : null, mov.centro_custo_id ? nomeCentro.get(String(mov.centro_custo_id)) : null].filter(Boolean).join(" · ")
                  : lote?.almoxarifadoId ? nomeAlmox.get(lote.almoxarifadoId) ?? "Almoxarifado" : "Sem almoxarifado (aprovada na controladoria)";
                const podeDesfazer = !!lote && (direto || lote.quantidade === lote.recebido);
                return (
                  <li key={i.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{prod?.nome ?? i.descricao}</p>
                        <p className="text-[.8rem] text-[var(--text-muted)] [overflow-wrap:anywhere]">Item da nota: {i.descricao} · {destino}</p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="font-semibold tabular-nums">{lote ? qtdUn(lote.recebido, prod?.unidade) : "—"}</p>
                        <p className="text-[.78rem] tabular-nums text-[var(--text-muted)]">{lote ? custoUnit(lote.custoUnit, prod?.unidade) : ""}</p>
                      </div>
                    </div>
                    {podeDesfazer ? (
                      <details className="mt-2">
                        <summary className="w-fit cursor-pointer rounded text-[.8rem] font-semibold text-[var(--danger)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                          Desfazer esta entrada
                        </summary>
                        <form action={estornarEntrada} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                          <input type="hidden" name="lote" value={i.loteId!} />
                          <input type="hidden" name="voltar" value={`/gestao/estoque/entrada/${nota.id}`} />
                          <div className="min-w-0 flex-1">
                            <label htmlFor={`motivo-${i.id}`} className="mb-1.5 block text-[.78rem] font-semibold text-[var(--text-secondary)]">Motivo</label>
                            <input id={`motivo-${i.id}`} name="motivo" required minLength={3} maxLength={300} placeholder="Ex.: produto errado na conferência" className={campo} />
                          </div>
                          <button type="submit" className={btnSecundario}>Desfazer</button>
                        </form>
                      </details>
                    ) : lote ? (
                      <p className="mt-1.5"><Selo>Já teve saída: corrija com ajuste</Selo></p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Cartao>
        )}
      </div>
    </>
  );
}
