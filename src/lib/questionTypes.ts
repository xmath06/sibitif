import type { QuestionType } from '$api/types';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: 'Pilihan Ganda',
  ESSAY: 'Esai',
  TRUE_FALSE: 'Benar Salah',
  POLY_CHOICE: 'Pilihan Ganda Berbobot',
  MULTI_SELECT: 'Pilihan Ganda (Banyak Jawaban)',
  URAIAN_PENDEK: 'Uraian Pendek'
};

export const QUESTION_TYPE_HINTS: Record<QuestionType, string> = {
  MCQ: 'Pilih satu jawaban benar; skor = pengali paket (1 jika tak diubah).',
  ESSAY: 'Jawaban bebas; dinilai guru (maks = pengali paket).',
  TRUE_FALSE: 'Dua pilihan Benar/Salah; tandai satu kunci. Skor = pengali paket.',
  POLY_CHOICE: 'Pilih satu jawaban; tiap opsi punya bobot (boleh parsial). Skor = jumlah bobot terpilih (tanpa pengali).',
  MULTI_SELECT: 'Boleh memilih lebih dari satu; skor tetap 1 (tanpa pengali) jika semua kunci tepat, else 0.',
  URAIAN_PENDEK: 'Jawaban singkat; ada kunci jawaban rujukan guru (dinilai manual, maks = pengali paket).'
};