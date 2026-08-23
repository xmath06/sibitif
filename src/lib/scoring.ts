import type { QuestionType } from '$api/types';

// Tipe soal selain MCQ: skornya tetap 1 × pengali paket (bukan bobot per-opsi).
export const NON_MCQ_TYPES: QuestionType[] = [
  'ESSAY',
  'URAIAN_PENDEK',
  'TRUE_FALSE',
  'POLY_CHOICE',
  'MULTI_SELECT',
];

// Bobot pengali per tipe dari paket; default 1 untuk tiap tipe non-MCQ.
// MCQ TIDAK masuk (skor murni dari score_weight opsi).
export function resolveTypeWeights(raw: unknown): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of NON_MCQ_TYPES) m[t] = 1;
  if (raw && typeof raw === 'object') {
    for (const t of NON_MCQ_TYPES) {
      const v = (raw as Record<string, unknown>)[t];
      if (v != null && Number(v) > 0) m[t] = Number(v);
    }
  }
  return m;
}

export function defaultTypeWeights(): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of NON_MCQ_TYPES) m[t] = 1;
  return m;
}
