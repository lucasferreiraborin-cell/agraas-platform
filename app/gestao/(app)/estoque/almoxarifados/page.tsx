import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl } from "@/lib/gestao/format";
import { saldosPorAlmoxarifado } from "@/lib/gestao/estoque";
import { Cartao, EmAtivacao, Selo, Titulo, Vazio } from "../../ui";
import { carregarCadastros, carregarLotes, TIPO_ALMOX_NOME } from "../dados";
import { AbasEstoque, Aviso, linkTexto, qtd } from "../ui-estoque";
import { FormAlmoxarifado } from "./FormAlmoxarifado";

export const metadata = { title: "Almoxarifados" };
export const dynamic = "force-dynamic";

export default async function AlmoxarifadosPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const { supabase, clientId } = await contextoGestao();
  const [cad, { lotes }] = await Promise.all([carregarCadastros(supabase, clientId), carregarLotes(supabase, clientId)]);

  const cabecalho = (
    <>
      <Titulo titulo="Almoxarifados" subtitulo="Onde o estoque fica: tanque de diesel, peças, insumos. Cada entrada e saída diz de qual saiu." />
      <AbasEstoque ativo="almoxarifados" />
    </>
  );
  if (cad.ausente) return <>{cabecalho}<EmAtivacao modulo="Almoxarifados" /></>;

  const saldos = saldosPorAlmoxarifado(lotes);
  const emEdicao = editar ? cad.almoxarifados.find((a) => a.id === editar) : undefined;
  const lista = [...cad.almoxarifados].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <>
      {cabecalho}
      <div className="grid gap-5 lg:grid-cols-3">
        <Cartao titulo={`Seus almoxarifados (${lista.length})`} className="lg:col-span-2">
          {cad.falhou && <Aviso tom="alerta" className="mb-4">Parte dos dados não pôde ser lida agora.</Aviso>}
          {lista.length === 0 ? (
            <Vazio titulo="Nenhum almoxarifado ainda" texto="Comece pelo tanque de diesel (com a capacidade em litros), depois peças e insumos. Pode ser “Almoxarifado 1, 2, 3” também." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {lista.map((a) => {
                const meus = saldos.filter((s) => s.almoxarifadoId === a.id);
                const valor = meus.reduce((s, x) => s + x.valor, 0);
                const litros = a.tipo === "combustivel" ? meus.reduce((s, x) => s + x.saldo, 0) : null;
                return (
                  <li key={a.id} className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{a.nome}</p>
                      <p className="text-[.8rem] text-[var(--text-muted)]">
                        {TIPO_ALMOX_NOME[a.tipo] ?? a.tipo}
                        {a.capacidadeLitros ? ` · capacidade ${qtd(a.capacidadeLitros)} L` : ""}
                        {` · ${meus.filter((s) => s.saldo > 0).length} ${meus.filter((s) => s.saldo > 0).length === 1 ? "produto" : "produtos"} com saldo · ${brl(valor)}`}
                        {litros !== null ? ` · ${qtd(litros)} L` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {!a.ativo && <Selo>Inativo</Selo>}
                      <Link href={`/gestao/estoque/almoxarifados?editar=${a.id}`} className={linkTexto} aria-label={`Editar ${a.nome}`}>Editar</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        <Cartao titulo={emEdicao ? `Editar: ${emEdicao.nome}` : "Novo almoxarifado"}>
          <FormAlmoxarifado
            almox={emEdicao ? {
              id: emEdicao.id, nome: emEdicao.nome, tipo: emEdicao.tipo,
              capacidade: emEdicao.capacidadeLitros !== null ? String(emEdicao.capacidadeLitros).replace(".", ",") : "",
              ativo: emEdicao.ativo,
            } : undefined}
          />
          <p className="mt-4 text-[.78rem] text-[var(--text-muted)]">
            Almoxarifado com histórico não é apagado: desative para parar de receber entradas.
          </p>
        </Cartao>
      </div>
    </>
  );
}
