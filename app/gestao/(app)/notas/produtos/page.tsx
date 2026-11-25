import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, dataBR } from "@/lib/gestao/format";
import {
  CATEGORIAS, CATEGORIA_NOME, categoriaPorNcm, conversaoParaProdutoNovo, fatorParaProduto, formatarNcm,
  nomeSugerido, rotuloCategoria,
  type Confianca, type GrupoPendente, type ViaSugestao,
} from "@/lib/gestao/de-para";
import { BotaoLink, Cartao, EmAtivacao, Kpi, Selo, Titulo, Vazio, btnPrimario, btnSecundario, campo, rotuloCampo } from "../../ui";
import { criarProdutoELigar, desligarApelido, ligarProduto } from "./actions";
import { carregarDePara, type ApelidoLinha, type ProdutoLinha } from "./dados";

export const metadata = { title: "Produtos da nota" };

export const dynamic = "force-dynamic";

type Busca = { aviso?: string; erro?: string; apelido?: string };

/** Itens pendentes mostrados de uma vez (os mais frequentes primeiro). */
const LIMITE_LISTA = 40;

const CONFIANCA: Record<Confianca, { rotulo: string; tom: "verde" | "alerta" | "neutro" }> = {
  alta: { rotulo: "Confiança alta", tom: "verde" },
  media: { rotulo: "Confiança média", tom: "alerta" },
  baixa: { rotulo: "Confiança baixa", tom: "neutro" },
};
const VIA: Record<ViaSugestao, string> = {
  gtin: "mesmo código de barras",
  mesmo_nome: "mesmo nome",
  ncm_nome: "mesmo NCM e nome parecido",
  ncm: "mesmo NCM",
  nome: "nome parecido",
};
const ERROS: Record<string, string> = {
  dados: "Não foi possível ler os dados do item. Atualize a página e tente de novo.",
  produto: "Produto não encontrado. A lista foi atualizada.",
  nome: "Dê ao produto um nome com pelo menos 2 letras.",
  categoria: "Escolha uma categoria da lista.",
  fator: "Conversão inválida: use um número maior que zero, como 20 ou 0,5.",
  "nao-encontrado": "Essa ligação já tinha sido desfeita.",
  ativacao: "O módulo ainda está em ativação. Tente em instantes.",
  falha: "Não foi possível salvar agora. Tente de novo.",
};

const curto = (s: string, max = 28) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const linkVoltar = "font-semibold text-[var(--primary-hover)] underline-offset-2 hover:underline focus-visible:underline";
const fmtFator = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });

/** "Cada GL desta nota entra como 20 L no estoque." — só quando há conversão de fato. */
function frasesConversao(unNota: string, fator: number | null, unProduto: string | null | undefined): string | null {
  if (!unNota || !unProduto) return null;
  if (fator === null) {
    return unNota.toLowerCase() === unProduto.trim().toLowerCase()
      ? null
      : `Sem conversão automática de ${unNota} para ${unProduto}. Informe em “Escolher outro”, se precisar.`;
  }
  if (fator === 1 && unNota.toLowerCase() === unProduto.trim().toLowerCase()) return null;
  return `Cada ${unNota} desta nota entra como ${fmtFator(fator)} ${unProduto} no estoque.`;
}

/** CNPJ/CPF para leitura humana; alfanumérico sai como veio. */
function docLegivel(doc: string): string {
  if (/^\d{14}$/.test(doc)) return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (/^\d{11}$/.test(doc)) return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return doc;
}

/** Os dados do item que toda ação precisa. A chave é recalculada no servidor. */
function CamposItem({ g }: { g: GrupoPendente }) {
  return (
    <>
      <input type="hidden" name="descricao" value={g.descricao} />
      <input type="hidden" name="fornecedor_doc" value={g.fornecedorDoc ?? ""} />
      <input type="hidden" name="ncm" value={g.ncm ?? ""} />
      <input type="hidden" name="gtin" value={g.gtin ?? ""} />
      <input type="hidden" name="unidade_nota" value={(g.unidade ?? "").trim().toUpperCase().slice(0, 10)} />
    </>
  );
}

function ItemPendente({ g, i, produtos, unidadeDe }: {
  g: GrupoPendente; i: number; produtos: ProdutoLinha[]; unidadeDe: Map<string, string | null>;
}) {
  const [top, ...outras] = g.sugestoes;
  const nomeNovo = nomeSugerido(g.descricao) || g.descricao.slice(0, 120);
  const catNcm = categoriaPorNcm(g.ncm, g.descricao);
  const categoria = catNcm?.categoria ?? "outro";
  const unNota = (g.unidade ?? "").trim().toUpperCase().slice(0, 10);
  // O produto novo nasce na unidade de medida (L, KG...), não na embalagem.
  const conv = conversaoParaProdutoNovo({ descricao: g.descricao, unidade: g.unidade });
  const unidadeTop = top ? (unidadeDe.get(top.produtoId) ?? null) : null;
  const conversaoTop = top
    ? frasesConversao(unNota, fatorParaProduto({ descricao: g.descricao, unidade: g.unidade }, unidadeTop), unidadeTop)
    : null;
  const conversaoNovo = frasesConversao(unNota, conv.fator, conv.unidade);
  const detalhes = [
    g.fornecedorNome ?? (g.fornecedorDoc ? docLegivel(g.fornecedorDoc) : "Fornecedor não identificado"),
    g.ncm ? `NCM ${formatarNcm(g.ncm)}` : null,
    g.ultimoPreco !== null ? `${brl(g.ultimoPreco)}${unNota ? ` / ${unNota}` : ""}` : null,
    g.ultimaData ? dataBR(g.ultimaData) : null,
  ].filter(Boolean).join(" · ");

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{g.descricao}</p>
        {g.ocorrencias > 1 && <Selo>{g.ocorrencias} notas</Selo>}
      </div>
      <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)] [overflow-wrap:anywhere]">{detalhes}</p>

      {top ? (
        <div className="mt-3 rounded-2xl bg-[var(--surface-soft)] px-3.5 py-3">
          <p className="text-[.92rem] text-[var(--text-primary)] [overflow-wrap:anywhere]">
            É o seu <strong className="font-semibold">“{top.nome}”</strong>?
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[.78rem] text-[var(--text-muted)]">
            <Selo tom={CONFIANCA[top.confianca].tom}>{CONFIANCA[top.confianca].rotulo}</Selo>
            <span>{VIA[top.via]}</span>
          </p>
          {conversaoTop && <p className="mt-1.5 text-[.8rem] text-[var(--text-secondary)]">{conversaoTop}</p>}
        </div>
      ) : (
        <div className="mt-3 text-[.86rem] text-[var(--text-secondary)]">
          <p>Nenhum produto seu parecido com este. Crie com 1 clique; as próximas notas com este nome já entram ligadas.</p>
          {conversaoNovo && <p className="mt-1 text-[.8rem]">{conversaoNovo}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start gap-2">
        {top && (
          <form action={ligarProduto}>
            <CamposItem g={g} />
            <input type="hidden" name="produto_id" value={top.produtoId} />
            <button type="submit" className={btnPrimario} aria-label={`Confirmar: ${g.descricao} é ${top.nome}`}>
              Confirmar
            </button>
          </form>
        )}
        <form action={criarProdutoELigar}>
          <CamposItem g={g} />
          <input type="hidden" name="nome" value={nomeNovo} />
          <input type="hidden" name="categoria" value={categoria} />
          <input type="hidden" name="unidade" value={conv.unidade ?? ""} />
          <button
            type="submit"
            className={top ? btnSecundario : btnPrimario}
            aria-label={top ? `Criar novo produto “${nomeNovo}” e ligar este item` : `Criar “${nomeNovo}” e ligar este item`}
          >
            {top ? "Criar novo" : `Criar “${curto(nomeNovo)}”`}
          </button>
        </form>

        <details className="open:basis-full">
          <summary className={`${btnSecundario} cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden`}>
            Escolher outro
          </summary>
          <div className="mt-3 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-3.5 sm:p-4">
            {outras.length > 0 && (
              <div>
                <p className={rotuloCampo}>Outros parecidos</p>
                <div className="flex flex-wrap gap-2">
                  {outras.map((s) => (
                    <form key={s.produtoId} action={ligarProduto}>
                      <CamposItem g={g} />
                      <input type="hidden" name="produto_id" value={s.produtoId} />
                      <button type="submit" className={btnSecundario} aria-label={`${s.nome}: ligar este item (${CONFIANCA[s.confianca].rotulo.toLowerCase()}, ${VIA[s.via]})`}>
                        {curto(s.nome, 32)}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            )}

            {produtos.length > 0 && (
              <form action={ligarProduto} className="space-y-2">
                <CamposItem g={g} />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`produto-${i}`} className={rotuloCampo}>Ligar a um produto do seu catálogo</label>
                    <select id={`produto-${i}`} name="produto_id" required defaultValue="" className={campo}>
                      <option value="" disabled>Escolha o produto</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}{p.unidade ? ` (${p.unidade})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  {unNota && (
                    <div className="sm:w-40">
                      <label htmlFor={`fator-ligar-${i}`} className={rotuloCampo}>1 {unNota} vale</label>
                      <input id={`fator-ligar-${i}`} name="fator" inputMode="decimal" maxLength={20} placeholder="automático" className={campo} />
                    </div>
                  )}
                  <button type="submit" className={btnSecundario}>Ligar</button>
                </div>
                {unNota && (
                  <p className="text-[.76rem] text-[var(--text-muted)]">
                    Quanto vale 1 {unNota} da nota na unidade do produto. Em branco, a conversão é calculada pela descrição.
                  </p>
                )}
              </form>
            )}

            <form action={criarProdutoELigar} className="space-y-3">
              <CamposItem g={g} />
              <p className="text-[.82rem] font-semibold text-[var(--text-primary)]">Ou criar com outro nome</p>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="min-w-0">
                  <label htmlFor={`nome-${i}`} className={rotuloCampo}>Nome do produto</label>
                  <input id={`nome-${i}`} name="nome" required minLength={2} maxLength={120} defaultValue={nomeNovo} className={campo} />
                </div>
                <div className="min-w-0">
                  <label htmlFor={`categoria-${i}`} className={rotuloCampo}>Categoria</label>
                  <select id={`categoria-${i}`} name="categoria" defaultValue={categoria} className={campo}>
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>{CATEGORIA_NOME[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-80">
                <div className="min-w-0">
                  <label htmlFor={`unidade-${i}`} className={rotuloCampo}>Unidade do produto</label>
                  <input id={`unidade-${i}`} name="unidade" maxLength={10} defaultValue={conv.unidade ?? ""} placeholder="L, KG, UN" className={campo} />
                </div>
                {unNota && (
                  <div className="min-w-0">
                    <label htmlFor={`fator-criar-${i}`} className={rotuloCampo}>1 {unNota} vale</label>
                    <input
                      id={`fator-criar-${i}`} name="fator" inputMode="decimal" maxLength={20}
                      defaultValue={conv.fator !== null ? fmtFator(conv.fator) : ""} placeholder="automático" className={campo}
                    />
                  </div>
                )}
              </div>
              {catNcm && g.ncm && (
                <p className="text-[.76rem] text-[var(--text-muted)]">
                  Categoria sugerida pelo NCM {formatarNcm(g.ncm)}. Troque se não for o caso.
                </p>
              )}
              <button type="submit" className={btnPrimario}>Criar e ligar</button>
            </form>
          </div>
        </details>
      </div>
    </li>
  );
}

/** Produtos do catálogo que já têm nome de nota ligado, com os nomes e o botão de desligar. */
function SeusProdutos({ produtos, porId, porProduto, fornecedores }: {
  produtos: ProdutoLinha[];
  porId: Map<string, ApelidoLinha[]>;
  porProduto: Map<string, number>;
  fornecedores: Map<string, string>;
}) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {produtos.map((p) => {
        const nomes = porId.get(p.id) ?? [];
        const itens = porProduto.get(p.id) ?? 0;
        return (
          <li key={p.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{p.nome}</p>
                <p className="text-[.78rem] text-[var(--text-muted)]">
                  {[rotuloCategoria(p.categoria), p.unidade, p.ncm ? `NCM ${formatarNcm(p.ncm)}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Selo tom={itens > 0 ? "verde" : "neutro"}>{itens} {itens === 1 ? "item" : "itens"}</Selo>
            </div>
            {nomes.length > 0 && (
              <details className="mt-1.5">
                <summary className="w-fit cursor-pointer rounded text-[.8rem] font-semibold text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                  {nomes.length} {nomes.length === 1 ? "nome de nota ligado" : "nomes de nota ligados"}
                </summary>
                <ul className="mt-2 space-y-2">
                  {nomes.map((a) => {
                    const fornecedor = a.fornecedorDoc ? (fornecedores.get(a.fornecedorDoc) ?? docLegivel(a.fornecedorDoc)) : "sem fornecedor identificado";
                    const rotulo = a.textoOriginal ?? a.texto;
                    const conversao = a.unidadeNota && a.fatorConversao !== null
                      ? ` · 1 ${a.unidadeNota} = ${fmtFator(a.fatorConversao)}${p.unidade ? ` ${p.unidade}` : ""}`
                      : "";
                    return (
                      <li key={a.id} className="flex items-start justify-between gap-3 text-[.82rem]">
                        <span className="min-w-0 text-[var(--text-secondary)] [overflow-wrap:anywhere]">
                          {rotulo}
                          <span className="text-[var(--text-muted)]"> · {fornecedor}{conversao}</span>
                        </span>
                        <form action={desligarApelido} className="shrink-0">
                          <input type="hidden" name="id" value={a.id} />
                          <button
                            type="submit"
                            aria-label={`Desligar "${rotulo}" de ${p.nome}`}
                            className="rounded-full px-2 py-0.5 text-[.78rem] font-semibold text-[var(--danger)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                          >
                            Desligar
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function ProdutosDaNotaPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const { supabase, clientId } = await contextoGestao();
  const dados = await carregarDePara(supabase, clientId);

  const voltar = (
    <p className="mb-3 text-[.85rem]">
      <Link href="/gestao/notas" className={linkVoltar}>← Notas fiscais</Link>
    </p>
  );
  const titulo = (
    <Titulo
      titulo="Produtos da nota"
      subtitulo="Cada fornecedor escreve o mesmo produto de um jeito. Confirme uma vez: nas próximas notas, ele entra ligado sozinho."
    />
  );

  if (dados.ausente) {
    return (
      <>
        {voltar}
        {titulo}
        <EmAtivacao modulo="Produtos da nota" />
      </>
    );
  }

  const { produtos, apelidos, pendentes, ligados, porProduto, fornecedores } = dados;
  const nomeProduto = new Map(produtos.map((p) => [p.id, p.nome]));
  const unidadeDe = new Map(produtos.map((p) => [p.id, p.unidade]));
  const apelidosPorProduto = new Map<string, ApelidoLinha[]>();
  for (const a of apelidos) {
    const l = apelidosPorProduto.get(a.produtoId);
    if (l) l.push(a);
    else apelidosPorProduto.set(a.produtoId, [a]);
  }
  const comNomes = produtos.filter((p) => apelidosPorProduto.has(p.id));
  const semNomes = produtos.length - comNomes.length;

  const apelidoAviso = sp.apelido ? apelidos.find((a) => a.id === sp.apelido) : undefined;
  const aviso =
    sp.aviso === "ligado" || sp.aviso === "criado"
      ? apelidoAviso
        ? `${sp.aviso === "criado" ? "Produto criado. " : ""}“${apelidoAviso.textoOriginal ?? apelidoAviso.texto}” agora é “${nomeProduto.get(apelidoAviso.produtoId) ?? "seu produto"}”. Na próxima nota deste fornecedor, entra ligado sozinho.`
        : sp.aviso === "criado" ? "Produto criado e ligado." : "Ligação salva."
      : sp.aviso === "desfeito" ? "Ligação desfeita. O item voltou para a lista."
      : undefined;
  const erro = sp.erro ? ERROS[sp.erro] : undefined;

  const visiveis = pendentes.slice(0, LIMITE_LISTA);

  return (
    <>
      {voltar}
      {titulo}

      {aviso && (
        <div role="status" className="mb-4 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-3 text-[.85rem] text-[var(--primary-hover)] sm:flex-row sm:items-center sm:justify-between">
          <p className="[overflow-wrap:anywhere]">{aviso}</p>
          {apelidoAviso && (sp.aviso === "ligado" || sp.aviso === "criado") && (
            <form action={desligarApelido} className="shrink-0">
              <input type="hidden" name="id" value={apelidoAviso.id} />
              <button type="submit" className="rounded-full font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                Desfazer
              </button>
            </form>
          )}
        </div>
      )}
      {erro && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.85rem] text-red-700">{erro}</p>}
      {dados.parcial && (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[.83rem] text-amber-800">
          Não foi possível ler todas as notas agora. A lista pode estar incompleta.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Kpi
          rotulo="A ligar"
          valor={String(pendentes.length)}
          tom={pendentes.length > 0 ? "alerta" : "neutro"}
          detalhe={pendentes.length === 1 ? "nome de produto nas notas" : "nomes de produto nas notas"}
        />
        <Kpi rotulo="Entraram ligados" valor={String(ligados)} tom={ligados > 0 ? "verde" : "neutro"} detalhe="itens de nota reconhecidos" />
        <div className="col-span-2 lg:col-span-1">
          <Kpi rotulo="Produtos no catálogo" valor={String(produtos.length)} detalhe="o mesmo cadastro do estoque" />
        </div>
      </div>

      <div className="space-y-5">
        {pendentes.length === 0 ? (
          dados.analisados === 0 ? (
            <Vazio
              titulo="Nenhum item de nota ainda"
              texto="Envie uma nota de compra. Os itens aparecem aqui para você ligar aos seus produtos."
              acao={<BotaoLink href="/gestao/notas">Enviar uma nota</BotaoLink>}
            />
          ) : (
            <Vazio
              titulo="Tudo ligado"
              texto="Todos os itens das suas notas já estão ligados a um produto seu. Nota nova com nome conhecido entra sozinha."
            />
          )
        ) : (
          <Cartao titulo={`Para ligar (${pendentes.length})`}>
            <ul className="divide-y divide-[var(--border)]">
              {visiveis.map((g, i) => (
                <ItemPendente key={g.chave} g={g} i={i} produtos={produtos} unidadeDe={unidadeDe} />
              ))}
            </ul>
            {pendentes.length > visiveis.length && (
              <p className="mt-4 text-[.78rem] text-[var(--text-muted)]">
                Mostrando os {visiveis.length} nomes que mais aparecem. Os outros surgem aqui conforme você liga estes.
              </p>
            )}
          </Cartao>
        )}

        <Cartao titulo={`Produtos com nome de nota ligado (${comNomes.length})`}>
          {comNomes.length === 0 ? (
            <p className="text-[.88rem] text-[var(--text-muted)]">
              Nenhuma ligação ainda. Confirme ou crie um produto acima e ele aparece aqui, com os nomes de nota que reconhece.
            </p>
          ) : (
            <SeusProdutos produtos={comNomes} porId={apelidosPorProduto} porProduto={porProduto} fornecedores={fornecedores} />
          )}
          {semNomes > 0 && (
            <p className="mt-4 text-[.78rem] text-[var(--text-muted)]">
              Mais {semNomes} {semNomes === 1 ? "produto" : "produtos"} no catálogo sem nome de nota ligado. Eles aparecem na opção “Escolher outro”.
            </p>
          )}
        </Cartao>
      </div>
    </>
  );
}
