import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { formatarNcm } from "@/lib/gestao/de-para";
import { alertaEstoque, saldoPorProduto, saldosPorAlmoxarifado } from "@/lib/gestao/estoque";
import { BotaoLink, Cartao, EmAtivacao, Selo, Tabela, Titulo, Vazio, btnSecundario, td, th } from "../../ui";
import { carregarCadastros, carregarLotes } from "../dados";
import { AbasEstoque, Aviso, linkTexto, qtdUn } from "../ui-estoque";
import { FormProduto } from "./FormProduto";

export const metadata = { title: "Produtos do estoque" };
export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const { supabase, clientId } = await contextoGestao();
  const [cad, { lotes }] = await Promise.all([carregarCadastros(supabase, clientId), carregarLotes(supabase, clientId)]);

  const cabecalho = (
    <>
      <Titulo titulo="Produtos" subtitulo="Cada produto com unidade, categoria e almoxarifado padrão. A categoria é obrigatória: sem ela o gasto some dos relatórios." />
      <AbasEstoque ativo="produtos" />
    </>
  );
  if (cad.ausente) return <>{cabecalho}<EmAtivacao modulo="Produtos do estoque" /></>;

  const categorias = cad.categorias.filter((c) => c.ativo);
  const almoxAtivos = cad.almoxarifados.filter((a) => a.ativo);
  const nomeCat = new Map(cad.categorias.map((c) => [c.id, c.nome]));
  const nomeAlmox = new Map(cad.almoxarifados.map((a) => [a.id, a.nome]));
  const saldo = saldoPorProduto(saldosPorAlmoxarifado(lotes));
  const produtos = [...cad.produtos].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"));
  const semCategoria = produtos.filter((p) => p.ativo && !p.categoriaId).length;

  return (
    <>
      {cabecalho}
      <div className="space-y-5">
        {cad.falhou && <Aviso tom="alerta">Parte dos cadastros não pôde ser lida agora. A lista pode estar incompleta.</Aviso>}
        {categorias.length === 0 && (
          <Aviso tom="alerta">
            Antes do primeiro produto, crie as categorias.{" "}
            <Link href="/gestao/estoque/categorias" className={linkTexto}>Usar a sugestão de categorias</Link>
          </Aviso>
        )}
        {semCategoria > 0 && (
          <Aviso tom="alerta">
            {semCategoria} {semCategoria === 1 ? "produto ativo está" : "produtos ativos estão"} sem categoria. Abra e escolha: a próxima entrada de nota pede de qualquer jeito.
          </Aviso>
        )}

        <Cartao titulo={`Seus produtos (${produtos.length})`}>
          {produtos.length === 0 ? (
            <Vazio
              titulo="Nenhum produto ainda"
              texto="Cadastre abaixo ou deixe a nota criar: na entrada da nota, cada item novo vira produto com 1 clique."
              acao={<BotaoLink href="/gestao/estoque/entrada">Ir para a entrada de notas</BotaoLink>}
            />
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)] sm:hidden">
                {produtos.map((p) => {
                  const s = saldo.get(p.id)?.saldo ?? 0;
                  const alerta = p.ativo ? alertaEstoque(s, p.minimo, p.maximo) : null;
                  return (
                    <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/gestao/estoque/produtos/${p.id}`} className={`${linkTexto} min-w-0 [overflow-wrap:anywhere]`}>{p.nome}</Link>
                        <span className="shrink-0 font-semibold tabular-nums">{qtdUn(s, p.unidade)}</span>
                      </div>
                      <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                        {[p.categoriaId ? nomeCat.get(p.categoriaId) : null, p.almoxarifadoPadraoId ? nomeAlmox.get(p.almoxarifadoPadraoId) : null].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {!p.ativo && <Selo>Inativo</Selo>}
                        {p.ativo && !p.categoriaId && <Selo tom="alerta">Sem categoria</Selo>}
                        {alerta === "abaixo" && <Selo tom="perigo">Abaixo do mínimo</Selo>}
                        {alerta === "acima" && <Selo tom="alerta">Acima do máximo</Selo>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden sm:block">
                <Tabela>
                  <thead>
                    <tr>
                      <th className={th}>Produto</th>
                      <th className={th}>Categoria</th>
                      <th className={th}>Almoxarifado padrão</th>
                      <th className={`${th} text-right`}>Saldo</th>
                      <th className={`${th} text-right`}>Mín. / máx.</th>
                      <th className={th}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((p) => {
                      const s = saldo.get(p.id)?.saldo ?? 0;
                      const alerta = p.ativo ? alertaEstoque(s, p.minimo, p.maximo) : null;
                      return (
                        <tr key={p.id}>
                          <td className={`${td} max-w-[260px]`}>
                            <Link href={`/gestao/estoque/produtos/${p.id}`} className={`${linkTexto} block truncate`} title={p.nome}>{p.nome}</Link>
                            <span className="text-[.75rem] text-[var(--text-muted)]">{[p.unidade, p.ncm ? `NCM ${formatarNcm(p.ncm)}` : null].filter(Boolean).join(" · ")}</span>
                          </td>
                          <td className={td}>{p.categoriaId ? nomeCat.get(p.categoriaId) ?? "—" : <Selo tom="alerta">Sem categoria</Selo>}</td>
                          <td className={td}>{p.almoxarifadoPadraoId ? nomeAlmox.get(p.almoxarifadoPadraoId) ?? "—" : "—"}</td>
                          <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{qtdUn(s, p.unidade)}</td>
                          <td className={`${td} whitespace-nowrap text-right tabular-nums text-[var(--text-secondary)]`}>
                            {p.minimo !== null || p.maximo !== null ? `${p.minimo !== null ? qtdUn(p.minimo, null) : "—"} / ${p.maximo !== null ? qtdUn(p.maximo, null) : "—"}` : "—"}
                          </td>
                          <td className={td}>
                            {!p.ativo ? <Selo>Inativo</Selo>
                              : alerta === "abaixo" ? <Selo tom="perigo">Abaixo do mínimo</Selo>
                              : alerta === "acima" ? <Selo tom="alerta">Acima do máximo</Selo>
                              : <Selo tom="verde">Ok</Selo>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabela>
              </div>
            </>
          )}

          <details className="mt-5 rounded-xl border border-[var(--border)]" open={produtos.length === 0 && categorias.length > 0}>
            <summary className={`${btnSecundario} w-full cursor-pointer list-none justify-start border-0 sm:w-auto [&::-webkit-details-marker]:hidden`}>
              Novo produto
            </summary>
            <div className="border-t border-[var(--border)] p-4">
              <FormProduto
                categorias={categorias.map((c) => ({ id: c.id, nome: c.nome, grupo: c.grupo }))}
                almoxarifados={almoxAtivos.map((a) => ({ id: a.id, nome: a.nome }))}
              />
            </div>
          </details>
        </Cartao>
      </div>
    </>
  );
}
