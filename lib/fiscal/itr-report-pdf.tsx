/**
 * B4 — o documento que o contador recebe, confere e assina.
 *
 * O motor (`lib/fiscal/itr-report.ts`) devolve um objeto. Contador não assina
 * objeto: assina papel. Este módulo é a ponte, e foi construído ANTES do dado
 * real chegar para que, quando chegar (prazo 12/09), reste só trocar a fonte.
 *
 * Três decisões de forma que vêm da postura do módulo, não de estética:
 *
 *  1. A faixa NÃO PUBLICÁVEL é a primeira coisa da página, em vermelho, sempre
 *     que alguma regra usada estiver sem verificação em fonte primária. Um
 *     relatório fiscal que parece pronto mas não está é pior que nenhum.
 *  2. A pastagem DECLARADA e a COMPROVADA aparecem lado a lado, com a diferença
 *     explícita. O documento não esconde a lacuna — é o ponto dele.
 *  3. Rodapé em toda página dizendo que quem declara e assina é o contador.
 *     Nada aqui é declaração, e o papel precisa dizer isso sozinho.
 */

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { RelatorioITR } from "@/lib/fiscal/itr-report";

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1e2a1b" },
  header: { borderBottomWidth: 1, borderBottomColor: "#1e2a1b", paddingBottom: 12, marginBottom: 16 },
  brand: { fontSize: 9, color: "#788473", textTransform: "uppercase" as const, letterSpacing: 1.5 },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 6 },
  subtitle: { fontSize: 10, color: "#788473", marginTop: 4 },

  aviso: { padding: 10, backgroundColor: "#fdecea", borderLeftWidth: 3, borderLeftColor: "#a3341f", marginBottom: 14 },
  avisoTitulo: { fontSize: 9, fontWeight: "bold", color: "#a3341f", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  avisoTexto: { fontSize: 8.5, color: "#7a2a18", marginTop: 4, lineHeight: 1.4 },

  section: { marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  kpi: { flex: 1, padding: 10, backgroundColor: "#fafbf8", borderRadius: 6, borderWidth: 0.5, borderColor: "#e5e7eb" },
  kpiLabel: { fontSize: 7, color: "#788473", textTransform: "uppercase" as const },
  kpiValue: { fontSize: 15, fontWeight: "bold", marginTop: 2 },
  kpiNota: { fontSize: 7, color: "#788473", marginTop: 2 },

  destaque: { padding: 12, backgroundColor: "#f4f7f2", borderRadius: 8, marginBottom: 12 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.3, borderBottomColor: "#e5e7eb" },
  linhaForte: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#1e2a1b", marginTop: 4 },
  rotulo: { fontSize: 9, color: "#5b6957" },
  valor: { fontSize: 9, fontWeight: "bold" },
  valorAlerta: { fontSize: 9, fontWeight: "bold", color: "#a3341f" },

  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e2a1b", paddingBottom: 5, marginBottom: 3 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.3, borderBottomColor: "#e5e7eb", paddingVertical: 4 },
  th: { fontSize: 8, fontWeight: "bold", color: "#788473", textTransform: "uppercase" as const },
  td: { fontSize: 9 },

  achado: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.3, borderBottomColor: "#e5e7eb" },
  achadoSev: { fontSize: 7, fontWeight: "bold", textTransform: "uppercase" as const, width: 52 },
  achadoTxt: { fontSize: 8.5, flex: 1, lineHeight: 1.35 },

  assinatura: { marginTop: 26, flexDirection: "row", gap: 24 },
  assinaturaBloco: { flex: 1, borderTopWidth: 0.8, borderTopColor: "#1e2a1b", paddingTop: 5 },
  assinaturaLabel: { fontSize: 8, color: "#788473" },

  footer: {
    position: "absolute", bottom: 22, left: 36, right: 36, fontSize: 7,
    color: "#788473", textAlign: "center", borderTopWidth: 0.3,
    borderTopColor: "#e5e7eb", paddingTop: 6, lineHeight: 1.4,
  },
});

const CORES_SEVERIDADE: Record<string, string> = {
  critical: "#a3341f", warning: "#8a6a12", info: "#5b6957",
};
const ROTULO_SEVERIDADE: Record<string, string> = {
  critical: "Crítico", warning: "Atenção", info: "Info",
};

const ha = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha`;
const pct = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const brl = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const nUA = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Documento PDF do relatório de suporte à DITR. */
export function RelatorioITRPdf({ r, geradoEm }: { r: RelatorioITR; geradoEm: string }) {
  const naoPublicavel = !r.publicavel;

  return (
    <Document
      title={`Suporte à DITR ${r.cabecalho.exercicio} — ${r.cabecalho.nome}`}
      author="Agraas"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>Agraas · Suporte à declaração</Text>
          <Text style={s.title}>Rebanho comprovado — DITR {r.cabecalho.exercicio}</Text>
          <Text style={s.subtitle}>
            {r.cabecalho.nome} · {r.cabecalho.municipio}/{r.cabecalho.uf}
            {r.cabecalho.nirf ? ` · NIRF ${r.cabecalho.nirf}` : ""} · gerado em {geradoEm}
          </Text>
        </View>

        {/* A trava aparece antes de qualquer número. */}
        {naoPublicavel && (
          <View style={s.aviso}>
            <Text style={s.avisoTitulo}>Documento preliminar — não publicável</Text>
            {r.avisos.map((a, i) => (
              <Text key={i} style={s.avisoTexto}>• {a}</Text>
            ))}
          </View>
        )}

        {/* ── Resultado ─────────────────────────────────────────────── */}
        <View style={s.kpiRow}>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Grau de utilização</Text>
            <Text style={s.kpiValue}>{pct(r.guPct)}</Text>
            <Text style={s.kpiNota}>sobre a área aproveitável</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Alíquota resultante</Text>
            <Text style={s.kpiValue}>{pct(r.aliquotaPct)}</Text>
            <Text style={s.kpiNota}>Lei 9.393/96, art. 11</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Imposto estimado</Text>
            <Text style={s.kpiValue}>{brl(r.impostoEstimadoReais)}</Text>
            <Text style={s.kpiNota}>estimado sobre o VTN informado</Text>
          </View>
        </View>

        {/* ── Áreas: declarada × comprovada ─────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Áreas</Text>
          <View style={s.destaque}>
            <View style={s.linha}>
              <Text style={s.rotulo}>Área total do imóvel</Text>
              <Text style={s.valor}>{ha(r.areas.totalHa)}</Text>
            </View>
            <View style={s.linha}>
              <Text style={s.rotulo}>Área aproveitável</Text>
              <Text style={s.valor}>{ha(r.areas.aproveitavelHa)}</Text>
            </View>
            <View style={s.linha}>
              <Text style={s.rotulo}>Pastagem declarada</Text>
              <Text style={s.valor}>{ha(r.areas.pastagemDeclaradaHa)}</Text>
            </View>
            <View style={s.linha}>
              <Text style={s.rotulo}>Pastagem comprovada pelo rebanho</Text>
              <Text style={s.valor}>{ha(r.areas.pastagemComprovadaHa)}</Text>
            </View>
            {r.areas.outrasUtilizadasHa > 0 && (
              <View style={s.linha}>
                <Text style={s.rotulo}>Outras áreas utilizadas</Text>
                <Text style={s.valor}>{ha(r.areas.outrasUtilizadasHa)}</Text>
              </View>
            )}
            <View style={s.linhaForte}>
              <Text style={s.rotulo}>Diferença sem comprovação</Text>
              <Text style={(r.areas.pastagemNaoComprovadaHa ?? 0) > 0 ? s.valorAlerta : s.valor}>
                {ha(r.areas.pastagemNaoComprovadaHa)}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 8, color: "#788473", lineHeight: 1.4 }}>
            O grau de utilização foi calculado sobre a área de pastagem COMPROVADA pelo rebanho,
            não sobre a declarada. A conversão é rebanho em unidades animais dividido pelo índice
            de lotação da zona de pecuária.
          </Text>
        </View>

        {/* ── Rebanho ───────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Rebanho médio mensal — {r.rebanho.mesesNaSerie} {r.rebanho.mesesNaSerie === 1 ? "mês" : "meses"} de série
          </Text>
          <View style={s.tableHeader}>
            <Text style={[s.th, { flex: 2 }]}>Categoria</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Cabeças (média)</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Fator UA</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Unidades animais</Text>
          </View>
          {r.rebanho.conversao.porCategoria.map((c, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.td, { flex: 2 }]}>{c.categoria}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{nUA(c.cabecas)}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right", color: c.fator === null ? "#a3341f" : "#1e2a1b" }]}>
                {c.fator === null ? "sem fator" : c.fator.toFixed(2)}
              </Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{nUA(c.ua)}</Text>
            </View>
          ))}
          <View style={s.linhaForte}>
            <Text style={s.rotulo}>Total em unidades animais</Text>
            <Text style={s.valor}>{nUA(r.rebanho.conversao.totalUA)} UA</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          Documento de apoio gerado pela Agraas. NÃO é declaração fiscal.
          {"\n"}Quem preenche o grau de utilização e o VTN na DITR, confere e assina é o contador responsável.
        </Text>
      </Page>

      {/* ── Página 2: achados, comparação e assinatura ──────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>Agraas · Suporte à declaração</Text>
          <Text style={s.title}>Pontos de atenção</Text>
          <Text style={s.subtitle}>{r.cabecalho.nome} · DITR {r.cabecalho.exercicio}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Achados ({r.achados.length})</Text>
          {r.achados.length === 0 ? (
            <Text style={{ fontSize: 9, color: "#788473" }}>
              Nenhum ponto de atenção identificado na evidência disponível.
            </Text>
          ) : (
            r.achados.map((a, i) => (
              <View key={i} style={s.achado}>
                <Text style={[s.achadoSev, { color: CORES_SEVERIDADE[a.severidade] ?? "#5b6957" }]}>
                  {ROTULO_SEVERIDADE[a.severidade] ?? a.severidade}
                </Text>
                <Text style={s.achadoTxt}>
                  {a.mensagem}
                  {a.regra ? ` (${a.regra})` : ""}
                </Text>
              </View>
            ))
          )}
        </View>

        {r.comparacaoAnterior && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Comparação com o exercício {r.comparacaoAnterior.exercicio}</Text>
            <View style={s.destaque}>
              <View style={s.linha}>
                <Text style={s.rotulo}>Variação do grau de utilização</Text>
                <Text style={s.valor}>
                  {r.comparacaoAnterior.deltaGUpp == null
                    ? "—"
                    : `${r.comparacaoAnterior.deltaGUpp > 0 ? "+" : ""}${r.comparacaoAnterior.deltaGUpp.toFixed(1)} p.p.`}
                </Text>
              </View>
              <View style={s.linha}>
                <Text style={s.rotulo}>Variação da alíquota</Text>
                <Text style={s.valor}>
                  {r.comparacaoAnterior.deltaAliquotaPP == null
                    ? "—"
                    : `${r.comparacaoAnterior.deltaAliquotaPP > 0 ? "+" : ""}${r.comparacaoAnterior.deltaAliquotaPP.toFixed(2)} p.p.`}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 8.5, color: "#5b6957", lineHeight: 1.4 }}>
              {r.comparacaoAnterior.observacao}
            </Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Base normativa</Text>
          <Text style={{ fontSize: 8.5, color: "#5b6957", lineHeight: 1.5 }}>
            Lei 9.393/1996, art. 10 § 1º IV (grau de utilização) e art. 11 com o anexo de alíquotas.
            A tabela de alíquotas foi conferida no anexo publicado pela Câmara dos Deputados.
            O índice de lotação da zona de pecuária e os fatores de conversão para unidade animal
            constam do livro de regras da plataforma e devem ser confirmados pelo contador
            responsável antes do uso na declaração.
          </Text>
        </View>

        <View style={s.assinatura}>
          <View style={s.assinaturaBloco}>
            <Text style={s.assinaturaLabel}>Contador responsável — nome, CRC e assinatura</Text>
          </View>
          <View style={s.assinaturaBloco}>
            <Text style={s.assinaturaLabel}>Data</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          Documento de apoio gerado pela Agraas. NÃO é declaração fiscal.
          {"\n"}Quem preenche o grau de utilização e o VTN na DITR, confere e assina é o contador responsável.
        </Text>
      </Page>
    </Document>
  );
}
