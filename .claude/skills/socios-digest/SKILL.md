---
name: socios-digest
description: Gera e envia digest semanal institucional aos 5 sócios da Agraas (Lucas, Eduardo, Pedro Salim, Pedro Maluli, Frederico). Consolida métricas da plataforma, commits relevantes, decisões registradas, próximos passos. Trigger keywords "digest sócios", "newsletter interna", "resumo da semana para sócios".
---

# Sócios Digest — newsletter institucional interna

Skill que materializa a **comunicação semanal entre Lucas e os outros 4 sócios** sobre o estado real da empresa. Não é marketing — é briefing executivo.

## Por que existe

Lucas trouxe explicitamente em 17/06/2026: *"Vamos definir um fluxo também que toda e qualquer melhoria depois você mande newsletter para mim e meus sócios."*

5 sócios fundadores precisam estar alinhados sem precisar olhar git, memory, banco. Esse digest é o cabo de comunicação.

## Quando invocar

1. **Sob demanda**: Lucas diz "manda digest pra galera"
2. **Sexta-feira 17h BRT**: via skill `schedule` (cron)
3. **Após sprint grande**: quando weekly-review identifica que houve mudança material
4. **Pré-reunião societária**: 24h antes de qualquer reunião que envolva os 5 sócios

## Catálogo dos sócios

Hardcoded em `lib/socios-digest.ts` (defensive — evita query mal-filtrada vazar e-mails errados):

| Sócio | E-mail | Papel |
|---|---|---|
| Lucas Ferreira Borin | `lucas@agraas.com.br` | CEO · Co-fundador |
| Eduardo de Paola | `eduardo@agraas.com.br` | Operações + Financeiro |
| Pedro Salim | `pedro.salim@agraas.com.br` | Operações + Marketing |
| Pedro Maluli | `pedro.maluli@agraas.com.br` | Operações + Comercial |
| Frederico Maluli | `frederico@agraas.com.br` | Operações + Campo |

**Manutenção**: trocar para tabela `partners` no banco quando passar de 5 sócios.

## Estrutura do digest

Renderizado em HTML institucional (Terminal Industries tone — editorial, sem emoji ostensivo):

1. **Header** — período (DD/MM → DD/MM) + saudação personalizada
2. **Snapshot da plataforma** — total animais, score médio v3, range, propriedades, farm/producer scores
3. **Destaques da semana** — 3-7 bullets curtos (lucas escreve ou skill detecta de weekly-review)
4. **Mudanças técnicas** — top 8 commits relevantes (excluindo merge/typo)
5. **Decisões registradas** — títulos dos `memory/decisions/*` da semana
6. **Próximos passos** — 2-3 ações da próxima semana
7. **Footer** — confidencialidade

## Como executar

### Modo Manual (Lucas dispara via comando)

```bash
# 1. Preview (sem enviar) — abre HTML no navegador
curl -X POST "https://agraas.com.br/api/digest/socios?dryRun=true" \
  -H "Authorization: Bearer $DIGEST_TRIGGER_TOKEN" > preview.html

# 2. Enviar de fato
curl -X POST "https://agraas.com.br/api/digest/socios" \
  -H "Authorization: Bearer $DIGEST_TRIGGER_TOKEN"
```

### Modo Schedule (cron remoto)

```bash
/schedule create "digest semanal sócios" \
  "*/0 17 * * 5" \
  "curl -X POST https://agraas.com.br/api/digest/socios -H 'Authorization: Bearer $DIGEST_TRIGGER_TOKEN'"
```

## Configuração necessária (one-time)

Lucas precisa configurar em Vercel + .env.local:

```
RESEND_API_KEY=re_xxx (já existe — usado em outros e-mails)
DIGEST_TRIGGER_TOKEN=<gerar via openssl rand -hex 32>
```

E garantir domínio `agraas.com.br` verificado no painel Resend para `from: digest@agraas.com.br` funcionar.

## Evolução planejada

- **v1 (agora)**: métricas + estrutura HTML pronta, destaques/commits/decisões vazios (skill deixa Lucas preencher)
- **v1.1**: ler `git log --since="7 days ago"` automaticamente e popular commits
- **v1.2**: integrar com `weekly-review` skill — destaques vêm de lá
- **v1.3**: incluir snapshot do scenario externo (cotação @, EUDR updates) via skills `mercado-bovino` + `mapa-pnib-monitor`
- **v2**: customização por sócio (Eduardo ganha mais financeiro, Frederico mais campo, etc.)

## Guard rails

- ❌ NUNCA enviar para e-mail que não está em `SOCIOS_AGRAAS`
- ❌ NUNCA expor `DIGEST_TRIGGER_TOKEN` em log ou commit
- ❌ NUNCA incluir dados sensíveis de cliente (FSJBE real, contratos, etc.) sem mascaramento
- ❌ NUNCA disparar sem dryRun antes da primeira vez de cada semana — confirmar HTML
- ✅ SEMPRE log do resultado (`enviados`, `falharam`) para auditoria
- ✅ SEMPRE marcar "Material confidencial. Não encaminhar." no footer
- ✅ Tom institucional — Lucas pode mostrar pro investidor sem ficar mal
