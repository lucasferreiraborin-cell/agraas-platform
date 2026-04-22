# AGRAAS — Contexto do Site Público

Documento de contexto para iteração visual do site público (não-logado) da Agraas.

Escopo analisado:
- `app/page.tsx` (landing)
- `app/sobre/page.tsx`
- `app/cadastro/page.tsx`
- `app/planos/page.tsx`
- `app/marketplace/page.tsx` (versão pública, sem login)
- `app/components/PublicNav.tsx`
- `app/components/JourneySection.tsx`
- `app/components/CounterAnimation.tsx`
- `app/components/ScrollReveal.tsx`
- `app/components/MarketplaceCTAModal.tsx`
- `app/components/HalalBadgeSVG.tsx`

Fora do escopo: toda a plataforma logada (`/painel`, `/animais`, `/comprador`, etc.).

---

## 1. NAV E HEADER

### Componente
`app/components/PublicNav.tsx` — client component (`"use client"`). Presente em todas as páginas públicas.

### Estrutura
- Altura fixa: 72px (`h-[72px]`).
- `sticky top-0 z-50`.
- Fundo: `bg-[var(--sidebar-2)]/90 backdrop-blur-2xl` (verde escuro #294f1d com 90% opacidade + blur).
- Border bottom: `border-white/[.06]`.
- Container: `max-w-[1200px] px-6`.

### Itens do menu (desktop, ≥768px)
- Logo à esquerda: "Agraas" em text-[1.4rem], font-semibold, tracking -.05em, cor branca. Link para `/`.
- Links centrais: Marketplace (`/marketplace`), Planos (`/planos`), Sobre (`/sobre`). text-[.875rem], font-medium, text-white/50 com hover text-white.
- Ações à direita:
  - "Entrar" (`/login`): ghost button, `rounded-lg`, border-white/[.12], text-white/60.
  - "Criar conta" (`/cadastro`): bg-[#5d9c44] hardcoded, text-white, shadow verde pequena.

### Comportamento mobile (<768px)
- Logo + botão hamburger (lucide `Menu` / `X`).
- Menu dropdown com `animate-[fadeIn_.2s_ease]`.
- Links em coluna. CTAs em grid 2-col (Entrar + Criar conta lado a lado).

### Observações
- Altura divergente da plataforma logada (que usa 80px).
- Botão "Criar conta" usa cor hex hardcoded (`#5d9c44`) em vez de `var(--primary)`.
- Não há variante clara/transparente para overlays — é sempre verde escuro sólido.

---

## 2. LANDING PAGE — SEÇÕES EM ORDEM

Arquivo: `app/page.tsx`. Server Component. Fetch de `marketplace_listings` (6 ativos) via `createSupabaseServiceClient`. Container root: `min-h-screen bg-[var(--bg)]`.

### 2.1. HERO

**Copy real:**
- Pill: "Plataforma em operação" (com dot verde pulsante).
- Headline: "Do pasto brasileiro<br />à mesa do mundo."
- Subtexto: "Rastreabilidade individual, certificação Halal verificada e o marketplace que conecta quem produz a quem compra — com dados, não promessas."
- CTA primário: "Explorar Marketplace" → `/marketplace`.
- CTA secundário: "Acessar plataforma" → `/login`.

**Visual:**
- Foto de fundo Unsplash (Nelore em pasto aberto): `photo-1500595046743-cd271d694d30`.
- Overlay: `linear-gradient(to right, var(--sidebar-2) 0%, rgba(41,79,29,.75) 50%, rgba(41,79,29,.25) 100%)`.
- Fade para bg claro no rodapé da seção.
- Layout: container esquerdo com max-w-[640px], altura min 92vh.
- Tipografia hero: `ag-page-title` com override `!text-[clamp(2.6rem,6vw,4.6rem)]`, `!leading-[.94]`, cor branca.

**Stats inline (pé do hero):**
- 3 KPIs separados por border-top white/[.1]:
  - `CounterAnimation end={2300}` + label "cabeças rastreadas"
  - `CounterAnimation end={100} suffix="%"` + label "certificação Halal"
  - `CounterAnimation end={78}` + label "módulos ativos"

**Animações:**
- `CounterAnimation` conta de 0 até valor final com ease-out cubic, triggered por IntersectionObserver.

**Limitações:**
- Imagem Unsplash (banco).
- Valor "2.300 cabeças" é a realidade atual da FSJBE.
- Valor "78 módulos" é contagem real de páginas Next.js hoje.
- "100% certificação Halal" é percentual do lote ativo, não do rebanho total.

---

### 2.2. CAPABILITIES (split texto/foto)

**Copy:**
- Badge: "O que construímos"
- Headline: "Cada animal tem identidade.<br />Cada safra tem origem."
- Subtexto: "Passaporte digital individual, score em 5 dimensões, certificação Halal verificada e rastreabilidade completa — do nascimento ao embarque."
- 4 features (icon + título + descrição):
  1. **Passaporte Digital** — "ID único por animal com todo o histórico sanitário, produtivo e de conformidade."
  2. **Score Agraas** — "Algoritmo proprietário em 5 dimensões. O score precifica o animal no marketplace."
  3. **Grain ID** — "Rastreabilidade de soja, milho e trigo da fazenda ao navio em 7 etapas."
  4. **Marketplace** — "Compre e venda animais, safras e insumos com dados verificados e NF-e automática."

**Visual:**
- Layout: `grid max-w-[1200px] lg:grid-cols-2`. Fundo branco.
- Esquerda: texto + 4 features com hover em cards de linha (bg muda para `var(--surface-soft)`).
- Direita: foto Nelore close-up (Unsplash `photo-1570042225831-d98fa7577f1d`), hidden em mobile.
- Icons de feature: Lucide (FileText, BarChart2, Wheat, ShoppingBag), size 19, cor `--primary`, em container 44x44 `bg-[var(--primary-soft)] rounded-xl`.

**Animações:**
- `ScrollReveal` nas 4 features com delay progressivo `i * 70` ms.

---

### 2.3. IMPACT QUOTE (fullscreen)

**Copy:**
- HalalBadgeSVG 64px centralizado.
- Quote: "O Brasil exporta mais proteína Halal do que qualquer outro país do mundo. A Agraas é a infraestrutura que prova a origem — animal por animal, etapa por etapa."
- Metadados (separados por bullet): "Jandaia, Goiás · 2.300 cabeças · Lote Halal Q2 2026"

**Visual:**
- Foto de fundo: Unsplash `photo-1625246333195-78d9c38ad449` (pasto ao pôr do sol).
- Overlay: `linear-gradient(135deg, var(--sidebar) 0%, var(--sidebar-2) 100%)` com opacity .82.
- Centered, max-w-[880px], py-28 (mobile) / py-40 (lg).
- Tipografia: `text-[clamp(1.3rem,3vw,2.1rem)] font-medium leading-[1.4] tracking-[-.015em] text-white`.

**Animações:** `ScrollReveal` único.

**ATENÇÃO:** copy atual diz "Jandaia, Goiás" — precisa ser corrigido para "Jussara, Goiás" (ver seção 6).

---

### 2.4. JOURNEY (scrollytelling)

**Componente:** `<JourneySection />` — client component dedicado em `app/components/JourneySection.tsx`. Renderiza uma seção full-dark (`bg-[#071a0e]`) com grid pattern overlay.

**Copy e estrutura:**

**INTRO:**
- Label: "A jornada"
- Headline: "Do campo ao comprador<br />do outro lado do mundo."
- Subtexto: "Cada evento documentado. Cada certificação verificada. Um passaporte para cada animal e cada safra."

**01 — IDENTIDADE DIGITAL DESDE O PRIMEIRO DIA**
- Texto esquerdo: "Bovino, ovino, caprino ou ave — cada animal recebe um ID Agraas único no nascimento. Soja, milho ou cana — cada talhão é georeferenciado com CAR verificado."
- Chips: "RFID bolus", "Tag auricular", "GPS talhão", "QR passaporte".
- Card direito: grid 2×2 com 4 stats (4 espécies · 5 culturas · 7 etapas · 1 passaporte).

**02 — CADA EVENTO VIRA DADO VERIFICÁVEL**
- Card esquerdo: timeline vertical com 6 eventos (Nascimento / Pesagem / Vacinação / Vermifugação / Transferência / Score final). Cada item tem título + subtexto técnico.
- Texto direito: "Pesagem, vacinação, transferência, certificação — tudo registrado com data, operador e lote. O Score Agraas recalcula automaticamente a cada evento." + "O algoritmo avalia 5 dimensões: produtiva, sanitária, operacional, continuidade e rastreabilidade. O resultado é um número de 0 a 100 que acompanha o animal por toda a vida."

**03 — O SCORE QUE ABRE MERCADOS**
- Headline centralizado: "O score que abre mercados."
- 4 score rings animados (SVG stroke-dashoffset): Bovino 78 (Halal), Ovino 70 (MAPA), Soja 87 (EUDR), Cana 60 (SIF).
- Chips: "Halal certificado", "SIF aprovado", "EU Deforestation", "MAPA verificado".

**04 — SANTOS → O MUNDO**
- Headline: "Santos →" em branco + "o mundo." em `#5d9c44`.
- Card direito: lista de 5 destinos ativos (Jeddah / Rotterdam / Dubai / Doha / Kuwait) com dot verde glow.
- Badge "HALAL ✓" + texto "Certificação verificada em cada etapa".

**Animações:**
- `R` component (wrapper interno): fade + translate3d 60px com curvas cubic-bezier exatas (.39,.575,.565,1 para opacity / .19,1,.22,1 para transform).
- Score rings: `stroke-dashoffset` animado no scroll com 1.6s de duração.
- Timeline dots: slide-in horizontal com stagger.

**Limitações:**
- Números dos scores (78, 70, 87, 60) são ilustrativos/simbólicos, não conectados ao banco.
- Destinos listados são aspiracionais — apenas Arábia Saudita está ativa hoje.
- Grid pattern overlay é puro CSS (linear-gradient).

---

### 2.5. CAMPO → MUNDO (3 cards de rota)

**Copy:**
- Badge: "Origem e destino"
- Headline: "Da fazenda em Goiás ao comprador em Jeddah."
- 3 cards:
  1. **Origem** — Jandaia, Goiás — "Fazenda São João da Boa Esperança" — "2.300 cabeças Nelore com passaporte digital, certificação MAPA e GTA ativas."
  2. **Embarque** — Porto de Santos, SP — "7 checkpoints de rastreio" — "Fazenda → concentração → transporte → porto → navio → destino → entrega."
  3. **Destino** — Jeddah, Arábia Saudita — "Conformidade Halal verificável" — "O comprador acessa o passaporte por QR e verifica origem, score e cada certificação."

**Visual:**
- Fundo: `bg-[var(--bg)]`.
- Cards: `ag-card` com imagem de 52 de altura no topo.
- Imagens:
  - Origem: foto pasto Unsplash (`photo-1625246333195`).
  - Embarque: foto porto cargueiro (`photo-1494412574643-ff11b0a5eb19`).
  - Destino: **sem foto** — placeholder com gradient sidebar + HalalBadgeSVG 80px centralizado.
- Hover: imagem faz `scale-105` com transition 500ms.
- Badge no canto inferior esquerdo de cada imagem: `ag-badge ag-badge-green`.

**Route line (pill abaixo dos cards):**
- Pill branco com border `var(--border)`, max-w-[550px].
- Sequência visual: dot verde glow · "Goiás" · linha gradient · "Santos" · linha gradient · "Jeddah" · dot verde glow.

**Animações:** `ScrollReveal` nos 3 cards com delay `i * 100` ms. Route line com delay 350 ms.

**Limitações:**
- Card "Origem" usa foto Unsplash genérica, não foto real da FSJBE.
- "Jandaia" precisa virar "Jussara".

---

### 2.6. AGRICULTURA (split foto/texto invertido)

**Copy:**
- Badge: "Agricultura"
- Headline: "Soja, milho, trigo, cana e café — rastreados do talhão ao navio."
- Subtexto: "Cada talhão georeferenciado com CAR verificado. Cada embarque com BL, certificado fitossanitário e laudo de qualidade."
- Chips: "Grain ID", "Laudo de qualidade", "BL verificado", "CAR ativo", "EUDR ready".
- CTA: "Rastrear minha produção →" → `/cadastro`.

**Visual:**
- Fundo branco. Foto à esquerda (plantação de soja Unsplash `photo-1574323347407-f5e1ad6d020b`). Texto à direita.
- Foto hidden em mobile (desktop-only).

---

### 2.7. MARKETPLACE PREVIEW

**Copy:**
- Badge: "Marketplace"
- Headline: "Anúncios ativos agora."
- Link "Ver todos →" → `/marketplace`.

**Visual:**
- Fundo `bg-[var(--bg)]`.
- Grid de 6 cards de listings reais do banco (busca Supabase em build-time).
- Cada card (`ag-card`): tipo badge + score/Halal badge no topo, título line-clamp-2, preço em destaque `--primary`, cidade/UF no rodapé.
- Hover: `-translate-y-1`.

**Animações:** `ScrollReveal` nos cards com delay `i * 60` ms.

**Limitações:**
- Se não houver listings ativos, a seção inteira não renderiza (`mkItems.length > 0 &&`).
- Hoje há 4-6 listings demo (3 FSJBE + 1 Lucas grain).

---

### 2.8. SOCIAL PROOF (card FSJBE)

**Copy:**
- Badge: "Cliente ativo"
- Headline: "Fazenda São João da Boa Esperança"
- Localização: "Jandaia, Goiás" (ATENÇÃO: precisa ser Jussara)
- Subtexto: "Primeira fazenda com Passaporte Agraas ativo e lote de exportação certificado Halal confirmado para a Arábia Saudita — segundo trimestre de 2026."
- Chips: "MAPA ✓", "GTA ✓", "Halal ✓", "Nelore PO".
- 4 KPIs no painel direito (com ícones Lucide):
  - 2.300 · cabeças (Shield)
  - Nelore · raça (CheckCircle)
  - Q2 2026 · embarque (Ship)
  - Score 78 · média (BarChart2)

**Visual:**
- Fundo branco.
- Card único `ag-card-strong` dividido em 2 colunas (1.1fr / 0.9fr).
- Painel direito usa `ag-hero-panel` (gradient claro) com 4 mini-KPIs em grid.

---

### 2.9. CTA FINAL

**Copy:**
- Headline: "Faça parte do ecossistema."
- Subtexto: "Fazendeiro, comprador, fornecedor ou parceiro — a infraestrutura do agronegócio brasileiro está aqui."
- CTA primário: "Criar conta gratuitamente" → `/cadastro`.
- CTA secundário: "Fale com a gente" (mailto:contato@agraas.com.br).

**Visual:**
- Foto aérea Unsplash (`photo-1500382017468-9049fed747ef`).
- Overlay: gradient sidebar → sidebar-2 com opacity .85.
- Centered, py-28/40.

---

### 2.10. FOOTER

**Visual:**
- Fundo: `linear-gradient(180deg, var(--sidebar) 0%, var(--sidebar-2) 100%)`.
- Grid 4 colunas em sm+:
  - Coluna 1: Logo "Agraas" + tagline "Infraestrutura digital do agronegócio brasileiro."
  - Coluna 2 (Plataforma): Marketplace / Planos / Login.
  - Coluna 3 (Empresa): Sobre / Contato (mailto).
  - Coluna 4 (Legal): Privacidade / Termos (texto estático, sem link).
- Linha inferior: "© 2026 Agraas Agritech. Todos os direitos reservados."

---

## 3. COMPONENTES PÚBLICOS PRINCIPAIS

### PublicNav
- **Path:** `app/components/PublicNav.tsx`
- **Props:** nenhuma.
- **Uso:** todas as páginas públicas (landing, sobre, cadastro, planos, marketplace quando sem login).
- **Estado interno:** `open` (boolean) para menu mobile.

### ScrollReveal
- **Path:** `app/components/ScrollReveal.tsx`
- **Props:** `children`, `delay` (number ms, default 0), `className` (string).
- **Uso:** landing (dezenas de ocorrências), sobre.
- **Mecânica:** IntersectionObserver threshold 0.15, adiciona classe `.sr-visible` com `setTimeout(delay)`. Classes `sr-hidden`/`sr-visible` definidas em `globals.css`.

### CounterAnimation
- **Path:** `app/components/CounterAnimation.tsx`
- **Props:** `end` (number), `suffix` (string, default ""), `prefix` (string, default ""), `duration` (ms, default 2000).
- **Uso:** landing hero (3 KPIs).
- **Mecânica:** IntersectionObserver threshold 0.3 + requestAnimationFrame com ease-out cubic (`1 - Math.pow(1 - progress, 3)`). Usa `toLocaleString("pt-BR")` para formatação.

### JourneySection
- **Path:** `app/components/JourneySection.tsx`
- **Props:** nenhuma.
- **Uso:** landing (entre Impact Quote e Campo → Mundo).
- **Sub-componentes internos:** `R` (reveal wrapper), `ScoreRing` (SVG animado), `Dot` (timeline dot), `useInView` (hook).

### HalalBadgeSVG
- **Path:** `app/components/HalalBadgeSVG.tsx`
- **Props:** `size` (number, default 48).
- **Uso:** landing (hero overlay, impact quote, destino card, social proof), marketplace cards, passaporte.
- **Visual:** selo circular com escrita árabe "حلال" + "HALAL CERTIFIED 100%" em sans-serif. Cor principal `#1a6b3c`.

### MarketplaceTabs
- **Path:** `app/components/marketplace/MarketplaceTabs.tsx`
- **Props:** `listings`, `myListings`, `myOffers`, `myTransactions`, `currentClientId`.
- **Uso:** `/marketplace` (público e logado usam o mesmo).
- **Tipos exportados:** `Listing`, `Offer`, `Transaction`, `MarketplaceProps`.

### MarketplaceCTAModal
- **Path:** `app/components/MarketplaceCTAModal.tsx`
- **Props:** `action` (string descritiva), `onClose` (callback).
- **Uso:** Marketplace quando visitante tenta fazer oferta/publicar sem estar logado.
- **Conteúdo:** título, CTA "Criar conta gratuita" → `/cadastro`, link "Já tenho conta — Entrar" → `/login`.

### Link (Next.js)
- Usado em TODAS as páginas. `href` aponta para rotas públicas (`/`, `/marketplace`, `/sobre`, `/planos`, `/cadastro`, `/login`) ou externas via `<a href="mailto:...">`.

### Lucide icons usados no público
- **PublicNav:** Menu, X.
- **Landing:** FileText, BarChart2, Wheat, ShoppingBag, MapPin, ArrowRight, Anchor, Ship, ChevronRight, Shield, CheckCircle.
- **Sobre:** Shield, Zap, Globe.
- **Cadastro:** Tractor, Factory, Globe, Package, Handshake, Eye.
- **Planos:** Check, Star, Zap, Crown, Leaf.
- **Marketplace:** ShoppingBag, Search, Filter, Package, Tag, Truck, Plus, MessageSquare, Clock, CheckCircle.

---

## 4. COPY OFICIAL APROVADA

Frases/slogans que funcionam e devem ser preservados em qualquer redesign visual:

**Tagline principal (hero landing):**
- "Do pasto brasileiro à mesa do mundo."

**Subtagline (hero):**
- "Rastreabilidade individual, certificação Halal verificada e o marketplace que conecta quem produz a quem compra — com dados, não promessas."

**Impact quote (seção fullscreen):**
- "O Brasil exporta mais proteína Halal do que qualquer outro país do mundo. A Agraas é a infraestrutura que prova a origem — animal por animal, etapa por etapa."

**Missão (/sobre):**
- "Ser a infraestrutura digital do agronegócio brasileiro — da fazenda a mesa, do Brasil ao mundo."

**Journey intro:**
- "Do campo ao comprador do outro lado do mundo."
- "Cada evento documentado. Cada certificação verificada. Um passaporte para cada animal e cada safra."

**Journey 03 headline:**
- "O score que abre mercados."

**CTA final landing:**
- Headline: "Faça parte do ecossistema."
- Subtexto: "Fazendeiro, comprador, fornecedor ou parceiro — a infraestrutura do agronegócio brasileiro está aqui."

**Footer tagline:**
- "Infraestrutura digital do agronegócio brasileiro."

**Capabilities (featurettes):**
- "Cada animal tem identidade.<br />Cada safra tem origem."
- "Passaporte digital individual, score em 5 dimensões, certificação Halal verificada e rastreabilidade completa — do nascimento ao embarque."

**Nomes proprietários (nunca traduzir):**
- "Passaporte Agraas"
- "Score Agraas"
- "Grain ID"
- "Marketplace Agro" / "Agraas Marketplace"

**Stats canônicos:**
- "2.300 cabeças" (rebanho FSJBE hoje)
- "Score 78 · média" (média atual do lote Halal)
- "Q2 2026" (embarque confirmado)
- "Nelore PO" (raça)

**Chips de credibilidade (badges técnicos):**
- "MAPA ✓", "GTA ✓", "Halal ✓"
- "Grain ID", "Laudo de qualidade", "BL verificado", "CAR ativo", "EUDR ready"
- "RFID bolus", "Tag auricular", "GPS talhão", "QR passaporte"

---

## 5. GAPS VISUAIS AUTOCRÍTICOS

Problemas conhecidos hoje no site público que devem ser resolvidos no redesign:

### 5.1. Imagens de banco (Unsplash)
Todas as imagens do site público são Unsplash genéricas, **nenhuma é foto real da FSJBE**:

```
hero     https://images.unsplash.com/photo-1500595046743-cd271d694d30   Nelore em pasto
nelore   https://images.unsplash.com/photo-1570042225831-d98fa7577f1d   Close-up boi
pasto    https://images.unsplash.com/photo-1625246333195-78d9c38ad449   Pasto ao pôr do sol
soja     https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b   Plantação de soja
porto    https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19   Navio cargueiro
aereo    https://images.unsplash.com/photo-1500382017468-9049fed747ef   Vista aérea de campo
```

Todas vêm com query string `?w=XXX&q=80-85&auto=format`.

### 5.2. Referências geográficas incorretas
Várias menções a **"Jandaia, Goiás"** no código quando a localização correta da FSJBE é **"Jussara, Goiás"**. Ocorrências:
- `app/page.tsx` impact quote (linha ~133).
- `app/page.tsx` card Origem do Campo → Mundo (linha ~158).
- `app/page.tsx` social proof (linha ~281).
- `app/sobre/page.tsx` seção "A empresa" (linha ~61).

### 5.3. Contadores e números simbólicos
Os valores exibidos no hero (2.300, 100%, 78) e nos score rings do Journey (78, 70, 87, 60) são **corretos hoje** mas precisam deixar claro qual é dinâmico vs estático:
- Hero stats: hardcoded nos arrays, não vêm do banco.
- Score rings Journey: ilustrativos, sempre os mesmos 4 números.
- Social proof FSJBE: 2.300/Nelore/Q2 2026/Score 78 são reais mas hardcoded.

### 5.4. Inconsistências tipográficas no público
Arquivos do site público usam valores inline que divergem do design system oficial:

- `app/sobre/page.tsx` usa `font-extrabold tracking-[-0.04em]` e `font-bold` em vez de `ag-page-title` (que é `font-weight: 600`).
- Landing usa `text-[13px]`, `text-[15px]`, `text-[1.0625rem]`, `text-[.875rem]`, `text-[.9375rem]` — escala arbitrária em vez de tokens do sistema.
- `app/cadastro/page.tsx` usa `rounded-xl` (12px) em inputs e botões quando a plataforma usa 18px em `ag-input/ag-select` e `ag-button-primary/secondary`.
- Cores hardcoded: `bg-[#5d9c44]` no PublicNav, `bg-[linear-gradient(180deg,#3d762c_0%,#294f1d_100%)]` na sidebar verde do cadastro, em vez de `var(--primary)` e `var(--sidebar)/var(--sidebar-2)`.

### 5.5. Acentuação faltando em strings
`app/sobre/page.tsx` e `app/cadastro/page.tsx` têm vários textos sem acento (ex: "pais do mundo" em vez de "país do mundo", "nao e tecnica" em vez de "não é técnica", "Goias" em vez de "Goiás"). É inconsistente com `app/page.tsx` que tem acentuação correta. Provável erro de encoding em edição anterior.

### 5.6. Footer duplicado e inconsistente
- `app/page.tsx` tem footer em gradient sidebar → sidebar-2 com 4 colunas.
- `app/sobre/page.tsx` tem footer próprio em `bg-[#111827]` (cinza escuro) com layout de 1 linha.
São dois padrões diferentes para a mesma função.

### 5.7. Seções estáticas sem animação
- Cadastro é 100% estático, sem ScrollReveal ou transições de step (mudança seca entre Passo 1 e Passo 2).
- Planos não foi inspecionado completo, mas provavelmente estático.
- Marketplace público tem KPI cards zerados ("Meus anúncios: 0", "Ofertas: 0", "Transações: 0") para visitante — hierarquia ruim porque visitante não pode ter esses valores.

### 5.8. Badge "Criar conta" inconsistente
- PublicNav: `bg-[#5d9c44]` hardcoded, `rounded-lg`, shadow pequena.
- Landing CTA hero: `ag-button-primary` com override `!rounded-xl`.
- Landing CTA final: `ag-button-primary` com override `!rounded-xl !px-8 !py-4`.
- Cadastro botão: `rounded-xl bg-[var(--primary)] py-4`.
- Sobre CTA: `rounded-2xl bg-[var(--primary)] px-8 py-3.5`.

Todos deveriam ser o mesmo componente-token, mas hoje cada página faz sua variação inline.

### 5.9. Mistura de fundos claros e escuros sem ritmo
Ordem visual atual da landing: dark (hero) → light (capabilities) → dark (impact) → dark (journey) → light (campo→mundo) → light (agricultura) → light (marketplace) → light (social proof) → dark (CTA) → dark (footer).

Sequência de 3 seções dark consecutivas (impact + journey + nada) pode ser visualmente pesada. Ritmo não está resolvido.

---

## 6. O QUE NÃO MUDAR

Elementos que funcionam hoje e devem ser preservados em qualquer iteração:

### 6.1. Tagline principal
**"Do pasto brasileiro à mesa do mundo."** — é a promessa central. Pode ser reescrita em variações, mas essa combinação de "pasto" + "mesa" + "Brasil → mundo" é o core da narrativa.

### 6.2. Localização oficial
**Jussara, Goiás** (NÃO Jandaia) é a cidade correta da Fazenda São João da Boa Esperança. Qualquer menção à origem da FSJBE deve usar Jussara. Isso precisa ser corrigido no código atual.

### 6.3. Selo Halal em árabe
O SVG com a escrita "حلال" + "HALAL CERTIFIED 100%" (`HalalBadgeSVG.tsx`) é identitário. Aparece em hero, impact, cards, marketplace, passaporte. Não trocar por ícone Lucide ou outro selo.

### 6.4. Score Agraas como elemento proprietário
Score Agraas é nomeado assim, sempre com "Agraas" junto. O algoritmo em 5 dimensões (produtiva / sanitária / operacional / continuidade / rastreabilidade) é a propriedade intelectual mais citada no pitch. O número aparece visualmente como ring SVG animado ou badge verde.

### 6.5. Rota Jussara → Santos → Jeddah
A narrativa visual de 3 pontos (origem no Brasil → Porto de Santos como ponte → destino no Oriente Médio) é o que diferencia Agraas de qualquer ERP agro. Preserve a sequência mesmo que os visuais mudem.

### 6.6. Nome dos produtos
- **Passaporte Digital** (ou **Passaporte Agraas**)
- **Score Agraas**
- **Grain ID**
- **Agraas Marketplace** / **Marketplace Agro**

### 6.7. Tom de voz
- Direto, sem jargão de startup.
- Afirmativo ("cada animal tem identidade"), não condicional ("pode vir a ter").
- Números em vez de superlativos ("2.300 cabeças", não "milhares").
- Credibilidade via verificação ("rastreabilidade individual, certificação Halal verificada — com dados, não promessas").
- Evita: "revolucionário", "inovador", "disruptivo", "ecossistema único", "solução completa".

### 6.8. Chips técnicos como prova
Chips como "MAPA ✓", "GTA ✓", "CAR ativo", "EUDR ready", "RFID bolus", "QR passaporte" são prova de substância técnica para o investidor. Nunca reduzir a chips genéricos tipo "Rastreável" ou "Certificado".

### 6.9. Paleta verde da plataforma
- Verde primário: `#5d9c44` (`--primary`)
- Verde sidebar gradient: `#3d762c → #294f1d` (`--sidebar` → `--sidebar-2`)
- Verde suave: `#e8f4e2` (`--primary-soft`)

Qualquer seção escura usa o gradient sidebar. Qualquer accent usa `--primary`. Nunca cores arbitrárias como `emerald-500` ou `green-600`.

### 6.10. Ritmo foto + dado
O padrão que funciona: foto real de agro + dado técnico numérico lado a lado. Não cair em ilustrações cartoon nem em gráficos abstratos sem contexto.

---

## 7. REFERÊNCIA DE DNA

**O site público da Agraas é a prova visual de que o agronegócio brasileiro tem infraestrutura digital à altura da sua escala global — cada pixel serve para transformar o "maior exportador do mundo" em "fornecedor verificável animal por animal, do pasto de Jussara ao porto de Jeddah."**

Se uma iteração visual não consegue comunicar isso em 10 segundos de scroll, ela não é Agraas.

---

Fim do documento.
