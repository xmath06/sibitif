import { api } from '$api/client';
import type { ExcelRow } from '$lib/excel';

export interface ImportResult {
  ok: number;
  failed: number;
  errors: string[];
}

function yn(v: any): boolean {
  return ['y', 'ya', 'yaa', '1', 'true', 'aktif'].includes(String(v ?? '').trim().toLowerCase());
}

function isoDate(v: any): string | null {
  if (v == null || v === '') return null;
  // String tanggal naif ("YYYY-MM-DD HH:MM") dianggap WIB secara eksplisit.
  let d: Date;
  if (
    typeof v === 'string' &&
    !/[zZ]|[+-]\d{2}:?\d{2}$/.test(v) &&
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v)
  ) {
    d = new Date(v + '+07:00');
  } else {
    d = new Date(v);
  }
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}

type SubjectLike = { id: string; code: string; name: string; topics?: { id: string; name: string }[] };
type PackageLike = { id: string; title: string; subjectId?: string; subject?: { name?: string } };

/** Import soal dari Excel. Kolom: mapel, topik, tipe, soal, a..e, kunci, min_kata, max_kata */
export async function importQuestions(rows: ExcelRow[], subjects: SubjectLike[]): Promise<ImportResult> {
  const res: ImportResult = { ok: 0, failed: 0, errors: [] };
  const byKey = new Map<string, SubjectLike>();
  for (const s of subjects) {
    byKey.set(s.code.toLowerCase(), s);
    byKey.set(s.name.toLowerCase(), s);
  }
  const validTypes = ['MCQ', 'ESSAY', 'TRUE_FALSE', 'POLY_CHOICE', 'MULTI_SELECT', 'URAIAN_PENDEK'];
  const letters = ['a', 'b', 'c', 'd', 'e'];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = `Baris ${i + 2}`;
    try {
      const mapel = String(r.mapel ?? r['mata pelajaran'] ?? '').trim().toLowerCase();
      const topik = String(r.topik ?? r['topic'] ?? '').trim().toLowerCase();
      const subj = byKey.get(mapel);
      const topic = subj?.topics?.find((t) => t.name.toLowerCase() === topik);
      if (!subj) {
        res.failed++;
        res.errors.push(`${line}: mapel "${r.mapel}" tidak ditemukan`);
        continue;
      }
      if (!topic) {
        res.failed++;
        res.errors.push(`${line}: topik "${r.topik}" tidak ditemukan pada mapel ${subj.name}`);
        continue;
      }
      const type = String(r.tipe ?? r['tipe soal'] ?? '').toUpperCase().trim();
      if (!validTypes.includes(type)) {
        res.failed++;
        res.errors.push(`${line}: tipe "${r.tipe}" tidak valid (MCQ/ESSAY/TRUE_FALSE/POLY_CHOICE/MULTI_SELECT/URAIAN_PENDEK)`);
        continue;
      }
      const keys = String(r.kunci ?? '').toUpperCase().split(/[,\/]/).map((s) => s.trim()).filter(Boolean);
      const options: { optionText: string; scoreWeight: number }[] = [];
      let answerKeyText = '';
      if (type === 'ESSAY' || type === 'URAIAN_PENDEK') {
        // tidak punya opsi; URAIAN_PENDEK menyimpan kunci sebagai teks jawaban
        if (type === 'URAIAN_PENDEK') answerKeyText = String(r.kunci ?? '').trim();
      } else {
        for (const L of letters) {
          const t = r[L];
          if (t != null && String(t).trim() !== '') {
            options.push({ optionText: String(t), scoreWeight: keys.includes(L.toUpperCase()) ? 1 : 0 });
          }
        }
        if (options.length === 0) {
          res.failed++;
          res.errors.push(`${line}: opsi jawaban (a..e) kosong untuk ${type}`);
          continue;
        }
        if (keys.length === 0) {
          res.failed++;
          res.errors.push(`${line}: kunci jawaban kosong untuk ${type}`);
          continue;
        }
      }
      const text = String(r.soal ?? r['pertanyaan'] ?? '').trim();
      if (!text) {
        res.failed++;
        res.errors.push(`${line}: teks soal kosong`);
        continue;
      }
      const payload: any = { topicId: topic.id, questionText: text, questionType: type };
      if (type === 'ESSAY' || type === 'URAIAN_PENDEK') {
        if (r.min_kata) payload.minWordCount = Number(r.min_kata) || undefined;
        if (r.max_kata) payload.maxWordCount = Number(r.max_kata) || undefined;
        if (type === 'URAIAN_PENDEK' && answerKeyText) payload.answerKey = answerKeyText;
      } else {
        payload.options = options;
      }
      await api.post('/questions', payload);
      res.ok++;
    } catch (e: any) {
      res.failed++;
      res.errors.push(`${line}: ${e?.message || 'gagal'}`);
    }
  }
  return res;
}

/** Import paket dari Excel. Kolom: mapel, judul, durasi, pass, acak_soal, acak_opsi */
export async function importPackages(rows: ExcelRow[], subjects: SubjectLike[]): Promise<ImportResult> {
  const res: ImportResult = { ok: 0, failed: 0, errors: [] };
  const byKey = new Map<string, SubjectLike>();
  for (const s of subjects) {
    byKey.set(s.code.toLowerCase(), s);
    byKey.set(s.name.toLowerCase(), s);
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = `Baris ${i + 2}`;
    try {
      const mapel = String(r.mapel ?? r['mata pelajaran'] ?? '').trim().toLowerCase();
      const subj = byKey.get(mapel);
      if (!subj) {
        res.failed++;
        res.errors.push(`${line}: mapel "${r.mapel}" tidak ditemukan`);
        continue;
      }
      const title = String(r.judul ?? r['nama paket'] ?? '').trim();
      if (!title) {
        res.failed++;
        res.errors.push(`${line}: judul paket kosong`);
        continue;
      }
      const payload: any = {
        subjectId: subj.id,
        title,
        hasTimer: r.durasi != null && String(r.durasi).trim() !== '' && Number(r.durasi) > 0,
        durationMinutes: r.durasi ? Number(r.durasi) || null : null,
        passScore: r.pass ? Number(r.pass) || null : null,
        isRandomQuestions: yn(r.acak_soal),
        isRandomOptions: yn(r.acak_opsi)
      };
      await api.post('/packages', payload);
      res.ok++;
    } catch (e: any) {
      res.failed++;
      res.errors.push(`${line}: ${e?.message || 'gagal'}`);
    }
  }
  return res;
}

/** Import jadwal dari Excel. Kolom: paket, judul, mulai, kategori, kode_akses, tampil_hasil, target, agama */
export async function importSchedules(rows: ExcelRow[], packages: PackageLike[]): Promise<ImportResult> {
  const res: ImportResult = { ok: 0, failed: 0, errors: [] };
  const byTitle = new Map<string, PackageLike>();
  for (const p of packages) byTitle.set(p.title.toLowerCase(), p);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = `Baris ${i + 2}`;
    try {
      const pkgTitle = String(r.paket ?? r['nama paket'] ?? '').trim().toLowerCase();
      const pkg = byTitle.get(pkgTitle);
      if (!pkg) {
        res.failed++;
        res.errors.push(`${line}: paket "${r.paket}" tidak ditemukan`);
        continue;
      }
      const title = String(r.judul ?? r['nama jadwal'] ?? '').trim();
      if (!title) {
        res.failed++;
        res.errors.push(`${line}: judul jadwal kosong`);
        continue;
      }
      const start = isoDate(r.mulai ?? r['waktu mulai']);
      if (!start) {
        res.failed++;
        res.errors.push(`${line}: waktu mulai tidak valid`);
        continue;
      }
      const target = String(r.target ?? r['target'] ?? 'ALL_STUDENTS').toUpperCase().trim();
      const rawCat = String(r.kategori ?? r.kategori ?? '').toUpperCase().trim();
      const CATEGORIES = ['EXAM', 'ASSIGNMENT', 'QUIZ', 'PRACTICE'];
      const category = rawCat ? (CATEGORIES.includes(rawCat) ? rawCat : null) : 'EXAM';
      if (!category) {
        res.failed++;
        res.errors.push(`${line}: kategori "${r.kategori}" tidak dikenali. Pilih salah satu: ${CATEGORIES.join(', ')}`);
        continue;
      }
      const payload: any = {
        packageId: pkg.id,
        title,
        startTime: start,
        category,
        accessCode: r.kode_akses ? String(r.kode_akses) : null,
        showResultImmediately: yn(r.tampil_hasil),
        targetType: ['ALL_STUDENTS', 'BY_CLASS', 'BY_GRADE', 'SPECIFIC_STUDENTS'].includes(target) ? (target as any) : 'ALL_STUDENTS',
        targetReligion: r.agama ? String(r.agama).toUpperCase() : null
      };
      await api.post('/schedules', payload);
      res.ok++;
    } catch (e: any) {
      res.failed++;
      res.errors.push(`${line}: ${e?.message || 'gagal'}`);
    }
  }
  return res;
}

/** Import siswa dari Excel (guru/admin). Kolom: nama, username, password, agama, kelas */
export async function importStudents(rows: ExcelRow[], classes: { id: string; name: string }[] = []): Promise<ImportResult> {
  const res: ImportResult = { ok: 0, failed: 0, errors: [] };
  const validReligion = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'OTHER'];
  const classByName = new Map(classes.map((c) => [c.name.toLowerCase(), c.id]));
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = `Baris ${i + 2}`;
    try {
      const name = String(r.nama ?? r['nama lengkap'] ?? '').trim();
      const username = String(r.username ?? '').trim();
      const password = String(r.password ?? 'siswa123').trim();
      const religion = String(r.agama ?? '').toUpperCase().trim();
      const kelas = String(r.kelas ?? '').trim();
      const classId = kelas ? classByName.get(kelas.toLowerCase()) ?? null : null;
      if (!name || !username) {
        res.failed++;
        res.errors.push(`${line}: nama & username wajib diisi`);
        continue;
      }
      if (kelas && !classId) {
        res.failed++;
        res.errors.push(`${line}: kelas "${r.kelas}" tidak ditemukan`);
        continue;
      }
      if (religion && !validReligion.includes(religion)) {
        res.failed++;
        res.errors.push(`${line}: agama "${r.agama}" tidak valid`);
        continue;
      }
      await api.post('/teacher/students', {
        name,
        username,
        password,
        religion: religion || 'OTHER',
        classId
      });
      res.ok++;
    } catch (e: any) {
      res.failed++;
      res.errors.push(`${line}: ${e?.message || 'gagal'}`);
    }
  }
  return res;
}

/** Import kelas dari Excel. Kolom: gradeLevel (jenjang), name (nama kelas) */
export async function importClasses(rows: ExcelRow[]): Promise<ImportResult> {
  const res: ImportResult = { ok: 0, failed: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = `Baris ${i + 2}`;
    try {
      const gradeLevel = Number(r.gradeLevel ?? r.jenjang ?? 0);
      const name = String(r.name ?? r.kelas ?? '').trim();
      if (!gradeLevel || !name) {
        res.failed++;
        res.errors.push(`${line}: gradeLevel (jenjang) & nama kelas wajib`);
        continue;
      }
      await api.post('/classes', { gradeLevel, name });
      res.ok++;
    } catch (e: any) {
      res.failed++;
      res.errors.push(`${line}: ${e?.message || 'gagal'}`);
    }
  }
  return res;
}

/** Import user umum (admin) dari Excel. Kolom: nama, username, password, role, agama, kelas */
export async function importUsers(rows: ExcelRow[], classes: { id: string; name: string }[] = []): Promise<ImportResult> {
  const res: ImportResult = { ok: 0, failed: 0, errors: [] };
  const validRole = ['ADMIN', 'TEACHER', 'STUDENT'];
  const validReligion = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'OTHER'];
  const classByName = new Map(classes.map((c) => [c.name.toLowerCase(), c.id]));
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = `Baris ${i + 2}`;
    try {
      const name = String(r.nama ?? r['nama lengkap'] ?? '').trim();
      const username = String(r.username ?? '').trim();
      const password = String(r.password ?? 'pass123').trim();
      const role = String(r.role ?? 'STUDENT').toUpperCase().trim();
      const religion = String(r.agama ?? '').toUpperCase().trim();
      const kelas = String(r.kelas ?? '').trim();
      const classId = kelas ? classByName.get(kelas.toLowerCase()) ?? null : null;
      if (!name || !username) {
        res.failed++;
        res.errors.push(`${line}: nama & username wajib diisi`);
        continue;
      }
      if (!validRole.includes(role)) {
        res.failed++;
        res.errors.push(`${line}: role "${r.role}" tidak valid (ADMIN/TEACHER/STUDENT)`);
        continue;
      }
      if (kelas && !classId) {
        res.failed++;
        res.errors.push(`${line}: kelas "${r.kelas}" tidak ditemukan`);
        continue;
      }
      if (religion && !validReligion.includes(religion)) {
        res.failed++;
        res.errors.push(`${line}: agama "${r.agama}" tidak valid`);
        continue;
      }
      await api.post('/users', {
        name,
        username,
        password,
        role,
        religion: religion || null,
        classId
      });
      res.ok++;
    } catch (e: any) {
      res.failed++;
      res.errors.push(`${line}: ${e?.message || 'gagal'}`);
    }
  }
  return res;
}
