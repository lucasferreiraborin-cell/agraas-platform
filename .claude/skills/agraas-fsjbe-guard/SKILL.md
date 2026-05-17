---
name: agraas-fsjbe-guard
description: Regras de compliance FSJBE, posicionamento institucional e foco atual da Agraas. Use sempre que o usuário pedir copy/conteúdo do site público, fizer claims sobre o cliente FSJBE, tocar em afirmações de exportação/Halal/certificação, ou trabalhar em copy/marketing/posicionamento. Triggers de keywords:&nbsp;"site", "landing", "sobre", "portos", "FSJBE", "passaporte público", "halal", "jeddah", "exportação", "certificação", "copy", "marketing", "posicionamento", "concorrente", "Agrofy", "MF Rural", "founder", "bio", "marketplace".
---

# Agraas — FSJBE compliance e foco institucional

Estas regras valem para qualquer mudança de copy, claim ou conteúdo público (landing, página sobre, portos, passaporte, marketing). Se em dúvida, pergunta ao Lucas antes de escrever.

## Regra 1 — FSJBE é piloto MVP, não case fechado

FSJBE (Jandaia-GO) é o cliente vivo, mas é piloto MVP, **fazenda de cria**, **sem exportação confirmada**. Nunca afirmar no site público:

- "Halal" (certificação, abate, mercado) ligado a FSJBE
- "Jeddah" / "embarque Jeddah" / qualquer rota Brasil-Arábia confirmada
- "Q2 2026" como data de exportação
- "SIF certificado" (FSJBE não tem)
- "exportação confirmada" / "apto exportação"
- "cliente fundador em operação" — frase é forte demais; FSJBE está rodando, mas não é "em operação plena" no sentido institucional

Se for falar de FSJBE, usar termos honestos: "piloto", "cliente piloto MVP", "rastreabilidade ativa em campo", "fase de validação".

## Regra 2 — Tom competitivo: silêncio e atributo

Superar em silêncio. **Nunca confrontar** Agrofy, MF Rural ou qualquer concorrente por nome. Posicionamento sempre por atributo próprio, não por comparação.

- ❌ "Diferente do Agrofy, a Agraas faz X"
- ✅ "A Agraas faz X" (ponto. quem conhece o mercado entende)

## Regra 3 — Marketplace = Mercado Livre do agro

O marketplace Agraas vende **tudo do agro**, não só pecuária:

- Ração, sêmen, insumos, fertilizantes, defensivos
- Máquinas (tratores, colheitadeiras, implementos)
- RFID (bolus, brincos, subcutâneo)
- Revendas, serviços (consultoria, transporte, abate)

Quando escrever sobre marketplace, **não** restringir a pecuária. Pensar em "Mercado Livre do agro brasileiro".

## Regra 4 — Sem "cara de AI startup"

Site deve parecer **líder do agro BR**, não demo de IA. Evitar:

- Shimmer exagerado, aurora, glow excessivo
- "Intelligence Layer", "AI-powered", "Powered by Claude" em destaque
- Stack flex (mostrar logos de "tech stack" tipo Vercel/Supabase/Anthropic)
- Rotating pills, animações de hype
- Labels `font-mono` em toda seção (parece dashboard, não institucional)

Visual de referência: Terminal Industries, John Deere institucional, Cargill, ADM. Foto + tipografia + silêncio editorial.

## Regra 5 — Cautela com dados sensíveis

**Pausar antes de publicar** (perguntar ao Lucas):

- Bios completas dos founders
- Scores reais de cliente (mesmo de Lucas/Pedro/Paulo)
- Status do cliente piloto FSJBE
- Links de passaporte público real (ex.: agraas.com.br/passaporte/XXX com dados reais)
- Números absolutos de receita, GMV, animais, fazendas

Quando ilustrar com números, **dizer "exemplo ilustrativo"** ou usar dados sintéticos óbvios.

## Regra 6 — Tom Terminal Industries

Curadoria editorial BR. Componentes de fundação (Hero, Sobre, Portos, CTA) chegando entre abril/maio 26. Estética:

- Paleta verde-logo dominante, fundos neutros
- Tipografia editorial (não sans-serif tech), espaços generosos
- Foto > ilustração; foto BR > stock internacional
- Quietude. Nada grita.

## Regra 7 — Foco atual: 100% pecuária bovina

**Decisão 17/05** (mentoria com Dra. Renata + César, IZ-SP): Agraas foca 100% pecuária bovina no caminho crítico. Cadeias adjacentes estão **pausadas** (não removidas):

- ⏸️ Ovinos/caprinos — pausado
- ⏸️ Aves — pausado
- ⏸️ Agricultura/grãos — pausado
- ⏸️ Portal PIF (comprador) — pausado

**Não criar copy nova** sobre essas frentes para o site público. O código continua no repo (módulos existem, migrations 042-105 cobrem ovinos/aves/agricultura/marketplace), mas é fora do caminho crítico atual.

### Frentes quentes (caminho crítico)

- **JBS** — CFO Alexandre, Mourão Filho. Conversas ativas.
- **IZ-SP** — Dra. Renata + César. Mentoria quinzenal, próxima 29/05.
- **GPB / Furlan** — em desenvolvimento.

Decisões de produto, copy, demos e roadmap **respondem a essas frentes**, não às cadeias pausadas.

---

## Como usar essas regras

Quando o usuário pedir mudança em landing, sobre, portos, copy, marketing, claim sobre cliente, ou abrir uma das páginas/componentes públicos:

1. Re-leia este SKILL antes de escrever
2. Se a mudança toca regra 1 (claims FSJBE) — pausa e pergunta
3. Se toca regra 5 (dados sensíveis) — pausa e pergunta
4. Se toca regra 7 (cadeias pausadas) — pausa e pergunta se é caminho crítico
5. Caso contrário, pode prosseguir aplicando regras 2-4-6 como guard rails de tom
