import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, dataBR, hojeISO, limitesDoMes, mesPorExtenso } from "@/lib/gestao/format";
import { Cartao, EmAtivacao, Kpi, Selo, Tabela, Titulo, Vazio, td, th } from "../ui";
import EnviarNota from "./EnviarNota";
import { listarNotas, titulosPorNota, type NotaUnificada, type TitulosDaNota } from "./dados";

export const metadata = { title: "Notas fiscais" };

export const dynamic = "force-dynamic";

function rotuloNota(n: NotaUnificada) {
  return n.numero ? `NF-e ${n.numero}${n.serie && n.serie !== "-" ? ` · série ${n.serie}` : ""}` : "NF-e sem número";
}

function Gerou({ n, titulos }: { n: NotaUnificada; titulos: Map<string, TitulosDaNota> | null }) {
  const t = titulos?.get(n.id);
  const partes: string[] = [];
  if (titulos === null) partes.push("—");
  else if (t) partes.push(`${t.qtd} ${t.qtd === 1 ? "título" : "títulos"}`);
  else partes.push("Sem títulos");
  if (n.funrural) partes.push(`FUNRURAL ${brl(n.funrural)}`);
  return <>{partes.join(" · ")}</>;
}

export default async function NotasPage() {
  const { supabase, clientId } = await contextoGestao();
  const [lista, titulos] = await Promise.all([listarNotas(supabase, clientId), titulosPorNota(supabase, clientId)]);

  if (lista.ausente) {
    return (
      <>
        <Titulo titulo="Notas fiscais" subtitulo="A nota entra; o resto sai pronto." />
        <EmAtivacao modulo="Notas fiscais" />
      </>
    );
  }

  const { notas } = lista;
  const hoje = hojeISO();
  const { inicio, fim } = limitesDoMes(hoje);
  const doMes = notas.filter((n) => n.data && n.data >= inicio && n.data <= fim);
  const valorMes = doMes.reduce((s, n) => s + (n.valor ?? 0), 0);
  const aConferir = notas.filter((n) => n.aConferir).length;

  return (
    <>
      <Titulo titulo="Notas fiscais" subtitulo="Envie a nota. Títulos, estoque e custo saem dela." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Kpi rotulo="Notas no mês" valor={String(doMes.length)} detalhe={mesPorExtenso(hoje)} />
        <Kpi rotulo="Valor no mês" valor={brl(valorMes)} />
        <div className="col-span-2 lg:col-span-1">
          <Kpi
            rotulo="A conferir"
            valor={String(aConferir)}
            tom={aConferir > 0 ? "alerta" : "neutro"}
            detalhe={aConferir > 0 ? "Confira antes de fechar o mês" : "Tudo conferido"}
          />
        </div>
      </div>

      <Cartao titulo="Enviar nota" className="mb-6">
        <EnviarNota />
      </Cartao>

      {lista.parcial && (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[.83rem] text-amber-800">
          Não foi possível ler todas as notas agora. A lista pode estar incompleta.
        </p>
      )}

      {notas.length === 0 ? (
        <Vazio
          titulo="Nenhuma nota ainda"
          texto="Envie o XML ou o PDF de uma nota de compra. Ela vira títulos a pagar, estoque e custo."
        />
      ) : (
        <Cartao titulo={`Todas as notas (${notas.length})`}>
          {/* Celular: cartões. Telas maiores: tabela. */}
          <ul className="divide-y divide-[var(--border)] sm:hidden">
            {notas.map((n) => (
              <li key={`${n.origem}-${n.id}`} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/gestao/notas/${n.id}?origem=${n.origem}`}
                  className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-semibold text-[var(--text-primary)]" title={n.emitente ?? ""}>
                      {n.emitente ?? "Contraparte não informada"}
                    </p>
                    <p className="shrink-0 font-semibold tabular-nums text-[var(--text-primary)]">{n.valor === null ? "—" : brl(n.valor)}</p>
                  </div>
                  <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">{rotuloNota(n)} · {dataBR(n.data)}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Selo tom={n.statusTom}>{n.statusRotulo}</Selo>
                    <span className="text-[.78rem] text-[var(--text-secondary)]"><Gerou n={n} titulos={titulos} /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block">
            <Tabela>
              <thead>
                <tr>
                  <th className={th}>Fornecedor ou comprador</th>
                  <th className={th}>Nota</th>
                  <th className={th}>Emissão</th>
                  <th className={`${th} text-right`}>Valor</th>
                  <th className={th}>Status</th>
                  <th className={th}>Gerou</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => (
                  <tr key={`${n.origem}-${n.id}`} className="hover:bg-[var(--surface-soft)]">
                    <td className={`${td} max-w-[240px]`}>
                      <Link
                        href={`/gestao/notas/${n.id}?origem=${n.origem}`}
                        className="block truncate font-semibold text-[var(--text-primary)] underline-offset-2 hover:underline focus-visible:underline"
                        title={n.emitente ?? ""}
                      >
                        {n.emitente ?? "Contraparte não informada"}
                      </Link>
                    </td>
                    <td className={`${td} whitespace-nowrap text-[var(--text-secondary)]`}>{rotuloNota(n)}</td>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{dataBR(n.data)}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{n.valor === null ? "—" : brl(n.valor)}</td>
                    <td className={td}><Selo tom={n.statusTom}>{n.statusRotulo}</Selo></td>
                    <td className={`${td} text-[var(--text-secondary)]`}><Gerou n={n} titulos={titulos} /></td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          </div>
        </Cartao>
      )}
    </>
  );
}
