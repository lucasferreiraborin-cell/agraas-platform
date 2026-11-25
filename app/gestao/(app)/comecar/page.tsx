import type { Metadata } from "next";
import Link from "next/link";
import { FileUp, Fuel, Wallet } from "lucide-react";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { atividade } from "@/lib/gestao/atividades";
import { hojeISO, num } from "@/lib/gestao/format";
import { safraSugerida } from "@/lib/gestao/comecar";
import { BotaoLink, EmAtivacao, Titulo, btnPrimario, btnSecundario } from "../ui";
import Passo1 from "./Passo1";
import Passo2 from "./Passo2";

export const metadata: Metadata = { title: "Comece por aqui" };
export const dynamic = "force-dynamic";

const TOTAL = 4;
const TITULOS = [
  { t: "O que sua fazenda produz?", s: "Marque tudo o que você tem. Cada atividade vira um lugar para ver quanto custa e quanto rende." },
  { t: "Suas máquinas", s: "Tratores, caminhonetes, colheitadeiras. Com elas cadastradas, o diesel passa a ter custo por máquina." },
  { t: "Traga suas notas", s: "Envie as notas de compra e venda. O Agraas lê e organiza para você." },
  { t: "Pronto", s: "Sua fazenda já está montada. Veja o que foi criado e o que acontece daqui para frente." },
];

function passoDaUrl(v: string | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= TOTAL ? n : 1;
}

export default async function Comecar({ searchParams }: { searchParams: Promise<{ passo?: string }> }) {
  const sp = await searchParams;
  const passo = passoDaUrl(sp.passo);
  const { supabase, clientId } = await contextoGestao();

  const [centrosQ, maquinasQ] = await Promise.all([
    supabase.from("centros_custo").select("nome, atividade, tipo").eq("client_id", clientId).eq("ativo", true).order("created_at").limit(500),
    supabase.from("maquinas").select("nome").eq("client_id", clientId).eq("ativo", true).order("created_at").limit(500),
  ]);

  if (tabelaAusente(centrosQ.error)) {
    return (
      <div>
        <Titulo titulo="Comece por aqui" subtitulo="Monte sua fazenda em poucos minutos" />
        <EmAtivacao modulo="Centros de custo" />
      </div>
    );
  }

  const centros = (centrosQ.error ? [] : centrosQ.data ?? []) as { nome: string; atividade: string; tipo: string }[];
  const maquinas = (maquinasQ.error ? [] : maquinasQ.data ?? []) as { nome: string }[];
  const frotaAusente = tabelaAusente(maquinasQ.error);
  const { t, s } = TITULOS[passo - 1];
  const produtivos = centros.filter((c) => c.atividade !== "geral");

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <nav aria-label="Progresso" className="mb-8">
        <div className="mb-2 flex items-center justify-between text-[.78rem] font-medium text-[var(--text-secondary)]">
          <span>Passo {passo} de {TOTAL}</span>
          {passo < TOTAL && <Link href="/gestao" className="rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--primary)]">Sair e continuar depois</Link>}
        </div>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={passo} aria-label={`Passo ${passo} de ${TOTAL}`}
          className="flex gap-1.5">
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < passo ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"}`} />
          ))}
        </div>
      </nav>

      <Titulo titulo={t} subtitulo={s} />

      {passo === 1 && (
        <>
          {produtivos.length > 0 && (
            <div className="mb-6 rounded-2xl bg-[var(--primary-soft)] px-4 py-3 text-[.85rem] text-[var(--primary-hover)]">
              Você já tem {produtivos.length} {produtivos.length === 1 ? "atividade cadastrada" : "atividades cadastradas"}.
              O que já existe com o mesmo nome não é repetido.{" "}
              <Link href="/gestao/comecar?passo=2" className="font-semibold underline underline-offset-4">Pular para as máquinas</Link>
            </div>
          )}
          <Passo1 safraInicial={safraSugerida(hojeISO())} />
        </>
      )}

      {passo === 2 && (
        <div className="space-y-6">
          {frotaAusente ? <EmAtivacao modulo="Máquinas" /> : (
            <>
              {maquinas.length > 0 && (
                <div>
                  <p className="mb-2 text-[.8rem] font-semibold text-[var(--text-secondary)]">Já cadastradas</p>
                  <ul className="flex flex-wrap gap-2">
                    {maquinas.map((m, i) => (
                      <li key={`${m.nome}-${i}`} className="rounded-full border border-[var(--border)] bg-white px-3.5 py-1.5 text-[.85rem] text-[var(--text-primary)]">{m.nome}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Passo2 />
            </>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/gestao/comecar?passo=1" className={btnSecundario}>Voltar</Link>
            <Link href="/gestao/comecar?passo=3" className={`${maquinas.length > 0 ? btnPrimario : btnSecundario} !py-3.5`}>
              {maquinas.length > 0 ? "Continuar" : "Pular por enquanto"}
            </Link>
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-6">
          <ul className="space-y-3 text-[.92rem] text-[var(--text-primary)]">
            <li className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
              <FileUp size={20} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
              <span>Envie o XML ou o PDF das notas, vários de uma vez.</span>
            </li>
            <li className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
              <Wallet size={20} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
              <span>Cada nota que você confirmar vira conta a pagar, sem digitar.</span>
            </li>
            <li className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
              <Fuel size={20} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
              <span>Nota de diesel entra no estoque e alimenta o custo por máquina.</span>
            </li>
          </ul>
          <p className="text-[.82rem] text-[var(--text-muted)]">
            Depois de enviar, volte para terminar em{" "}
            <Link href="/gestao/comecar?passo=4" className="font-semibold underline underline-offset-4">Pronto</Link>.
          </p>
          <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/gestao/comecar?passo=2" className={`${btnSecundario} order-last sm:order-none`}>Voltar</Link>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/gestao/comecar?passo=4" className={btnSecundario}>Pular por enquanto</Link>
              <BotaoLink href="/gestao/notas" primario>Enviar notas</BotaoLink>
            </div>
          </div>
        </div>
      )}

      {passo === 4 && (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)]">
              <dt className="text-[.74rem] font-medium text-[var(--text-muted)]">Atividades</dt>
              <dd className="mt-1 text-[1.5rem] font-semibold tabular-nums text-[var(--text-primary)]">{num(produtivos.length)}</dd>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)]">
              <dt className="text-[.74rem] font-medium text-[var(--text-muted)]">Máquinas</dt>
              <dd className="mt-1 text-[1.5rem] font-semibold tabular-nums text-[var(--text-primary)]">{frotaAusente ? "—" : num(maquinas.length)}</dd>
            </div>
          </dl>

          {centros.length > 0 ? (
            <ul className="space-y-2">
              {centros.map((c, i) => (
                <li key={`${c.nome}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[.9rem]">
                  <span className="min-w-0 truncate font-medium text-[var(--text-primary)]" title={c.nome}>{c.nome}</span>
                  <span className="shrink-0 text-[.78rem] text-[var(--text-muted)]">{atividade(c.atividade).nome}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-[.88rem] text-[var(--text-secondary)]">
              Você ainda não marcou nenhuma atividade. <Link href="/gestao/comecar?passo=1" className="font-semibold underline underline-offset-4">Voltar ao começo</Link>
            </p>
          )}

          <div>
            <h2 className="mb-2 text-[.95rem] font-semibold text-[var(--text-primary)]">O que acontece agora</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[.9rem] text-[var(--text-secondary)]">
              <li>Cada nota que você enviar vira conta a pagar, com vencimento e valor.</li>
              <li>O diesel comprado entra no estoque e aparece como custo de cada máquina.</li>
              <li>Os custos caem na atividade certa, e você vê quanto cada uma rende.</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/gestao/comecar?passo=3" className={btnSecundario}>Voltar</Link>
            <Link href="/gestao" className={`${btnPrimario} !py-3.5 sm:min-w-[220px]`}>Ir para o Início</Link>
          </div>
        </div>
      )}
    </div>
  );
}
