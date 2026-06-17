# Inputs — bridge de captura externa

Pasta-ponte entre material que você captura externamente (transcrições, papers, artigos, conversas) e o processamento que eu (Claude) faço para gerar memory, decisões e/ou mudanças no produto.

## Princípios

1. **Confidencial por padrão.** O `.gitignore` desta pasta exclui TODO o conteúdo do versionamento. Apenas este README e `.template/` ficam no git. Material sensível (calls JBS, banco, mentores) nunca vai pro GitHub.
2. **Captura → Processamento → Destinos.** Material aqui é processado por skills de intake e gera:
   - `memory/project_*.md` se for contexto durável
   - `docs/<tema>-AAAA-MM-DD.md` se merecer documentação estruturada
   - TODO no código se virar mudança de produto
   - Descarte se não tem valor recorrente
3. **Convenção de nomes:** `YYYY-MM-DD-tipo-titulo-curto.ext`
   - Ex: `2026-06-08-call-bradesco-resumo.md`
   - Ex: `2026-06-08-paper-embrapa-237-revisao.pdf`

## Tipos suportados

| Prefixo | Conteúdo | Skill que processa |
|---|---|---|
| `call-` | Transcrição de reunião (Plaud, Google Meet, manual) | `intake-call` |
| `paper-` | Paper acadêmico, documento técnico (PDF/markdown) | `intake-paper` |
| `news-` | Artigo, newsletter, post de setor | `intake-news` |
| `video-` | Transcrição de vídeo (YouTube, etc) | `intake-video` |
| `expert-` | Nota sobre contato/network/expert conhecido | `intake-expert` |
| `opportunity-` | Edital, parceria, abertura de oportunidade | `intake-opportunity` |
| `desabafo-` | Pensamento solto pra processar via diálogo socrático | `desabafo` |

## Como usar

1. **Você coloca** o arquivo aqui (drag-and-drop, salvar do Drive, etc.)
2. **Você roda** `/intake` no Claude Code
3. **Eu detecto** o tipo automaticamente pelo prefixo do nome (ou pergunto se ambíguo)
4. **Eu proceso** chamando a skill correspondente
5. **Eu reporto** o que extraí e onde armazenei (memory/docs/TODOs)
6. **Você decide** se aprova mudanças propostas ou ajusta

## Subpastas (opcional)

Pode organizar por tema se quiser. Igualmente confidenciais.

```
inputs/
├── README.md               ← este arquivo
├── .gitignore              ← exclui o resto
├── .template/              ← templates por tipo (versionado)
│   ├── call.md
│   ├── paper.md
│   └── ...
├── calls/                  ← suas calls semanais (gitignored)
├── papers/                 ← biblioteca de papers (gitignored)
├── daily/                  ← daily notes Obsidian (gitignored)
└── 2026-06-08-call-bradesco.md   ← qualquer arquivo direto (gitignored)
```

## O que NÃO fazer

- ❌ Versionar conteúdo aqui no git (já configurado pra ignorar)
- ❌ Compartilhar links públicos pra arquivos aqui
- ❌ Subir senhas, tokens, credenciais — Claude tem skill de detecção de secrets que avisa, mas evite na fonte
