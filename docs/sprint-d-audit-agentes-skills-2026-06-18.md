# Audit · Skills e Agentes Agraas · 18/06/2026

Avaliação completa do parque de skills e agentes atual + propostas de melhoria.

---

## Agentes (8 hoje)

| Agente | Estado | Qualidade | Próximo passo |
|---|---|---|---|
| `agraas-captacao-strategy` | ✅ Ativo | Boa — escopo claro (deck/DD/term sheet/valuation) | Adicionar comparáveis agtech LATAM (Aracatu, Solinftec) |
| `agraas-cientifico-zootecnista` | ✅ Ativo | Excelente — ponte com IZ-SP, domina Embrapa Doc 237 | Manter; agendar com Renata trimestral |
| `agraas-controladoria-fiscal` | 🆕 Criado HOJE | A validar uso real | Sprint E vai exercitar |
| `agraas-mercado-bovino` | ✅ Ativo | Boa — cotações, big 5, exportação | Conectar com `market_signals` (Sprint D) |
| `agraas-rastreabilidade-auditor` | ✅ Ativo | Excelente — domina EUDR/PNIB/ISO RFID | Adicionar GTA digital quando MAPA publicar regra |
| `agraas-triangulacao-auditor` | ✅ Ativo | Crítico — pegou bug fiscal-estoque-custo no Sprint A | Manter; rodar mensal |
| `backend-engineer` | ✅ Ativo | Excelente — entregou migrations 124-127 | Manter |
| `frontend-engineer` | ✅ Ativo | Excelente — entregou Sprint B/C UI | Manter |

**Lacunas detectadas:**

- ❌ **Não temos agente de produto / UX research** — quem decide hierarquia de telas, design system, microcopy
- ❌ **Não temos agente de mobile (Expo)** — está fora de escopo agora mas voltará
- ❌ **Não temos agente de growth / marketing digital** — SEO, conteúdo, captura de produtor

**Propostas Sprint E:**

1. `agraas-produto-ux` — orienta hierarquia visual, refator de telas, microcopy (Lucas pediu polish de Painel/Dashboard/Animais)
2. `agraas-growth-marketing` — SEO, blog editorial, captação produtor (acionado quando começar onboarding em massa)

---

## Skills (16 hoje)

### Skills de intake (6)
| Skill | Função | Estado |
|---|---|---|
| `intake-call` | Transcrição Plaud/Meet → memory + decisão | ✅ |
| `intake-expert` | Sessão com mentor IZ-SP → pauta + ação | ✅ |
| `intake-news` | Artigo/clipping → market_signal + atualiza tese | ✅ — agora pode persistir em `market_signals` |
| `intake-opportunity` | Lead (cliente, parceiro, investidor) → pipeline | ✅ |
| `intake-paper` | Paper Embrapa/IZ → resumo + impacto Score Engine | ✅ |
| `intake-video` | Curso/webinar → memory + skill update | ✅ |

### Skills de monitor (5)
| Skill | Função | Estado |
|---|---|---|
| `embrapa-monitor` | Publicações Embrapa relevantes | ⚠️ Não automatizada — depende de eu rodar manualmente |
| `mapa-pnib-monitor` | Atualizações MAPA/PNIB | ⚠️ Idem |
| `mbps-monitor` | Marco Brasileiro Produção Sustentável | ⚠️ Idem |
| `mercados-externos-monitor` | China/EUA/UE/MENA/Japão | ⚠️ Idem |
| `competitive-radar` | Movimento concorrentes (Agrofy/MF/etc) | ⚠️ Idem |

**🔥 Gap crítico:** essas 5 skills são reativas — só rodam quando Lucas (ou eu via skill) dispara. **Após Sprint D**, recomendo migrar parte do trabalho delas para o sistema de `market_signals` automatizado. Skills continuam pra análises profundas; coleta diária roda no cron.

### Skills de produto / processo (5)
| Skill | Função | Estado |
|---|---|---|
| `agraas-fsjbe-guard` | Regras de tom público sobre FSJBE | ✅ Crítica — Lucas validou 27/04 |
| `daily-briefing` | Briefing matinal | ⚠️ Lucas criticou em 18/06 — agora Briefing 2.0 estruturado em `/api/digest/daily` |
| `decision-journal` | Registra decisões grandes | ✅ |
| `desabafo` | Lucas precisa pensar alto sem solução imediata | ✅ Boa para reflexão |
| `pitch-readiness` | Checa se deck/material está pronto pra investidor | ✅ |
| `socios-digest` | Newsletter institucional sócios | ✅ Sprint A |
| `weekly-review` | Revisão sexta | ✅ |

---

## Recomendações priorizadas

### 🔴 Urgentes
1. **Daily-briefing**: já reescrito como `/api/digest/daily` v2 estruturado em Plataforma / Mercado / Decisões / Insights. Migrar a skill para apontar pra endpoint.
2. **embrapa-monitor / mapa-pnib-monitor / abiec-monitor**: precisam virar coleta automatizada no `market_signals` ao invés de skill manual. **Já feito parcialmente no Sprint D** via `noticias-fetcher.ts`. Próximo: adicionar fetchers específicos.

### 🟡 Importantes
3. **Criar `agraas-produto-ux`** — Lucas pediu polish visual (Painel/Dashboard/Animais)
4. **competitive-radar**: pode virar coleta automatizada também (top concorrentes têm RSS/news)
5. **agraas-mercado-bovino**: conectar com `market_signals` pra leitura direta de sinais frescos

### 🟢 Saudáveis (manter sem mudar)
6. `agraas-cientifico-zootecnista` + `agraas-rastreabilidade-auditor` + `agraas-triangulacao-auditor` — pilares técnicos da plataforma
7. `agraas-fsjbe-guard` — guarda compliance pública
8. `socios-digest` — newsletter funcionando, só faltam ENV vars

---

## Modelo IA recomendado

Hoje rodamos majoritariamente em **Claude Sonnet 4.6** (versão da família Sonnet 4 mais recente, ID `claude-sonnet-4-6`). Para Sprint D:

- **PainelInsights** (já existia): mantém Sonnet 4.6
- **Generate-insights cron**: usa Sonnet 4.6 (melhor custo-benefício pra batch de N clientes)
- **Análises profundas / pitch-readiness / agentes complexos**: Opus 4.7 (`claude-opus-4-7`) — chamado sob demanda quando precisa raciocínio mais elaborado
- **Embeddings semânticos** (futuro, pra busca em papers): Voyage 3 lite via API
