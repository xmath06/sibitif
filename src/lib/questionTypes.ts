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
  MCQ: 'Pilih satu jawaban; tandai satu kunci (benar).',
  ESSAY: 'Jawaban bebas; dinilai guru secara manual.',
  TRUE_FALSE: 'Dua pilihan Benar/Salah; tandai satu kunci.',
  POLY_CHOICE: 'Pilih satu jawaban; tiap opsi punya bobot (cocok untuk skala/tes psikologi).',
  MULTI_SELECT: 'Boleh memilih lebih dari satu jawaban; nilai = jumlah bobot yang dipilih.',
  URAIAN_PENDEK: 'Jawaban singkat; ada kunci jawaban sebagai rujukan guru (dinilai manual).'
};