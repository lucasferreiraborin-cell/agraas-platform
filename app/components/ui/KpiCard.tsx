import type { LucideIcon } from "lucide-react";

type Tone = "default" | "positive" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  default:  "text-[var(--text-primary)]",
  positive: "text-[#166534]",
  warning:  "text-[#D97706]",
  danger:   "text-[var(--danger)]",
};

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  tone = "default",
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
        <div
          className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            iconBg ?? "bg-[var(--primary-soft)]"
          }`}
        >
          <Icon size={17} className="text-[var(--primary)]" />
        </div>
      )}
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p
        className={`mt-2 truncate text-3xl font-bold leading-none tracking-[-0.04em] ${TONE[tone]}`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {sub}
        </p>
      )}
    </div>
  );
}
