import Link from "next/link";
import { mesVizinho } from "@/lib/gestao/resultado";
import { mesPorExtenso } from "@/lib/gestao/format";
import { btnSecundario, campo } from "../ui";

/** Seletor de mês sem JavaScript: setas + campo de mês enviado por GET. */
export default function SeletorMes({ caminho, mes, id }: { caminho: string; mes: string; id: string }) {
  const atual = mes.slice(0, 7);
  const ant = mesVizinho(mes, -1);
  const prox = mesVizinho(mes, 1);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <Link href={`${caminho}?mes=${ant}`} className={btnSecundario} aria-label={`Mês anterior (${ant})`}>
        <span aria-hidden>←</span>
      </Link>
      <form method="get" action={caminho} className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
        <label htmlFor={id} className="sr-only">Mês de referência</label>
        <input id={id} name="mes" type="month" defaultValue={atual} required
          pattern="\d{4}-\d{2}" className={`${campo} min-w-0 sm:w-auto`} />
        <button type="submit" className={btnSecundario}>Ver</button>
      </form>
      <Link href={`${caminho}?mes=${prox}`} className={btnSecundario} aria-label={`Próximo mês (${prox})`}>
        <span aria-hidden>→</span>
      </Link>
      <p className="sr-only">{mesPorExtenso(mes)}</p>
    </div>
  );
}
