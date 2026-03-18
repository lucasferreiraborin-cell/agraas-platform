export type ScoreInput = {
  lastWeight: number | null;
  ageMonths: number | null;
  sanitaryScore: number;
  operationalScore: number;
  continuityScore: number;
};

export function calculateAgeInMonths(birthDate: string | null | undefined) {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const now = new Date();

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

export function calculateAgraasScore({
  lastWeight,
  ageMonths,
  sanitaryScore,
  operationalScore,
  continuityScore,
}: ScoreInput) {
  const productive =
    lastWeight && lastWeight > 0
      ? Math.min(100, 35 + Math.round(lastWeight / 10))
      : 35;

  const ageFactor =
    ageMonths !== null && ageMonths !== undefined
      ? Math.min(100, 40 + Math.round(ageMonths / 2))
      : 50;

  return Math.min(
    100,
    Math.round(
      productive * 0.3 +
        sanitaryScore * 0.24 +
        operationalScore * 0.18 +
        continuityScore * 0.18 +
        ageFactor * 0.1
    )
  );
}

export function calculateDailyGain(
  currentWeight: number | null,
  previousWeight: number | null,
  currentDate: string | null | undefined,
  previousDate: string | null | undefined
) {
  if (
    currentWeight === null ||
    previousWeight === null ||
    !currentDate ||
    !previousDate
  ) {
    return null;
  }

  const current = new Date(currentDate).getTime();
  const previous = new Date(previousDate).getTime();

  const diffDays = Math.round((current - previous) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return null;

  return Number(((currentWeight - previousWeight) / diffDays).toFixed(3));
}

export function getProductiveRiskLabel(
  delta: number | null,
  gmd: number | null
) {
  if (delta === null && gmd === null) return "Sem base";
  if (delta !== null && delta < 0) return "Risco";
  if (gmd !== null && gmd < 0.2) return "Atenção";
  if (gmd !== null && gmd >= 0.8) return "Destaque";
  return "Estável";
}

export function getRiskBadgeClass(label: string) {
  if (label === "Risco") {
    return "inline-flex rounded-full bg-[rgba(214,69,69,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)]";
  }

  if (label === "Atenção") {
    return "inline-flex rounded-full bg-[rgba(217,163,67,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)]";
  }

  if (label === "Destaque") {
    return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  }

  return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
}