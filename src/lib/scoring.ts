export const NON_MCQ_TYPES = [
  "ESSAY",
  "URAIAN_PENDEK",
  "TRUE_FALSE",
  "POLY_CHOICE",
  "MULTI_SELECT",
] as const;

export function resolveTypeWeights(raw: unknown): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of NON_MCQ_TYPES) m[t] = 1;
  if (raw && typeof raw === "object") {
    for (const t of NON_MCQ_TYPES) {
      const v = (raw as Record<string, unknown>)[t];
      if (v != null && Number(v) > 0) m[t] = Number(v);
    }
  }
  return m;
}

export function defaultTypeWeights(): Record<string, number> {
  return resolveTypeWeights({});
}
