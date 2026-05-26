# Pauta de Mentoria · Agraas + Instituto de Zootecnia de SP

> **Para**: Dra. Renata Tieko Nassu · Prof. César Gonçalves de Lima
> **De**: Equipe Agraas — Lucas Ferreira Borin
> **Sessão de referência**: 29 de maio de 2026
> **Versão**: rascunho 1 · 19/05/2026
>
> Documento de apresentação geral + acessos institucionais + pauta sugerida para a próxima sessão de mentoria.

---

## ⚠️ Antes de enviar (checklist interno de Lucas)

Itens a confirmar antes de mandar este doc para Renata e César:

- [ ] **Local + horário** da sessão 29/05 — definir e preencher no §6
- [ ] **Tom da apresentação institucional formal** vs sessão técnica de trabalho — calibrar §3 e §5 conforme preferência deles
- [ ] **Senhas**: confirmar se Agraas@2026 ainda está ativa nas 3 contas; pedir troca no primeiro login (§4)
- [ ] **Mídia visual**: anexar 2-3 screenshots da plataforma (sugestão: hero do /painel, /animais com lista, /reprodutivo com KPIs)
- [ ] **Foto + bio breve do time fundador** — para inserir no §1 se quiser personalizar
- [ ] **Canal de comunicação contínua** — WhatsApp do Lucas? Grupo dedicado? E-mail só? Definir no §7
- [ ] **Assinatura final** — quem assina (Lucas só? Equipe Agraas?)

---

## 1. Quem somos

A Agraas é uma plataforma brasileira voltada à construção de **infraestrutura digital de confiança para o agronegócio**. Operamos sobre uma premissa simples: cada animal, lote e propriedade deve ter uma **identidade digital permanente, rastreável e auditável** — do nascimento na fazenda até o destino final na cadeia.

Nascemos em São Paulo em 2025 e estamos em produção desde abril de 2026. Nosso foco atual e exclusivo, validado em mentoria pós-Agrishow 2026, é **pecuária bovina** — uma decisão proposital para construir profundidade antes de largura.

A escolha pela pecuária bovina não é tática. É a porta de entrada institucional do agro brasileiro: cadeia mais regulada (PNIB, EUDR), maior valor agregado por unidade rastreável, maior urgência competitiva diante de mercados externos, e modelo de dados extensível às outras cadeias críticas do Brasil (suíno, ave, leite, ovino-caprino, grãos).

---

## 2. O que estamos construindo — visão técnica acessível

A Agraas se posiciona como **camada única de dados verificáveis** entre todos os elos da cadeia:

```
  PRODUTOR ──── FRIGORÍFICO ──── TRADER ──── COMPRADOR INSTITUCIONAL
      │              │              │                  │
      └──────────────┴──── AGRAAS ──┴──────────────────┘
                  Identidade · Score · Cadeia
```

### O que já existe em produção (status maio/2026)

| Área | O que está pronto |
|---|---|
| **Identidade animal** | Cadastro completo, ID único Agraas, raça, sexo, nascimento, propriedade atual, status |
| **Pesagens** | Registro histórico individual, GMD calculado, evolução por animal e por lote |
| **Sanidade** | Aplicações com período de carência, calendário sanitário, estoque sanitário |
| **Reprodutivo** | Estação de monta, taxa de prenhez, IA, desmame, indicadores de eficiência |
| **Lotes e movimentações** | Gestão por objetivo produtivo, histórico de transferências entre propriedades |
| **Score Agraas** | Pontuação multidimensional (sanitário, operacional, continuidade) por animal |
| **Fiscal** | Importação de NF-e, conciliação com estoque, alertas de inconsistência |
| **Marketplace** | Estrutura para comércio aberto de insumos, equipamentos, RFID e serviços |
| **Comercialização** | Vendas, abates, propostas, compradores e fornecedores |
| **Cadeia e tracking** | Visibilidade de embarques e movimentações inter-propriedades |
| **Auditoria** | Trilha completa de toda mutação na plataforma |
| **Mentoria externa** | Perfis institucionais com acesso espelho controlado (modelo que está sendo desenhado para vocês) |

### Como a Agraas é construída

- **Banco de dados único e auditável** — 86 modelos de dados, 121 migrações versionadas, 327 políticas de segurança em nível de linha (cada cliente vê apenas seus dados)
- **Isolamento multi-tenant** — uma fazenda nunca enxerga dados de outra; mentor externo só lê o que foi autorizado
- **Inteligência artificial assistiva** — apoia o produtor e o mentor científico a ler dados operacionais; toda decisão é humana, a IA acelera o diagnóstico
- **Aplicativo mobile** — em desenvolvimento, para uso de campo offline-tolerante
- **Plataforma web** — operacional desde abril/2026

### O piloto FSJBE

Atualmente, a Agraas está em fase de validação operacional na **Fazenda São João da Boa Esperança (FSJBE), Jandaia, Goiás** — fazenda de cria em piloto MVP, com tombamento técnico Multbovinos → Agraas em desenvolvimento durante 2026. Hoje a fazenda opera com 5 animais ilustrativos no sistema (BER-001 a BER-005) enquanto o tombamento real é concluído. **Toda a plataforma já está rodando em modo "Demonstração"** com indicação visual explícita disso, para que dados ilustrativos nunca sejam confundidos com produção em escala.

---

## 3. Por que estamos pedindo a mentoria de vocês

A escolha por buscar a mentoria do Instituto de Zootecnia de SP — e especificamente de vocês dois — não foi acidente. Três motivos:

**3.1. Rigor científico sobre o score Agraas.**
Nosso score multidimensional (sanitário, operacional, continuidade) precisa de **validação metodológica externa, idealmente publicável**. A reputação científica do IZ-SP e a experiência de vocês em metodologias quantitativas (Prof. César) e em pesquisa aplicada em produção animal (Dra. Renata) são exatamente o tipo de input que diferencia "métrica proprietária" de "metodologia auditável".

**3.2. Conexão com o programa NeuTroPec.**
O NeuTroPec, com seu enfoque em **neutralidade tropical** — manejo regenerativo, eficiência hídrica, baixo carbono — é o ecossistema científico mais alinhado com nossa tese de "sustentabilidade verificável". Selo só vale se for verificável; e verificabilidade só vale se for científica.

**3.3. Visão multi-cadeia.**
Quando expandirmos para suíno, ave, leite, ovino e caprino (roadmap 2028-2029), vamos precisar de conhecimento profundo de cada cadeia. O Instituto de Zootecnia cobre todas. Mesmo que hoje estejamos focados em bovino, a relação com vocês é construída pensando no horizonte completo.

---

## 4. Acessos institucionais — três perfis ativos para vocês

Provisionamos três contas técnicas para a mentoria a partir de **18 de maio de 2026**. Os logins são compartilhados entre Renata e César — qualquer um de vocês acessa qualquer um dos perfis. A senha é **temporária e deve ser trocada no primeiro acesso**.

**URL de acesso**: `https://www.agraas.com.br/login`
**Senha temporária para os 3 logins**: `Agraas@2026`

| Perfil | E-mail de login | O que enxerga | Permissões |
|---|---|---|---|
| **🟢 Produtor — Mentoria IZ-SP** | `mentoria.produtor@agraas.com.br` | Fazenda Mentoria IZ-SP (fictícia, criada para vocês) com animais, lotes, eventos, pesagens, sanidade e reprodução | **CRUD completo** — vocês podem cadastrar, editar, simular cenários |
| **🟠 Comprador — Mentoria IZ-SP** | `mentoria.comprador@agraas.com.br` | Frigorífico Mentoria IZ-SP (fictício) com visão de compras, lotes contratados, certificações de fornecedor | **CRUD completo** — para entender o fluxo do comprador institucional |
| **🔵 Mentor espelho FSJBE** | `mentoria.fsjbe@agraas.com.br` | Visão **read-only** da FSJBE real (5 animais ilustrativos hoje) | **Somente leitura** — observação sem interferir no dado vivo |

### Por que três perfis e não um?

Porque a cadeia tem **três perspectivas distintas** e a Agraas precisa funcionar bem em todas:

1. **Produtor** vê seu próprio rebanho, suas próprias operações, sua própria gestão financeira
2. **Comprador institucional** vê sua carteira de fornecedores, certificações, qualidade de origem
3. **Mentor externo** vê uma fazenda real (FSJBE) sem poder alterar nada — é o modelo de acesso que estamos desenhando para auditores, certificadores e consultores científicos

Vocês podem alternar entre os três perfis para entender como a plataforma se comporta em cada papel.

### Etiqueta de acesso

- A senha temporária `Agraas@2026` deve ser trocada no primeiro login (peça uma redefinição via "Esqueci minha senha" na tela de login, se preferir)
- O acesso é registrado em audit log da Agraas — isto é padrão, não vigilância dirigida
- Os perfis Mentoria são **fictícios e isolados** — qualquer dado que vocês cadastrarem não impacta clientes reais
- O perfil **mentor espelho FSJBE** é o único que toca dado real (read-only); os outros dois são ambientes seguros para experimentar

---

## 5. Pauta sugerida para a sessão presencial 29/05

Sugestão de agenda — total ~2h. Reorganizável conforme prioridade de vocês:

**Bloco 1 · Demo navegada (30 min)**
Walkthrough conjunto da plataforma com vocês dirigindo o ritmo. Recomendamos começar pelo perfil **Produtor — Fazenda Mentoria IZ-SP**: cadastro de animal, pesagem, aplicação sanitária, lote, score.

**Bloco 2 · Score Agraas — metodologia em detalhe (40 min)**
Apresentação técnica do algoritmo do score multidimensional:
- Componente sanitário (carências, certificações, conformidades)
- Componente operacional (peso, GMD, eficiência)
- Componente de continuidade (eventos no tempo, gaps de rastreabilidade)

Solicitação concreta: feedback metodológico sobre **pesos, fórmulas, calibração e potencial de publicação científica conjunta**.

**Bloco 3 · Sustentabilidade verificável e NeuTroPec (30 min)**
Discussão sobre como integrar métricas do NeuTroPec (CO2eq, eficiência hídrica, manejo regenerativo) ao modelo de dados Agraas. Como capturar dado em campo sem custo cognitivo adicional para o produtor.

**Bloco 4 · Próximos passos (20 min)**
- Cadência da mentoria (quinzenal? mensal?)
- Possibilidade de publicação conjunta (revista, prazo, co-autoria)
- Conexões pretendidas com Embrapa Gado de Corte, USP-Pirassununga, ESALQ
- O que mais precisamos preparar antes da próxima sessão

---

## 6. O que estamos pedindo de vocês especificamente

Para a relação não virar genérica, segue lista honesta do que mais valorizamos no aporte de vocês:

**Alta prioridade — durante a mentoria atual:**
1. **Validação metodológica do score Agraas** — feedback técnico, sugestões de ajuste, identificação de vieses
2. **Calibração de métricas regenerativas** — quais indicadores realmente medem manejo regenerativo de forma auditável
3. **Honestidade institucional** — onde estamos prometendo demais? Onde estamos prometendo de menos?

**Média prioridade — próximos 3-6 meses:**
4. **Co-desenho de protocolo experimental** — fazer da Fazenda Mentoria IZ-SP um ambiente de teste estruturado, mesmo que fictício
5. **Conexões científicas brasileiras** — abertura de portas com Embrapa, USP, ESALQ
6. **Validação do modelo de mentor_externo** — o próprio papel que vocês estão desempenhando agora é o protótipo de como auditores e certificadores externos vão acessar a plataforma no futuro

**Horizonte longo — 6-18 meses:**
7. **Co-autoria em publicação científica** sobre metodologia do score e sobre o modelo de mentor externo verificável
8. **Diretrizes para expansão multi-cadeia** — quando expandirmos para suíno, ave, leite, ovino, queremos vocês como conselho informal de cada cadeia

---

## 7. Próximos passos e contato

**Próxima sessão presencial**: [LUCAS PREENCHER local + horário · 29/05/2026]

**Cadência sugerida**: sessões quinzenais (sujeito à disponibilidade de vocês)

**Canal de comunicação contínua**:
- E-mail: `lucas@agraas.com.br`
- [LUCAS DEFINIR se quer disponibilizar WhatsApp / Telegram]

**Documentos complementares anexáveis** (caso desejem, posso enviar):
- Especificação técnica completa do modelo de dados (~30 páginas)
- Documento do score engine com pseudocódigo
- Roadmap regulatório (PNIB, EUDR, Reforma Tributária, LGPD)
- Brief institucional para a Secretaria de Agricultura SP

---

## Encerramento

A Agraas está sendo construída no entendimento de que a confiança em dados do agro brasileiro é **infraestrutura pública** — algo que produtor, comprador, comunidade científica e governo compartilham. A presença de vocês neste momento não é figurativa: é constitutiva da forma como a plataforma vai existir daqui em diante.

Obrigado pela disponibilidade. Estamos prontos para a sessão de 29 de maio.

Atenciosamente,
**Lucas Ferreira Borin**
Agraas Agritech
`lucas@agraas.com.br`

---

> *Documento institucional confidencial — uso restrito à mentoria Agraas × Instituto de Zootecnia de SP.
> Versão 1 · 19 de maio de 2026.*
