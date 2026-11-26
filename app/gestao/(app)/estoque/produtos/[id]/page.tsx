import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, dataBR } from "@/lib/gestao/format";
import { saldosPorAlmoxarifado } from "@/lib/gestao/estoque";
import { Cartao, EmAtivacao, Titulo } from "../../../ui";
import { carregarCadastros, carregarLotes } from "../../dados";
import { AbasEstoque, custoUnit, linkTexto, qtdUn } from "../../ui-estoque";
import { FormProduto } from "../FormProduto";

export const metadata = { title: "Produto" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, clientId } = await contextoGestao();
  const [cad, { lotes }] = await Promise.all([carregarCadastros(supabase, clientId), carregarLotes(supabase, clientId)]);

  if (cad.ausente) {
    return (<><Titulo titulo="Produto" /><AbasEstoque ativo="produtos" /><EmAtivacao modulo="Produtos do estoque" /></>);
  }
  const p = cad.produtos.find((x) => x.id === id);
  if (!p) notFound();

  const nomeAlmox = new Map(cad.almoxarifados.map((a) => [a.id, a.nome]));
  const saldos = saldosPorAlmoxarifado(lotes.filter((l) => l.productId === id));
  const ultimas = lotes.filter((l) => l.productId === id && (l.recebido ?? 0) > 0).slice(0, 5);
  const categorias = cad.categorias.filter((c) => c.ativo || c.id === p.categoriaId);

  return (
    <>
      <p className="mb-3 text-[.85rem]"><Link href="/gestao/estoque/produtos" className={linkTexto}>← Produtos</Link></p>
      <Titulo titulo={p.nome} subtitulo={p.unidade ? `Controlado em ${p.unidade}` : "Defina a unidade de controle"} />
      <AbasEstoque ativo="produtos" />

      <div className="grid gap-5 lg:grid-cols-3">
        <Cartao titulo="Cadastro" className="lg:col-span-2">
          <FormProduto
            categorias={categorias.map((c) => ({ id: c.id, nome: c.nome, grupo: c.grupo }))}
            almoxarifados={cad.almoxarifados.filter((a) => a.ativo || a.id === p.almoxarifadoPadraoId).map((a) => ({ id: a.id, nome: a.nome }))}
            produto={{
              id: p.id, nome: p.nome, unidade: p.unidade ?? "", categoriaId: p.categoriaId ?? "", ncm: p.ncm ?? "",
              almoxarifadoId: p.almoxarifadoPadraoId ?? "", minimo: p.minimo !== null ? String(p.minimo).replace(".", ",") : "",
              maximo: p.maximo !== null ? String(p.maximo).replace(".", ",") : "", gtin: p.gtin ?? "", ativo: p.ativo,
            }}
          />
        </Cartao>

        <div className="space-y-5">
          <Cartao titulo="Saldo agora">
            {saldos.length === 0 ? (
              <p className="text-[.88rem] text-[var(--text-muted)]">Sem saldo em nenhum almoxarifado.</p>
            ) : (
              <ul className="space-y-3">
                {saldos.map((s) => (
                  <li key={s.almoxarifadoId ?? "sem"} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-primary)]">{s.almoxarifadoId ? nomeAlmox.get(s.almoxarifadoId) ?? "Almoxarifado" : "Sem almoxarifado"}</p>
                      <p className="text-[.78rem] text-[var(--text-muted)]">Custo médio {custoUnit(s.custoMedio, p.unidade)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-semibold tabular-nums ${s.saldo < 0 ? "text-[var(--danger)]" : ""}`}>{qtdUn(s.saldo, p.unidade)}</p>
                      <p className="text-[.78rem] tabular-nums text-[var(--text-muted)]">{brl(s.valor)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao titulo="Últimas entradas">
            {ultimas.length === 0 ? (
              <p className="text-[.88rem] text-[var(--text-muted)]">Nenhuma entrada registrada.</p>
            ) : (
              <ul className="space-y-2.5 text-[.85rem]">
                {ultimas.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-[var(--text-secondary)] [overflow-wrap:anywhere]">{dataBR(l.entrada)} · {l.documento ?? l.numero ?? "Entrada"}</span>
                    <span className="shrink-0 tabular-nums">{qtdUn(l.recebido, p.unidade)} · {custoUnit(l.custoUnit)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
