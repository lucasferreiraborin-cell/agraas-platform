export type PassportRow = {
  animal_id: string
  internal_code: string | null
  total_score: number | null
  current_property_name: string | null
  active_certifications: string[] | null
}

export function buildAnalytics(rows: PassportRow[]) {
  const totalAnimals = rows.length

  const avgScore =
    rows.reduce((sum, r) => sum + (r.total_score ?? 0), 0) /
    (rows.length || 1)

  const certified = rows.filter(
    (r) => r.active_certifications && r.active_certifications.length > 0
  ).length

  const properties = new Set(
    rows.map((r) => r.current_property_name).filter(Boolean)
  ).size

  const topAnimals = [...rows]
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
    .slice(0, 5)

  const riskAnimals = rows.filter((r) => (r.total_score ?? 0) < 60)

  return {
    totalAnimals,
    avgScore: Math.round(avgScore),
    certified,
    properties,
    topAnimals,
    riskAnimals,
  }
}