/**
 * Sócios Digest — newsletter institucional interna da Agraas.
 *
 * Filosofia: cada socio recebe semanalmente um digest curto e estruturado
 * com (a) o que mudou na plataforma, (b) decisões registradas, (c) snapshot
 * do banco/score. NÃO é marketing — é briefing executivo.
 *
 * Disparado via /api/digest/socios (server-side, autenticado). Pode ser
 * agendado via skill `schedule` para rodar sexta 17h BRT.
 */

/**
 * Catálogo dos 5 sócios fundadores. E-mails confirmados via memory
 * (project_clients) + adições novas.
 *
 * IMPORTANTE: trocar para tabela `partners` no banco quando a base de
 * sócios crescer além dos 5. Hoje hardcode é defensivo (evita query
 * mal-filtrada vazar e-mails errados).
 */
export const SOCIOS_AGRAAS: Array<{ nome: string; email: string; role: string }> = [
  { nome: "Lucas Ferreira Borin",   email: "lucas@agraas.com.br",     role: "CEO · Co-fundador" },
  { nome: "Eduardo de Paola",       email: "eduardo@agraas.com.br",   role: "Operações + Financeiro" },
  { nome: "Pedro Salim",            email: "pedro.salim@agraas.com.br", role: "Operações + Marketing" },
  { nome: "Pedro Maluli",           email: "pedro.maluli@agraas.com.br", role: "Operações + Comercial" },
  { nome: "Frederico Maluli",       email: "frederico@agraas.com.br", role: "Operações + Campo" },
];

export type DigestSnapshot = {
  periodo: { inicio: string; fim: string };
  commits: Array<{ sha: string; msg: string; autor: string; data: string }>;
  decisoes: string[];           // títulos dos arquivos memory/decisions/*
  metricas_plataforma: {
    total_animais: number;
    score_medio_v3: number;
    range_score: { min: number; max: number };
    propriedades: number;
    farm_scores_atualizados: number;
    producer_scores_atualizados: number;
  };
  destaques_semana: string[];   // bullets curtos do que aconteceu
  proximos_passos: string[];    // 2-3 ações da próxima semana
};

/**
 * Renderiza o digest como HTML institucional para envio via Resend.
 * Tom Terminal Industries — editorial, profissional, sem emoji ostensivo.
 */
export function renderDigestHTML(snap: DigestSnapshot, socioNome: string): string {
  const fmtNum = (n: number) => n.toLocaleString("pt-BR");
  const fmtScore = (n: number) => n.toFixed(1).replace(".", ",");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Agraas · Digest Semanal</title>
</head>
<body style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background:#f4f7f2; margin:0; padding:24px; color:#1e2a1b;">
  <div style="max-width:640px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04);">

    <!-- Header -->
    <div style="background:#2E8B3E; padding:32px 32px 24px; color:white;">
      <p style="margin:0; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.18em; opacity:.85;">
        Agraas · Digest semanal
      </p>
      <h1 style="margin:8px 0 0; font-size:24px; font-weight:600; letter-spacing:-.02em;">
        ${snap.periodo.inicio} → ${snap.periodo.fim}
      </h1>
      <p style="margin:8px 0 0; font-size:13px; opacity:.85;">
        Olá, ${socioNome}. Aqui está o resumo executivo da semana.
      </p>
    </div>

    <!-- Métricas da plataforma -->
    <div style="padding:32px;">
      <p style="margin:0 0 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#788473;">
        Snapshot da plataforma
      </p>
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:13px;">Animais rastreados</td>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:14px; font-weight:600; text-align:right;">${fmtNum(snap.metricas_plataforma.total_animais)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:13px;">Score médio v3 · Embrapa Doc 237</td>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:14px; font-weight:600; text-align:right;">${fmtScore(snap.metricas_plataforma.score_medio_v3)}/100</td>
        </tr>
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:13px;">Range observado</td>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:14px; font-weight:600; text-align:right;">${fmtScore(snap.metricas_plataforma.range_score.min)} → ${fmtScore(snap.metricas_plataforma.range_score.max)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:13px;">Propriedades ativas</td>
          <td style="padding:12px 0; border-bottom:1px solid #eef0eb; font-size:14px; font-weight:600; text-align:right;">${fmtNum(snap.metricas_plataforma.propriedades)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0; font-size:13px;">Score de fazenda / produtor</td>
          <td style="padding:12px 0; font-size:14px; font-weight:600; text-align:right;">${snap.metricas_plataforma.farm_scores_atualizados} / ${snap.metricas_plataforma.producer_scores_atualizados}</td>
        </tr>
      </table>
    </div>

    <!-- Destaques da semana -->
    ${snap.destaques_semana.length > 0 ? `
    <div style="padding:0 32px 32px;">
      <p style="margin:0 0 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#788473;">
        Destaques da semana
      </p>
      <ul style="margin:0; padding-left:20px; line-height:1.7; font-size:14px;">
        ${snap.destaques_semana.map(d => `<li style="margin-bottom:8px;">${d}</li>`).join("")}
      </ul>
    </div>
    ` : ""}

    <!-- Commits relevantes -->
    ${snap.commits.length > 0 ? `
    <div style="padding:0 32px 32px;">
      <p style="margin:0 0 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#788473;">
        Mudanças técnicas (${snap.commits.length})
      </p>
      <ul style="margin:0; padding-left:0; list-style:none; font-size:13px;">
        ${snap.commits.slice(0, 8).map(c => `
          <li style="padding:10px 0; border-bottom:1px solid #eef0eb;">
            <code style="background:#f4f7f2; padding:2px 6px; border-radius:4px; font-size:11px; color:#788473;">${c.sha.slice(0,7)}</code>
            <span style="margin-left:8px;">${c.msg}</span>
          </li>
        `).join("")}
      </ul>
    </div>
    ` : ""}

    <!-- Decisões registradas -->
    ${snap.decisoes.length > 0 ? `
    <div style="padding:0 32px 32px;">
      <p style="margin:0 0 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#788473;">
        Decisões registradas
      </p>
      <ul style="margin:0; padding-left:20px; line-height:1.7; font-size:14px;">
        ${snap.decisoes.map(d => `<li style="margin-bottom:6px;">${d}</li>`).join("")}
      </ul>
    </div>
    ` : ""}

    <!-- Próximos passos -->
    ${snap.proximos_passos.length > 0 ? `
    <div style="padding:0 32px 32px;">
      <p style="margin:0 0 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#788473;">
        Próximos passos
      </p>
      <ul style="margin:0; padding-left:20px; line-height:1.7; font-size:14px;">
        ${snap.proximos_passos.map(p => `<li style="margin-bottom:6px;">${p}</li>`).join("")}
      </ul>
    </div>
    ` : ""}

    <!-- Footer -->
    <div style="padding:24px 32px; background:#f4f7f2; border-top:1px solid #eef0eb; font-size:11px; color:#788473; text-align:center;">
      <p style="margin:0 0 4px;">
        Agraas Agritech · digest semanal interno para sócios
      </p>
      <p style="margin:0;">
        Material confidencial. Não encaminhar.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

/**
 * Envia digest para todos os sócios via Resend.
 * Retorna lista de envios com status.
 */
export async function sendDigestToSocios(snap: DigestSnapshot): Promise<{
  enviados: number;
  falharam: number;
  detalhes: Array<{ socio: string; email: string; ok: boolean; error?: string }>;
}> {
  if (!process.env.RESEND_API_KEY) {
    return {
      enviados: 0,
      falharam: SOCIOS_AGRAAS.length,
      detalhes: SOCIOS_AGRAAS.map(s => ({
        socio: s.nome,
        email: s.email,
        ok: false,
        error: "RESEND_API_KEY não configurada",
      })),
    };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const detalhes: Array<{ socio: string; email: string; ok: boolean; error?: string }> = [];
  let enviados = 0;
  let falharam = 0;

  for (const socio of SOCIOS_AGRAAS) {
    try {
      const result = await resend.emails.send({
        from: "Agraas Digest <digest@agraas.com.br>",
        to: socio.email,
        subject: `Agraas · Digest ${snap.periodo.inicio} → ${snap.periodo.fim}`,
        html: renderDigestHTML(snap, socio.nome.split(" ")[0]),
      });

      if (result.error) {
        falharam++;
        detalhes.push({ socio: socio.nome, email: socio.email, ok: false, error: String(result.error) });
      } else {
        enviados++;
        detalhes.push({ socio: socio.nome, email: socio.email, ok: true });
      }
    } catch (err) {
      falharam++;
      detalhes.push({
        socio: socio.nome,
        email: socio.email,
        ok: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  return { enviados, falharam, detalhes };
}
