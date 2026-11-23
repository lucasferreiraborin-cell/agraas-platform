/**
 * Catálogo de atividades do Agraas Gestão (mini ERP multiatividade, 23/11/2026).
 *
 * O núcleo financeiro/fiscal é um só; o que muda por atividade é a unidade
 * onde o custo acontece (centro), a unidade de venda e os indicadores.
 * Os códigos batem com o CHECK de centros_custo.atividade (migration 172).
 */

export type AtividadeCodigo =
  | "bovino_corte" | "bovino_leite" | "ovinos" | "caprinos" | "suinos" | "aves"
  | "graos" | "cafe" | "cana" | "hortifruti" | "fruticultura" | "florestal"
  | "geral" | "outra";

export type Setor = "pecuaria" | "agricultura" | "apoio";

export type CentroTipo =
  | "lote_animal" | "talhao" | "galpao" | "maquina" | "benfeitoria" | "administrativo" | "outro";

export type Atividade = {
  codigo: AtividadeCodigo;
  nome: string;
  setor: Setor;
  /** Onde o custo cai nessa atividade. */
  centroPadrao: CentroTipo;
  /** Base física do centro: cabeças ou hectares (ou m² de galpão). */
  base: "cabecas" | "hectares" | "nenhuma";
  /** Unidade em que a produção é vendida. */
  unidadeVenda: string;
  /** Indicador de custo que o produtor reconhece. */
  indicadorCusto: string;
  /** Exemplos de cultura/categoria para o formulário. */
  exemplos: string[];
};

export const ATIVIDADES: Atividade[] = [
  { codigo: "bovino_corte", nome: "Bovinos de corte", setor: "pecuaria", centroPadrao: "lote_animal", base: "cabecas",
    unidadeVenda: "@", indicadorCusto: "custo por @ e por cabeça", exemplos: ["Cria", "Recria", "Engorda", "Confinamento"] },
  { codigo: "bovino_leite", nome: "Bovinos de leite", setor: "pecuaria", centroPadrao: "lote_animal", base: "cabecas",
    unidadeVenda: "litro", indicadorCusto: "custo por litro", exemplos: ["Vacas em lactação", "Vacas secas", "Novilhas"] },
  { codigo: "ovinos", nome: "Ovinos", setor: "pecuaria", centroPadrao: "lote_animal", base: "cabecas",
    unidadeVenda: "kg", indicadorCusto: "custo por kg e por cabeça", exemplos: ["Matrizes", "Cordeiros"] },
  { codigo: "caprinos", nome: "Caprinos", setor: "pecuaria", centroPadrao: "lote_animal", base: "cabecas",
    unidadeVenda: "kg", indicadorCusto: "custo por kg e por cabeça", exemplos: ["Matrizes", "Cabritos", "Leite"] },
  { codigo: "suinos", nome: "Suínos", setor: "pecuaria", centroPadrao: "galpao", base: "cabecas",
    unidadeVenda: "kg (independente) ou remuneração por lote (integrado)", indicadorCusto: "custo por lote e por cabeça alojada", exemplos: ["Terminação", "Creche", "Ciclo completo"] },
  { codigo: "aves", nome: "Aves", setor: "pecuaria", centroPadrao: "galpao", base: "cabecas",
    unidadeVenda: "remuneração por lote (integrado) ou dúzia (postura)", indicadorCusto: "custo por lote e por ave alojada", exemplos: ["Frango de corte (integrado)", "Postura"] },
  { codigo: "graos", nome: "Grãos", setor: "agricultura", centroPadrao: "talhao", base: "hectares",
    unidadeVenda: "sc 60 kg", indicadorCusto: "custo por hectare e por saca", exemplos: ["Soja", "Milho", "Feijão", "Trigo", "Sorgo"] },
  { codigo: "cafe", nome: "Café", setor: "agricultura", centroPadrao: "talhao", base: "hectares",
    unidadeVenda: "sc 60 kg", indicadorCusto: "custo por hectare e por saca", exemplos: ["Arábica", "Conilon"] },
  { codigo: "cana", nome: "Cana-de-açúcar", setor: "agricultura", centroPadrao: "talhao", base: "hectares",
    unidadeVenda: "t (ATR)", indicadorCusto: "custo por hectare e por tonelada", exemplos: ["Cana-planta", "Soca"] },
  { codigo: "hortifruti", nome: "Hortifrúti", setor: "agricultura", centroPadrao: "talhao", base: "hectares",
    unidadeVenda: "cx / kg", indicadorCusto: "custo por hectare e por caixa", exemplos: ["Batata", "Tomate", "Cebola", "Cenoura"] },
  { codigo: "fruticultura", nome: "Frutas", setor: "agricultura", centroPadrao: "talhao", base: "hectares",
    unidadeVenda: "cx / t", indicadorCusto: "custo por hectare e por caixa", exemplos: ["Laranja", "Banana", "Uva", "Manga"] },
  { codigo: "florestal", nome: "Florestal", setor: "agricultura", centroPadrao: "talhao", base: "hectares",
    unidadeVenda: "m³", indicadorCusto: "custo por hectare e por m³", exemplos: ["Eucalipto", "Pinus"] },
  { codigo: "geral", nome: "Estrutura da fazenda", setor: "apoio", centroPadrao: "administrativo", base: "nenhuma",
    unidadeVenda: "—", indicadorCusto: "custo fixo do mês", exemplos: ["Administrativo", "Máquinas", "Benfeitorias"] },
  { codigo: "outra", nome: "Outra", setor: "apoio", centroPadrao: "outro", base: "nenhuma",
    unidadeVenda: "—", indicadorCusto: "custo total", exemplos: [] },
];

const POR_CODIGO = new Map(ATIVIDADES.map((a) => [a.codigo, a]));

export function atividade(codigo: string | null | undefined): Atividade {
  return POR_CODIGO.get(codigo as AtividadeCodigo) ?? POR_CODIGO.get("outra")!;
}

export const SETOR_NOME: Record<Setor, string> = {
  pecuaria: "Pecuária",
  agricultura: "Agricultura",
  apoio: "Estrutura",
};

export const CENTRO_TIPO_NOME: Record<CentroTipo, string> = {
  lote_animal: "Lote de animais",
  talhao: "Talhão",
  galpao: "Galpão",
  maquina: "Máquina",
  benfeitoria: "Benfeitoria",
  administrativo: "Administrativo",
  outro: "Outro",
};
