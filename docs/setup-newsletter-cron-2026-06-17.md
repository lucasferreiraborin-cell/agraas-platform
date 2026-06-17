# Setup · Newsletter Sócios + Schedule Vercel + Drive MCP

> Guia operacional pós-Bloco 6+7 do Sprint A (17/06/2026)
> Tudo que **Lucas precisa executar manualmente** uma vez para o sistema rodar sozinho daí em diante.

---

## 1. Newsletter Sócios — uma única configuração necessária

### Variáveis de ambiente (Vercel Production + Preview)

Acesse `vercel.com/agraas-platform/settings/environment-variables` e adicione:

| Variable | Value | Como gerar |
|---|---|---|
| `DIGEST_TRIGGER_TOKEN` | string aleatória 64 chars | `openssl rand -hex 32` |
| `RESEND_API_KEY` | (já existe se outros e-mails funcionam) | Painel Resend |

Verifique que `agraas.com.br` está **verificado** no painel Resend (necessário pro `from: digest@agraas.com.br` funcionar).

### Teste antes de programar envio

```bash
# Pegar o token configurado:
export DIGEST_TOKEN=<o valor que você setou na Vercel>

# Preview (não envia — só gera HTML)
curl -X POST "https://agraas-platform.vercel.app/api/digest/socios?dryRun=true" \
  -H "Authorization: Bearer $DIGEST_TOKEN" > preview.html

# Abre no browser
open preview.html
```

Se gostou do layout, envia manual a primeira vez:

```bash
curl -X POST "https://agraas-platform.vercel.app/api/digest/socios" \
  -H "Authorization: Bearer $DIGEST_TOKEN"
```

A partir da próxima sexta 17:03 BRT, o Vercel Cron dispara automaticamente em **modo dry-run** — gera preview e armazena. Para virar envio real automático, troque a entrada `vercel.json` removendo `?dryRun=true`:

```json
{ "path": "/api/digest/socios", "schedule": "3 20 * * 5" }
```

E faça redeploy. **Recomendo manter dryRun por 1-2 sextas até validar consistência.**

---

## 2. Daily Briefing — já agendado, zero ação

O Vercel Cron dispara `/api/digest/daily` toda manhã às **7:57 BRT** (10:57 UTC), seg-sex. Grava snapshot do banco em `platform_settings.last_daily_briefing`.

A UI do `/painel` pode consumir esse snapshot para mostrar "última atualização há X" — implementação opcional, posterior.

---

## 3. Drive MCP — autenticação one-time

Já está conectado o MCP server. Lucas só precisa autenticar pela primeira vez para eu (Claude) conseguir ler arquivos do Drive dele.

### Passo a passo

1. Abre nova sessão Claude Code (esta sessão, ou próxima)
2. Digita: **"autentica meu Google Drive"**
3. Eu vou disparar o fluxo OAuth — abre browser, você autoriza
4. Conta autenticada fica salva para próximas sessões

### Como vou usar uma vez autenticado

- `list_recent_files` — vejo arquivos modificados nos últimos N dias
- `search_files` — busca por nome/conteúdo
- `read_file_content` — leio conteúdo de Doc, PDF, etc.

Casos de uso já mapeados:

- **Pasta `/Agraas/Reuniões/`** — quando salvar transcrição Plaud ou Google Meet IA, eu detecto via `list_recent_files` e processo via skill `intake-call`
- **Pasta `/Agraas/Papers/`** — papers Embrapa, IZ-SP, USP que você baixar — processo via `intake-paper`
- **Pasta `/Agraas/Pitches/`** — quando preparando pitch novo, leio para garantir consistência com decisões anteriores
- **Pasta `/Agraas/Contratos/`** — confidencial, **NÃO ler sem autorização explícita sua**

### Segurança

- Drive auth é por conta do **Lucas** (não compartilhado)
- Outros sócios não conseguem ler seu Drive via Claude (cada um autentica o seu se quiser)
- Eu não persisto conteúdo lido — entra na conversa, vira memory/doc só com sua aprovação

---

## 4. Crons configurados (estado final)

| Cron | Path | Schedule | Origem |
|---|---|---|---|
| Cotação CEPEA | `/api/cron/cotacao` | `0 11 * * *` (8h BRT) | Já existia |
| Daily Briefing | `/api/digest/daily` | `57 10 * * 1-5` (7:57 BRT seg-sex) | **Novo** |
| Sócios Digest (dryRun) | `/api/digest/socios?dryRun=true` | `3 20 * * 5` (17:03 BRT sexta) | **Novo** |

Edite `vercel.json` na raiz pra ajustar horários ou rotas.

---

## 5. Próximos passos sugeridos (não bloqueantes)

- [ ] Criar página interna `/configuracoes/digest` para Lucas controlar disparo manual via UI (sem precisar de `curl`)
- [ ] Integrar daily-briefing com weekly-review automaticamente (sexta consolida segunda a sexta)
- [ ] Versão simplificada do digest para Pedro/Frederico (campo) vs Eduardo (financeiro) — customização por sócio
- [ ] Conectar `embrapa-monitor` + `mapa-pnib-monitor` ao daily-briefing automaticamente (hoje rodam separados)

---

> *Setup Newsletter + Cron + Drive · Agraas · 17 de junho de 2026*
