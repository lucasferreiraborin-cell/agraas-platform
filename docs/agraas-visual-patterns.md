# Padrões Visuais Propostos — Plataforma Agraas

> Baseado em [agraas-visual-audit.md](agraas-visual-audit.md).
> Cada padrão proposto = decisão única + razão. Não negociar caso a caso.

---

## Filosofia

1. **Um padrão único por elemento.** Múltiplas variantes do mesmo conceito = inconsistência.
2. **Componente compartilhado em `app/components/ui/`** quando o padrão é JSX. Class em `globals.css` quando o padrão é puro CSS.
3. **Padrão escolhido = o que já é majoritário na plataforma**, salvo motivo forte. Reduz refactor.
4. **Tudo left-aligned por default** em cards/listas. Numéricos `text-right` em tabelas (alinhamento de magnitude). Status `text-center`.

---

## 2.1 — Padrão único pra KpiCard

### Decisão

Criar `app/components/ui/KpiCard.tsx` único. Substitui as 12 variantes locais.

```tsx
// app/components/ui/KpiCard.tsx
import type { LucideIcon } from "lucide-react";

type Tone = "default" | "positive" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  default:  "text-[var(--text-primary)]",
  positive: "text-[#166534]",
  warning:  "text-[#D97706]",
  danger:   "text-[var(--danger)]",
};

export function KpiCard({
  label, value, sub, icon: Icon, iconBg, tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  iconBg?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      {Icon && (
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBg ?? "bg-[var(--primary-soft)]"}`}>
          <Icon size={17} className="text-[var(--primary)]" />
        </div>
      )}
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-[-0.04em] leading-none truncate ${TONE[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{sub}</p>}
    </div>
  );
}
```

### Especificação

| Atributo | Valor | Razão |
|---|---|---|
| Background | `bg-white` | Maior contraste, padrão moderno (escolhido no polish 18/05) |
| Border | `border border-[var(--border)]` | Definição sutil |
| Radius | `rounded-2xl` (16px) | Mais moderno que 24/28px legacy. Menor que `ag-card-strong` (32px hero) |
| Shadow | `shadow-sm` | Profundidade discreta — não compete com hero |
| Padding | `p-6` (1.5rem) | Generoso. Anteriores p-5 era apertado |
| Label | `text-sm text-muted` | 0.875rem |
| Value | `text-3xl font-bold tracking-[-0.04em]` | 1.875rem · weight 700 · negative tracking |
| Sub | `text-sm leading-6 text-secondary` | 0.875rem · line-height 1.5rem |
| Alinhamento | **Left-aligned sempre** | Lê melhor em grids. Centered confunde quando label/value têm tamanhos diferentes |
| Truncate | `truncate` no value | Garante que números longos (R$ 1.234.567,89) não quebram layout |
| Icon opcional | 9×9, rounded-xl, bg suave | Quando label + Icon ajudam |
| Tone | 4 variantes | default / positive / warning / danger — substitui `valueClass` |

### Comportamento com número longo

- `truncate` corta com ellipsis (não quebra linha)
- Caso real: `R$ 1.234.567,89` → cabe em 6 ≈ 240px
- Casos extremos (>11 dígitos): formatar com `Intl.NumberFormat("pt-BR", { notation: "compact" })` → `R$ 1,2M`

### Limpeza globals.css

- **DELETAR** `.ag-kpi-value` standalone (linhas 314-319) — só sobra `.ag-kpi-card .ag-kpi-value`
- OU **DELETAR** `.ag-kpi-card` inteiro e classes filhas (372-399) — força uso do componente novo
- Recomendação: **deletar `.ag-kpi-card` e família**, manter `.ag-kpi-value` standalone apenas pra casos legados

---

## 2.2 — Padrão único pra Tabelas

### Decisão

Manter `.ag-table` como class (já existe em globals.css). Padronizar conteúdo:

```tsx
<div className="overflow-x-auto">
  <table className="ag-table w-full">
    <thead>
      <tr>
        <th className="text-left">Animal</th>
        <th className="text-left">Fazenda</th>
        <th className="text-right">Peso</th>        {/* numérico */}
        <th className="text-center">Status</th>     {/* enum/badge */}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="font-semibold">BER-001</td>
        <td className="max-w-[180px] truncate">{prop.name}</td>
        <td className="text-right tabular-nums">{`${w} kg`}</td>
        <td className="text-center"><span className="ag-badge ag-badge-green">{status}</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

### Especificação

| Coluna tipo | Alinhamento | Atributos extras |
|---|---|---|
| Texto curto (nome, código) | `text-left` | `font-semibold` na primeira coluna |
| Texto longo (descrição, propriedade) | `text-left` | `max-w-[Xpx] truncate` obrigatório |
| Numérico (peso, valor, count) | `text-right` | `tabular-nums` pra alinhamento de magnitude |
| Data | `text-left` | `font-mono` opcional pra precisão |
| Status/badge/enum | `text-center` | `<span class="ag-badge ag-badge-*">` |
| Ações | `text-right` | Botão ou Link compacto |

### Regras invioláveis

1. **Wrapper `overflow-x-auto`** SEMPRE (mobile)
2. **Numéricos `tabular-nums`** — 0/1 width consistente
3. **Truncate em coluna de texto longo** com `max-w-[Xpx]`
4. **Header `text-left`** (default) — só explicitar quando diferente

---

## 2.3 — Padrão único pra Hero/Header

### Decisão

**Um único componente `<PageHeader>`** com 2 layouts: simples ou com painel direito.

```tsx
// app/components/ui/PageHeader.tsx
export function PageHeader({
  badge, title, description, actions, panel,
}: {
  badge?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  panel?: React.ReactNode; // KPI grid ou imagem
}) {
  if (panel) {
    return (
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="p-7 lg:p-9">
            <HeaderContent badge={badge} title={title} description={description} actions={actions} />
          </div>
          <div className="ag-hero-panel">{panel}</div>
        </div>
      </section>
    );
  }
  return (
    <section className="ag-card-strong p-7 lg:p-9">
      <HeaderContent badge={badge} title={title} description={description} actions={actions} />
    </section>
  );
}
```

### Especificação

| Elemento | Valor |
|---|---|
| Wrapper | `ag-card-strong` (32px radius, shadow-strong) |
| Padding | `p-7 lg:p-9` (1.75rem / 2.25rem) — entre p-6 e p-10 atuais |
| Badge | `ag-badge ag-badge-green` — opcional |
| Title h1 | `text-3xl font-semibold tracking-[-0.04em]` (1.875rem) — **fixo, sem variante** |
| Description | `text-sm leading-6 text-secondary max-w-2xl` |
| Actions | botões `ag-button-primary` / `ag-button-secondary` |
| Painel direito (opcional) | grid 2×2 de KpiCard |
| Proporção grid | **fixo `1.08fr 0.92fr`** — sem outras |

### Decisão sobre `ag-page-title`

- Class `ag-page-title` em globals.css (2.25rem / 3rem lg) é **MAIS GRANDE** que o que o PageHeader propõe (1.875rem)
- **Deletar `.ag-page-title`** — força uso do PageHeader que tem tamanho consistente
- Migração: substituir `<h1 className="ag-page-title">` por `<PageHeader title={...} />` em todas as páginas

---

## 2.4 — Padrão único pra Empty States

### Decisão

Criar `<EmptyState>` em `app/components/ui/EmptyState.tsx` usando class `.ag-empty-state` existente:

```tsx
// app/components/ui/EmptyState.tsx
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon, title, text, action,
}: {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ag-empty-state">
      {Icon && (
        <div className="ag-empty-state-icon">
          <Icon size={20} />
        </div>
      )}
      <p className="ag-empty-state-title">{title}</p>
      {text && <p className="ag-empty-state-text">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

### Quando usar

- **Lista vazia** após carregar dados (não mostrar enquanto carrega)
- **Filtro sem resultado** (texto + CTA "Limpar filtros")
- **Permissão negada** (raro — mais comum redirect)

### Quando NÃO usar

- **Loading state** → usar `<Skeleton>` (2.5 abaixo)
- **Erro de rede** → componente de erro com retry CTA

### Substitui

- Funções locais `function EmptyState({ label })` em 8+ arquivos
- Blocos inline `<div className="flex min-h-[80px]...">` em outros

---

## 2.5 — Padrão único pra Loading / Skeleton

### Decisão

Criar `<Skeleton>` em `app/components/ui/Skeleton.tsx` usando class `.ag-skeleton` existente:

```tsx
// app/components/ui/Skeleton.tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`ag-skeleton ${className}`} aria-hidden="true" />;
}

// Variantes pré-feitas
export function SkeletonKpiCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-40" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  );
}
```

### Quando aparece

- **Imediatamente** quando a página renderiza com `loading.tsx` ou Suspense
- **Permanece até o dado chegar** (mesmo que sejam ms)
- **Não usar spinner** em geral — skeleton dá sensação de progressão

### Substitui

- Ausência total de loading state em ~95% das páginas (carregam e mostram tela vazia até dado chegar)

---

## Outros padrões (decisões rápidas)

### Cores semânticas — usar TOKENS, nunca hex/Tailwind direto

| Intenção | Token | Não usar |
|---|---|---|
| Sucesso / positivo | `var(--primary)` ou `var(--success)` | `text-green-*`, `text-emerald-*` (exceto sidebar accent) |
| Atenção / amarelo | `var(--warning)` | `text-amber-*`, `text-yellow-*`, hex `#D97706` |
| Erro / negativo | `var(--danger)` | `text-red-*`, `text-rose-*` |
| Info / azul | `var(--info)` | `text-blue-*` |

**Exceção**: dentro de `ag-table` ou `ag-badge`, usar token + tinta soft (`text-emerald-700 bg-emerald-50 border-emerald-200` é OK pra badge).

### Border-radius — 4 valores apenas

| Contexto | Radius |
|---|---|
| Botão / pill / badge | `rounded-full` |
| Input / textarea | `rounded-xl` (12px) |
| Card padrão | `rounded-2xl` (16px) |
| Hero / card-strong | `rounded-3xl` (24px) ou class `ag-card-strong` (32px) |

**Não usar**: outros valores (`rounded-[Xpx]`, etc.)

### Hover states — 1 padrão por tipo de elemento

| Elemento | Hover |
|---|---|
| Link em texto | `hover:underline` |
| Botão primário | mudança de cor + `translateY(-1px)` (já em class) |
| Card clicável | `hover:shadow-lg hover:-translate-y-0.5` |
| Row de tabela | `hover:bg-[var(--primary-soft)]` |

---

## Plano de execução

| Fase | Trabalho | Tempo |
|---|---|---|
| 1 | Criar 4 componentes UI: `<KpiCard>`, `<PageHeader>`, `<EmptyState>`, `<Skeleton>` | 1h |
| 2 | Limpar globals.css: deletar `.ag-kpi-value` standalone duplicado, deletar `.ag-page-title`, deletar `.ag-kpi-card` família (se for migrar 100%) | 30min |
| 3 | Refatorar 12 páginas que têm KpiCard local → usar componente novo | 4h |
| 4 | Refatorar heros (8-10 páginas) → usar PageHeader | 2h |
| 5 | Substituir EmptyStates locais → usar componente novo | 1h |
| 6 | Adicionar Skeleton em listas críticas (animais, lotes, painel) | 1h |
| 7 | Padronizar cores semânticas (grep + replace de `text-green-*` etc.) | 1h |
| 8 | Audit em browser real (Playwright + screenshot 375/768/1440) | 2h |
| **Total** | | **~12-13h** |

Fasamento sugerido:
- **PR 1** (3-4h): Fase 1+2+3 — KpiCard unificado + cleanup CSS + refactor das 12 páginas
- **PR 2** (3-4h): Fase 4+5+6 — PageHeader + EmptyState + Skeleton
- **PR 3** (3h): Fase 7+8 — cores + audit browser

Cada PR independente, mergeável separado.
