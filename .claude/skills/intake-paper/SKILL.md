---
name: intake-paper
description: Processa paper acadêmico, documento técnico (PDF/markdown) com lente "isso muda Agraas?". Extrai claim principal, metodologia, variáveis quantitativas e aplicabilidade ao Score Engine v3, produto ou posicionamento. Trigger keywords: "paper", "documento técnico", "Embrapa", "+Precoce", arquivos em inputs/ com prefixo "paper-".
---

# Intake — Paper / Documento Técnico

Skill que destila material científico/técnico em insights aplicáveis à Agraas.

## Quando invocar

- `/intake` detecta arquivo `inputs/paper-*.pdf` ou `inputs/paper-*.md`
- Lucas pede "processa esse paper"
- Skill `embrapa-monitor` encontrou publicação relevante e chama intake-paper

## Entradas esperadas

1. PDF, markdown ou texto cru
2. Opcional: contexto sobre por que esse paper importa agora (mentoria, decisão pendente, etc.)

## Processo

### 1. Identificação bibliográfica
Extrair:
- Autores (sobrenome, ano)
- Periódico ou instituição publicadora
- ISSN/DOI se houver
- URL canônica

### 2. Verificação de autenticidade
Antes de citar nominalmente: WebFetch da fonte oficial pra confirmar autoria + ano + título. Erros em citação queimam credibilidade institucional.

### 3. Extração estruturada

| Categoria | O que extrair |
|---|---|
| **Claim principal** | A tese central, em 1-2 frases |
| **Metodologia** | Como os autores chegaram à conclusão (RCT, revisão, observacional, modelo) |
| **Variáveis quantitativas** | Faixas, médias, percentuais — útil para calibrar Score Engine |
| **Limitações declaradas** | O que os próprios autores admitem como fraco |
| **Contexto brasileiro** | Aplica-se diretamente? Precisa adaptação? Está fora do escopo BR? |

### 4. Aplicabilidade Agraas — 4 perguntas-chave

1. **Score Engine v3**: esse paper sustenta ajuste em peso/fórmula de algum pilar?
2. **Produto**: novo módulo/feature/campo de dado se justifica?
3. **Posicionamento**: vira citação em pitch deck, relatório institucional, mentoria?
4. **Pauta de mentoria**: questão para discutir com Renata/Franzon?

### 5. Decisão de destino

| Conteúdo | Destino |
|---|---|
| Citação válida pra deck/relatório | adicionar ao `docs/score-engine-relatorio-mentoria-*.md` ou criar `docs/citacoes-cientificas.md` |
| Variável quantitativa que muda Score | TODO técnico no código + comentário em `123_score_engine_v3.sql` |
| Insight pra acompanhamento | `memory/project_*.md` |
| Não aplicável agora | descarta, mas registra "lido em DD/MM" |

## Aplicação rigorosa para Embrapa Doc 237 e similares

Se o paper é da **Embrapa, +Precoce, NeuTroPec, IZ-SP, USP, ESALQ**:

- **Citar com referência completa** em qualquer doc institucional (já fazemos isso para Costa et al. 2018)
- **Marcar `decisão de equipe Agraas pendente de validação científica`** se contradiz nosso Score Engine atual
- **Levar para mentoria** explicitamente como pauta

## Formato de saída padrão

```markdown
## Paper processado — [Autor, Ano. Título curto]

**Referência completa**: [...]
**URL**: [...]
**Confiança da fonte**: [validada via WebFetch | citada por mentor confiável | não validada ainda]

### Claim principal
[1-2 frases]

### Aplicabilidade Agraas
- **Score Engine**: [muda peso X? confirma fórmula Y? sem impacto?]
- **Produto**: [feature nova? não]
- **Posicionamento**: [citação útil em deck? não]
- **Pauta mentoria**: [pergunta para Renata/Franzon? não]

### Variáveis quantitativas relevantes
- [valor 1, faixa X-Y]

### Ações propostas
- [ ] Atualizar `docs/Y.md` com citação
- [ ] TODO no SQL: revisitar peso Z

### Salvei em
- [...]
```

## O que NÃO fazer

- ❌ Citar paper sem ter feito WebFetch da fonte oficial primeiro
- ❌ Inventar conclusões baseadas em leitura parcial
- ❌ Aplicar achados de paper estrangeiro como se fossem BR sem checar contexto regional
- ❌ Mudar Score Engine direto baseado em 1 paper — sempre passar por mentoria/validação
