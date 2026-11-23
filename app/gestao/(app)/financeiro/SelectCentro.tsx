import { atividade, SETOR_NOME, type Setor } from "@/lib/gestao/atividades";

export type CentroOpcao = { id: string; nome: string; atividade: string };

const ORDEM: Setor[] = ["pecuaria", "agricultura", "apoio"];

/** Opções de centro de custo agrupadas por setor (Pecuária, Agricultura, Estrutura). */
export function OpcoesCentro({ centros }: { centros: CentroOpcao[] }) {
  const grupos = ORDEM.map((setor) => ({
    setor,
    itens: centros.filter((c) => atividade(c.atividade).setor === setor),
  })).filter((g) => g.itens.length > 0);

  return (
    <>
      {grupos.map((g) => (
        <optgroup key={g.setor} label={SETOR_NOME[g.setor]}>
          {g.itens.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
