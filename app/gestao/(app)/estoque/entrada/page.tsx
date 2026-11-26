import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, dataBR, hojeISO, somaDias } from "@/lib/gestao/format";
import { BotaoLink, Cartao, EmAtivacao, Selo, Titulo, Vazio } from "../../ui";
import { AbasEstoque, Aviso, linkTexto } from "../ui-estoque";
import { listarNotasParaEntrada, type NotaEntrada } from "./dados";

export const metadata = { title: "Entrada de notas" };
export const dynamic = "force-dynamic";

/** Nota antiga (antes do controle de estoque) não deve virar saldo fantasma: a lista abre nos últimos 90 dias. */
const JANELA_DIAS = 90;

function LinhaNota({ n, conferida }: { n: NotaEntrada; conferida?: boolean }) {
  const href = `/gestao/estoque/entrada/${n.id}${n.origem === "legado" ? "?origem=legado" : ""}`;
  return (
    <li className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">
          {n.numero ? `NF-e ${n.numero}` : "NF-e sem número"} · {n.emitente ?? "Fornecedor não identificado"}
        </p>
        <p className="text-[.8rem] text-[var(--text-muted)]">
          {dataBR(n.data)}{n.valor !== null ? ` · ${brl(n.valor)}` : ""} · {n.itens} {n.itens === 1 ? "item" : "itens"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {conferida
          ? <Selo tom="verde">No estoque</Selo>
          : <Selo tom="alerta">{n.pendentes === n.itens ? "A conferir" : `${n.pendentes} de ${n.itens} a conferir`}</Selo>}
        <Link href={href} className={linkTexto} aria-label={`${conferida ? "Ver" : "Conferir"} a NF-e ${n.numero ?? "sem número"}`}>
          {conferida ? "Ver" : "Conferir"}
        </Link>
      </div>
    </li>
  );
}

export default async function EntradaPage({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const { todas } = await searchParams;
  const { supabase, clientId } = await contextoGestao();
  const desde = todas === "1" ? null : somaDias(hojeISO(), -JANELA_DIAS);
  const lista = await listarNotasParaEntrada(supabase, clientId, desde);

  const pendentes = lista.notas.filter((n) => n.pendentes > 0);
  const conferidas = lista.notas.filter((n) => n.pendentes === 0);

  return (
    <>
      <Titulo
        titulo="Entrada de notas"
        subtitulo="Cada item da nota vira produto do estoque, com a unidade certa e o custo da nota. Confirmou, entrou."
        acao={<BotaoLink href="/gestao/notas">Enviar nota</BotaoLink>}
      />
      <AbasEstoque ativo="entrada" pendentes={lista.ausente ? undefined : pendentes.length} />

      {lista.ausente ? (
        <EmAtivacao modulo="Entrada de notas no estoque" />
      ) : (
        <div className="space-y-5">
          {lista.parcial && <Aviso tom="alerta">Parte das notas não pôde ser lida agora. A lista pode estar incompleta.</Aviso>}

          <Cartao titulo={`A conferir (${pendentes.length})`}>
            {pendentes.length === 0 ? (
              <Vazio
                titulo="Nenhuma nota a conferir"
                texto={desde
                  ? `Todas as notas de compra dos últimos ${JANELA_DIAS} dias já estão no estoque.`
                  : "Todas as notas de compra já estão no estoque."}
                acao={<BotaoLink href="/gestao/notas">Enviar uma nota</BotaoLink>}
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {pendentes.map((n) => <LinhaNota key={`${n.origem}-${n.id}`} n={n} />)}
              </ul>
            )}
            <p className="mt-4 text-[.78rem] text-[var(--text-muted)]">
              {desde ? (
                <>Mostrando notas dos últimos {JANELA_DIAS} dias. <Link href="/gestao/estoque/entrada?todas=1" className={linkTexto}>Ver todas</Link> — nota antiga que já foi consumida pode entrar como aplicação direta.</>
              ) : (
                <>Mostrando todas as notas. <Link href="/gestao/estoque/entrada" className={linkTexto}>Só os últimos {JANELA_DIAS} dias</Link></>
              )}
              {lista.semItens > 0 && ` ${lista.semItens} ${lista.semItens === 1 ? "nota não trouxe itens lidos" : "notas não trouxeram itens lidos"} e não aparece${lista.semItens === 1 ? "" : "m"} aqui.`}
            </p>
          </Cartao>

          {conferidas.length > 0 && (
            <Cartao titulo={`Já no estoque (${conferidas.length})`}>
              <ul className="divide-y divide-[var(--border)]">
                {conferidas.slice(0, 30).map((n) => <LinhaNota key={`${n.origem}-${n.id}`} n={n} conferida />)}
              </ul>
            </Cartao>
          )}
        </div>
      )}
    </>
  );
}
