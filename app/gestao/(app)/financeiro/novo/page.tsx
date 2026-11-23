import Link from "next/link";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { hojeISO } from "@/lib/gestao/format";
import { Cartao, EmAtivacao, Titulo } from "../../ui";
import type { CentroOpcao } from "../SelectCentro";
import { NovoForm } from "./NovoForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo lançamento · Agraas Gestão" };

export default async function NovoLancamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const ctx = await contextoGestao();

  const { data, error } = await ctx.supabase
    .from("centros_custo")
    .select("id, nome, atividade")
    .eq("client_id", ctx.clientId)
    .eq("ativo", true)
    .order("nome");

  if (tabelaAusente(error)) {
    return (
      <>
        <Titulo titulo="Novo lançamento" />
        <EmAtivacao modulo="Contas a pagar e receber" />
      </>
    );
  }

  const centros = ((data ?? []) as unknown as CentroOpcao[]);

  return (
    <>
      <Titulo
        titulo="Novo lançamento"
        subtitulo="Conta a pagar ou a receber, à vista ou parcelada."
        acao={<Link href="/gestao/financeiro" className="text-[.85rem] font-semibold text-[var(--primary)] hover:underline">Voltar</Link>}
      />
      <div className="max-w-2xl">
        <Cartao>
          <NovoForm
            centros={centros}
            tipoInicial={tipo === "receber" ? "receber" : "pagar"}
            hoje={hojeISO()}
          />
        </Cartao>
      </div>
    </>
  );
}
