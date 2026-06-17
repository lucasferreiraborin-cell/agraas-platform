---
name: intake-opportunity
description: Registra edital, parceria, abertura comercial, programa de aceleração ou outras oportunidades com prazo. Avalia fit Agraas e cria TODO com data. Trigger keywords: "edital", "abertura", "parceria", "programa", "aceleração", "venture", arquivos em inputs/ com prefixo "opportunity-".
---

# Intake — Oportunidade

Estruturar editais/aberturas/programas e decidir se Agraas vai atrás.

## Campos obrigatórios

1. **Tipo de oportunidade**:
   - `edital_publico` (BNDES, Finep, Fapesp, etc.)
   - `programa_aceleracao` (Y Combinator, Endeavor, Cubo Itaú, etc.)
   - `parceria_corporativa` (corporate venture, P&D conjunto)
   - `abertura_comercial` (cliente potencial, RFP)
   - `chamada_artigo` (call for papers, congresso)
   - `evento_setorial` (Agrishow, Beef Summit, etc.)

2. **Instituição** (BNDES, JBS Ventures, Embrapa, etc.)

3. **Prazo** (DD/MM/AAAA) — sem prazo claro, marcar `prazo: rolling`

4. **Valor potencial** (R$ ou USD se aplicável)

5. **Requisitos básicos** (1 parágrafo)

6. **Fit Agraas** (1 parágrafo + score):
   - `alto` — alinhamento direto com tese, prazo viável
   - `medio` — alinhamento parcial, precisa esforço pra adequar
   - `baixo` — alinhamento tangencial, custo de aplicação não compensa
   - `nao` — não aplica

## Decisão de destino

- Sempre: nota em `memory/opportunities_AAAA-MM.md` (1 arquivo por mês)
- Fit `alto` ou `medio`: TODO no TodoWrite com prazo + criar `docs/aplicacao-<edital>-<data>.md` placeholder
- Fit `baixo` ou `nao`: registra e descarta com 1 linha justificando

## Formato de saída

```markdown
## Oportunidade — [nome]

**Tipo**: [...]  **Instituição**: [...]  **Prazo**: DD/MM
**Valor**: [R$/USD]  **Fit Agraas**: [alto/medio/baixo/nao]

### O que pede
[2-3 linhas]

### Por que faz (ou não) sentido para Agraas
- [bullet]

### Próximo passo
- [ ] [ação concreta com prazo]

### Salvei em
- memory/opportunities_AAAA-MM.md
```

## Sinais de fit alto (atalhos)

Marcar fit `alto` automaticamente se a oportunidade combina **pelo menos 2** dos seguintes:

- Foco em **rastreabilidade, EUDR, PNIB, SISBOV**
- Foco em **pecuária bovina BR**
- Foco em **tecnologia + agro**
- Foco em **infraestrutura digital / camada de confiança**
- Foco em **manejo regenerativo + carbono**
- Cliente potencial é **frigorífico, banco, certificadora, comprador institucional**

## Sinais de fit baixo

- Foco exclusivo em pequeno produtor familiar (fora do ICP atual)
- Foco em cadeias que pausamos (ovinos, aves, agricultura)
- Requer maturidade comercial maior que temos
- Prazo muito apertado (< 1 semana) sem material pronto
