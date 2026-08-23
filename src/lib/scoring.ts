// Tipe soal yang punya pengali skor di level paket.
// POLY_CHOICE (Pilihan Ganda Berbobot) berbobot per opsi, MULTI_SELECT skor tetap 1
// (keduanya TANPA pengali).
export const PENGALI_TYPES = [
  "ESSAY",
  "URAIAN_PENDEK",
  "TRUE_FALSE",
  "MCQ",
] as const;

export function resolveTypeWeights(raw: unknown): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of PENGALI_TYPES) m[t] = 1;
  if (raw && typeof raw === "object") {
    for (const t of PENGALI_TYPES) {
      const v = (raw as Record<string, unknown>)[t];
      if (v != null && Number(v) > 0) {
        // hanya simpan yg > 0; tipe lain default 1
        m[t] = Number(v);
      }
    }
  }
  return m;
}

export function defaultTypeWeights(): Record<string, number> {
  return resolveTypeWeights({});
}

