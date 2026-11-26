import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { categoriasFaltando, TAXONOMIA_SUGERIDA, TIPO_CATEGORIA_NOME } from "@/lib/gestao/estoque";
import { Cartao, EmAtivacao, Selo, Titulo, btnPrimario, btnSecundario } from "../../ui";
import { usarSugestaoCategorias } from "../actions";
import { carregarCadastros } from "../dados";
import { AbasEstoque, Aviso, linkTexto } from "../ui-estoque";
import { FormCategoria } from "./FormCategoria";

export const metadata = { title: "Categorias" };
export const dynamic = "force-dynamic";

type Busca = { editar?: string; aviso?: string; n?: string; erro?: string };

function BotaoSugestao({ faltam, primario }: { faltam: number; primario: boolean }) {
  return (
    <form action={usarSugestaoCategorias}>
      <button type="submit" className={primario ? btnPrimario : btnSecundario}>
        {primario ? `Usar a sugestão (${faltam} categorias)` : `Adicionar as ${faltam} sugeridas que faltam`}
      </button>
    </form>
  );
}

export default async function CategoriasPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const { supabase, clientId } = await contextoGestao();
  const [cad, contasRes] = await Promise.all([
    carregarCadastros(supabase, clientId),
    supabase.from("chart_of_accounts").select("id, code, name").eq("client_id", clientId).eq("is_active", true).order("code").limit(500),
  ]);

  const cabecalho = (
    <>
      <Titulo titulo="Categorias" subtitulo="Os nomes que você reconhece para cada gasto e receita. Cada uma pode apontar para a conta do contador." />
      <AbasEstoque ativo="categorias" />
    </>
  );
  if (cad.ausente) return <>{cabecalho}<EmAtivacao modulo="Categorias" /></>;

  const contas = ((contasRes.data ?? []) as Array<{ id: string; code: string; name: string }>).map((c) => ({ id: c.id, codigo: c.code, nome: c.name }));
  const contaPorId = new Map(contas.map((c) => [c.id, c]));
  const faltam = categoriasFaltando(cad.categorias.map((c) => c.nome));
  const grupos = [...new Set([...cad.categorias.map((c) => c.grupo), ...TAXONOMIA_SUGERIDA.map((c) => c.grupo)])];
  const emEdicao = sp.editar ? cad.categorias.find((c) => c.id === sp.editar) : undefined;
  const porGrupo = new Map<string, typeof cad.categorias>();
  for (const c of cad.categorias) porGrupo.set(c.grupo, [...(porGrupo.get(c.grupo) ?? []), c]);

  const aviso = sp.aviso === "sugestao"
    ? Number(sp.n) > 0 ? `${sp.n} categorias criadas. Edite à vontade: renomeie, desative ou ligue à conta do contador.` : "Você já tinha todas as categorias sugeridas."
    : null;
  const erro = sp.erro === "ativacao" ? "As categorias ainda estão sendo ligadas à sua conta. Tente em instantes."
    : sp.erro ? "Não foi possível criar as categorias agora. Tente de novo." : null;

  return (
    <>
      {cabecalho}
      <div className="space-y-5">
        {aviso && <Aviso tom="ok">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {cad.categorias.length === 0 ? (
          <Cartao titulo="Comece pela sugestão">
            <p className="text-[.9rem] text-[var(--text-secondary)]">
              {TAXONOMIA_SUGERIDA.length} categorias em 10 grupos, do adubo ao arrendamento. Você edita depois: renomeia, desativa, cria as suas.
            </p>
            <div className="mt-4"><BotaoSugestao faltam={faltam.length} primario /></div>
            <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...new Set(TAXONOMIA_SUGERIDA.map((c) => c.grupo))].map((g) => (
                <div key={g}>
                  <p className="text-[.78rem] font-semibold text-[var(--text-primary)]">{g}</p>
                  <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                    {TAXONOMIA_SUGERIDA.filter((c) => c.grupo === g).map((c) => c.nome).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </Cartao>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <Cartao
              titulo={`Suas categorias (${cad.categorias.length})`}
              className="lg:col-span-2"
            >
              {faltam.length > 0 && (
                <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[.85rem] text-[var(--text-secondary)]">
                    {faltam.length} {faltam.length === 1 ? "categoria sugerida ainda não está" : "categorias sugeridas ainda não estão"} na sua lista.
                  </p>
                  <BotaoSugestao faltam={faltam.length} primario={false} />
                </div>
              )}
              <div className="space-y-6">
                {[...porGrupo.entries()].map(([grupo, itens]) => (
                  <section key={grupo} aria-label={grupo}>
                    <h3 className="text-[.72rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{grupo}</h3>
                    <ul className="mt-2 divide-y divide-[var(--border)]">
                      {itens.map((c) => {
                        const conta = c.contaContabilId ? contaPorId.get(c.contaContabilId) : undefined;
                        return (
                          <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                              <p className={`font-semibold [overflow-wrap:anywhere] ${c.ativo ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"}`}>{c.nome}</p>
                              <p className="text-[.78rem] text-[var(--text-muted)]">
                                {TIPO_CATEGORIA_NOME[c.tipo]}{conta ? ` · conta ${conta.codigo} ${conta.nome}` : " · sem conta do contador"}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              {!c.ativo && <Selo>Inativa</Selo>}
                              <Link href={`/gestao/estoque/categorias?editar=${c.id}`} className={linkTexto} aria-label={`Editar ${c.nome}`}>Editar</Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </Cartao>

            <Cartao titulo={emEdicao ? `Editar: ${emEdicao.nome}` : "Nova categoria"}>
              <FormCategoria
                grupos={grupos}
                contas={contas}
                categoria={emEdicao ? {
                  id: emEdicao.id, grupo: emEdicao.grupo, nome: emEdicao.nome, tipo: emEdicao.tipo,
                  contaId: emEdicao.contaContabilId ?? "", ativo: emEdicao.ativo,
                } : undefined}
              />
            </Cartao>
          </div>
        )}
      </div>
    </>
  );
}
