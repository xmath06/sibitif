import * as XLSX from 'xlsx';

export type ExcelRow = Record<string, any>;

/** Baca sheet pertama dari file .xlsx/.xls/.csv → array of row objects. */
export async function readExcelFile(file: File, sheetIndex = 0): Promise<ExcelRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const name = wb.SheetNames[sheetIndex];
  if (!name) return [];
  const ws = wb.Sheets[name];
  return XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '', raw: false });
}

/** Generate & unduh file template .xlsx dari header + 1 baris contoh. */
export function downloadExcelTemplate(headers: string[], sample: ExcelRow, filename: string) {
  const ws = XLSX.utils.json_to_sheet([sample], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}
