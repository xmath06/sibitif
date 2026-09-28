// Generator grafik fungsi f(x) → SVG inline (disimpan di dalam questionText).
// Evaluator ekspresi: parser recursive-descent kecil (tanpa dependensi eksternal).

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Token =
  | { type: 'num'; value: number }
  | { type: 'id'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '^' }
  | { type: 'comma' }
  | { type: 'lp' }
  | { type: 'rp' }
  | { type: 'end' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.eE]/.test(s[j])) j++;
      let str = s.slice(i, j);
      // dukungan notasi ilmiah 1e5 / 2.5E-3
      if (str.includes('e') || str.includes('E')) {
        str = str.replace(/e/g, 'e').replace(/E/g, 'e');
      }
      const value = Number(str);
      if (isNaN(value)) {
        throw new Error(`Angka tidak valid: "${str}"`);
      }
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      tokens.push({ type: 'id', value: s.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lp' });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rp' });
      i++;
      continue;
    }
    throw new Error(`Karakter tidak dikenal: "${c}"`);
  }
  tokens.push({ type: 'end' });
  return tokens;
}

class Parser {
  private pos = 0;
  // Scope variabel terikat sigma (sum): { nama, box } — box dibagi oleh semua
  // closure dalam suku, sehingga tiap iterasi cukup menulis box.v = k.
  private scopes: { name: string; box: { v: number } }[] = [];
  constructor(private tokens: Token[], private deg = false) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }
  private next(): Token {
    return this.tokens[this.pos++];
  }
  private expect(t: Token['type']): Token {
    const tok = this.next();
    if (tok.type !== t) throw new Error(`Diharapkan "${t}", tetapi ada "${tok.type}"`);
    return tok;
  }

  parse(): (x: number) => number {
    const expr = this.parseExpr();
    const t = this.peek();
    if (t.type === 'comma') throw new Error('Koma (,) hanya boleh di dalam argumen fungsi, mis. log(x, 2)');
    if (t.type !== 'end') throw new Error('Ekspresi tidak lengkap');
    return expr;
  }

  // expr := term (('+'|'-') term)*
  private parseExpr(): (x: number) => number {
    let left = this.parseTerm();
    for (;;) {
      const tok = this.peek();
      if (tok.type === 'op' && tok.value === '+') {
        this.next();
        const right = this.parseTerm();
        const l = left;
        left = (x) => l(x) + right(x);
      } else if (tok.type === 'op' && tok.value === '-') {
        this.next();
        const right = this.parseTerm();
        const l = left;
        left = (x) => l(x) - right(x);
      } else {
        return left;
      }
    }
  }

  // term := unary (('*'|'/') unary | perkalian implisit)*
  private parseTerm(): (x: number) => number {
    let left = this.parseUnary();
    for (;;) {
      const tok = this.peek();
      if (tok.type === 'op' && tok.value === '*') {
        this.next();
        const right = this.parseUnary();
        const l = left;
        left = (x) => l(x) * right(x);
      } else if (tok.type === 'op' && tok.value === '/') {
        this.next();
        const right = this.parseUnary();
        const l = left;
        left = (x) => l(x) / right(x);
      } else if (this.startsFactor()) {
        // perkalian implisit: 2x, 2(x+1), (x+1)(x-1), x sin(x)
        const right = this.parseUnary();
        const l = left;
        left = (x) => l(x) * right(x);
      } else {
        return left;
      }
    }
  }

  // unary := ('-'|'+')* power
  private parseUnary(): (x: number) => number {
    const tok = this.peek();
    if (tok.type === 'op' && tok.value === '-') {
      this.next();
      const inner = this.parseUnary();
      return (x) => -inner(x);
    }
    if (tok.type === 'op' && tok.value === '+') {
      this.next();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  // power := atom ('^' unary)?  → pangkat bersifat right-assoc & mengikat lebih kuat
  private parsePower(): (x: number) => number {
    const base = this.parseAtom();
    const tok = this.peek();
    if (tok.type === 'op' && tok.value === '^') {
      this.next();
      const exp = this.parseUnary();
      return (x) => Math.pow(base(x), exp(x));
    }
    return base;
  }

  // atom := number | 'x' | konstanta | fungsi '(' expr ')' | '(' expr ')'
  private parseAtom(): (x: number) => number {
    const tok = this.next();
    if (tok.type === 'num') {
      const v = tok.value;
      return () => v;
    }
    if (tok.type === 'id') {
      const id = tok.value;
      // Variabel terikat sigma (sum) — scope terdalam menang, mis. sum(x,…) → x = indeks
      for (let s = this.scopes.length - 1; s >= 0; s--) {
        if (this.scopes[s].name === id) {
          const box = this.scopes[s].box;
          return () => box.v;
        }
      }
      if (id === 'x') return (x) => x;
      if (id === 'sum') return this.parseSum();
      if (id in CONSTS) {
        const v = CONSTS[id];
        return () => v;
      }
      if (id in FUNCS) {
        this.expect('lp');
        const arg = this.parseExpr();
        let base: ((x: number) => number) | null = null;
        if (this.peek().type === 'comma') {
          this.next();
          base = this.parseExpr();
        }
        this.expect('rp');
        if (base) {
          // argumen kedua → hanya log(x, basis) yang didukung, mis. log(x, 2)
          if (id !== 'log') throw new Error(`Fungsi "${id}" hanya menerima satu argumen`);
          const b = base;
          return (x) => Math.log(arg(x)) / Math.log(b(x));
        }
        const fn = FUNCS[id];
        if (this.deg) {
          // Mode derajat: sin/cos/tan terima input °→rad, invers menghasilkan °
          if (id === 'asin' || id === 'acos' || id === 'atan') {
            return (x) => (fn(arg(x)) * 180) / Math.PI;
          }
          if (id === 'sin' || id === 'cos' || id === 'tan') {
            return (x) => fn((arg(x) * Math.PI) / 180);
          }
        }
        return (x) => fn(arg(x));
      }
      throw new Error(`Nama tidak dikenal: "${id}"`);
    }
    if (tok.type === 'lp') {
      const inner = this.parseExpr();
      this.expect('rp');
      return inner;
    }
    throw new Error(`Token tak terduga: "${tok.type}"`);
  }

  // sum(var, awal, akhir, suku) → notasi sigma. Mis. sum(i,1,10,i^2) = Σ i².
  // Variabel sumbu di-scope hanya di dalam suku (awl/akhir tetap memakai x luar).
  private parseSum(): (x: number) => number {
    this.expect('lp');
    const vtok = this.next();
    if (vtok.type !== 'id') throw new Error('Argumen pertama sum harus nama variabel, mis. i');
    this.expect('comma');
    const startFn = this.parseExpr();
    this.expect('comma');
    const endFn = this.parseExpr();
    this.expect('comma');
    const box = { v: 0 };
    this.scopes.push({ name: vtok.value, box });
    const body = this.parseExpr();
    this.scopes.pop();
    this.expect('rp');
    return (x) => {
      const a = startFn(x);
      const b = endFn(x);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
      const lo = Math.ceil(a);
      const hi = Math.floor(b);
      const n = hi - lo + 1;
      if (n <= 0) return 0;
      if (n > 10000) throw new Error('Rentang sum terlalu besar (maks 10000 iterasi)');
      let s = 0;
      for (let k = lo; k <= hi; k++) {
        box.v = k;
        s += body(x);
      }
      return s;
    };
  }

  private startsFactor(): boolean {
    const tok = this.peek();
    return (
      tok.type === 'num' ||
      tok.type === 'lp' ||
      (tok.type === 'id' &&
        (tok.value === 'x' ||
          tok.value === 'sum' ||
          tok.value in CONSTS ||
          tok.value in FUNCS ||
          this.scopes.some((s) => s.name === tok.value)))
    );
  }
}

/** Kompilasi string ekspresi menjadi fungsi numerik f(x). Melempar Error bila sintaks salah.
 *  `degrees` = true → argumen sin/cos/tan ditafsirkan derajat, hasil asin/acos/atan juga derajat. */
export function compileExpression(expression: string, degrees = false): (x: number) => number {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens, degrees);
  return parser.parse();
}

/** Uji cepat: apakah ekspresi valid & terdefinisi di x=0 (utk feedback live). */
export function validateExpression(expression: string): { ok: boolean; message?: string } {
  try {
    const f = compileExpression(expression);
    f(0);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Ekspresi tidak valid' };
  }
}

export interface GraphFunction {
  expr: string;
  name?: string; // huruf fungsi, default f/g/h…
  inverse?: boolean; // tampilkan notasi f⁻¹(x)
}

export interface GraphOptions {
  functions: GraphFunction[];
  xMin: number;
  xMax: number;
  yMin?: number | null;
  yMax?: number | null;
  showGrid?: boolean;
  showLabels?: boolean;
  xUnit?: 'rad' | 'deg';
  width?: number;
  height?: number;
}

// "Nice" step untuk garis bantu: 1, 2, 5 × 10^n
function niceStep(range: number, targetSteps: number): number {
  if (!(range > 0)) return 1;
  const raw = range / targetSteps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) {
    if (raw <= m * mag) return m * mag;
  }
  return 10 * mag;
}

// Step derajat "bersih" untuk trigonometri: 30°, 45°, 60°, 90°, 180°, 360°, dst.
function niceDegreeStep(range: number, targetSteps: number): number {
  if (!(range > 0)) return 30;
  const cands = [15, 30, 45, 60, 90, 180, 360, 720];
  for (const c of cands) {
    if (range / c <= targetSteps) return c;
  }
  return 720;
}

function fmt(v: number): string {
  if (Object.is(v, -0)) v = 0;
  const r = Math.round(v * 1e6) / 1e6;
  return String(r);
}

// Warna kurva (siklus bila fungsi lebih banyak).
const CURVE_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0d9488'];
const DEFAULT_NAMES = ['f', 'g', 'h', 'p', 'q', 'r'];

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Run { text: string; sup?: boolean; italic?: boolean }

// Uraikan ekspresi "x^2-4" → segmen; pangkat ditandai `sup` (dan * → ·).
function parseExprRuns(expr: string): Run[] {
  const runs: Run[] = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      runs.push({ text: buf });
      buf = '';
    }
  };
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === '^') {
      const rest = expr.slice(i + 1);
      const m = rest.match(/^(-?\d+(?:\.\d+)?|[a-zA-Z]|\([^()]*\))/);
      if (m) {
        flush();
        const sup = m[1].startsWith('(') ? m[1].slice(1, -1) : m[1];
        runs.push({ text: sup, sup: true });
        i += 1 + m[1].length;
        continue;
      }
      buf += '^';
      i++;
      continue;
    }
    if (c === '*') {
      buf += '·';
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return runs;
}

// Bangun markup <text> dari segmen. SETIAP superskrip digeser naik (-0.35em) dan
// segmen berikutnya wajib digeser turun (+0.35em) agar baseline kembali normal
// (tanpa ini, teks setelah pangkat/invers ikut terangkat — bug lama).
function svgRuns(runs: Run[]): string {
  let out = '';
  let raised = false;
  for (const r of runs) {
    const style = r.italic ? ' font-style="italic"' : '';
    const body = escXml(r.text);
    if (r.sup) {
      out += `<tspan dy="-0.35em" font-size="0.7em"${style}>${body}</tspan>`;
      raised = true;
    } else if (raised) {
      out += `<tspan dy="0.35em"${style}>${body}</tspan>`;
      raised = false;
    } else {
      out += `<tspan${style}>${body}</tspan>`;
    }
  }
  return out;
}

// Tampilan label: sum(i,awal,akhir,suku) → Σ(i=awal..akhir, suku)
function prettyExpr(expr: string): string {
  return expr.replace(
    /sum\(\s*([A-Za-z_]\w*)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,/g,
    (_m, v: string, a: string, b: string) => `Σ(${v}=${a}..${b}, `
  );
}

// Label lengkap dengan notasi fungsi: "f(x) = x+2" atau "f⁻¹(x) = …"
function functionLabel(fn: GraphFunction, idx: number): { markup: string; plain: string } {
  const name = fn.name && fn.name.trim() ? fn.name.trim() : DEFAULT_NAMES[idx % DEFAULT_NAMES.length];
  const shown = prettyExpr(fn.expr);
  const runs: Run[] = [
    { text: name, italic: true },
    ...(fn.inverse ? [{ text: '-1', sup: true }] : []),
    { text: '(x) = ' },
    ...parseExprRuns(shown)
  ];
  const plainName = fn.inverse ? `${name}⁻¹` : name;
  return { markup: svgRuns(runs), plain: `${plainName}(x) = ${shown}` };
}

// Label persamaan di ujung kurva (kanan bawah/atas dari titik akhir).
function curveLabel(markup: string, plain: string, px: number, py: number, plotRight: number, plotBottom: number, color: string): string {
  const fontSize = 13;
  const w = plain.length * 7 + 14;
  let x = px + 10;
  let y = py - 8;
  if (x + w > plotRight) x = plotRight - w;
  if (y < 22) y = 22;
  if (y > plotBottom) y = plotBottom;
  return (
    `<rect x="${fmt(x)}" y="${fmt(y - fontSize)}" width="${fmt(w)}" height="${fontSize + 8}" rx="5" fill="#ffffff" fill-opacity="0.85" stroke="#cbd5e1" stroke-width="0.5"/>` +
    `<text x="${fmt(x + 7)}" y="${fmt(y - 2)}" font-family="Arial,sans-serif" font-size="${fontSize}" fill="${color}">${markup}</text>`
  );
}

/**
 * Render grafik satu atau lebih fungsi f(x) menjadi string `<svg …>`.
 * - `expressions`: array ekspresi; tiap fungsi digambar dengan warna berbeda.
 * - Auto y-range bila yMin/yMax tidak diberikan: dihitung dari sampling semua kurva.
 * - Label persamaan otomatis diletakkan di ujung tiap kurva bila `showLabels` (default true).
 */
export function renderFunctionGraph(opts: GraphOptions): string {
  const W = opts.width ?? 600;
  const H = opts.height ?? 420;
  const margin = { l: 46, r: 16, t: 16, b: 40 };
  const plotW = W - margin.l - margin.r;
  const plotH = H - margin.t - margin.b;
  const showGrid = opts.showGrid ?? true;
  const showLabels = opts.showLabels ?? true;
  const xUnit: 'rad' | 'deg' = opts.xUnit ?? 'rad';
  const degMode = xUnit === 'deg';

  const funcs = opts.functions.filter((f) => f.expr.trim().length > 0);
  const fns = funcs.map((f) => compileExpression(f.expr, degMode));
  const xMin = opts.xMin;
  const xMax = opts.xMax;

  // Tentukan y-range (dari semua fungsi)
  let yMin = opts.yMin ?? -1;
  let yMax = opts.yMax ?? null;
  if (yMin == null || yMax == null) {
    const ys: number[] = [];
    const N = 500;
    for (const f of fns) {
      for (let i = 0; i <= N; i++) {
        const x = xMin + ((xMax - xMin) * i) / N;
        let y: number;
        try {
          y = f(x);
        } catch {
          continue;
        }
        if (Number.isFinite(y)) ys.push(y);
      }
    }
    // Klip outlier (persentil 2–98) agar asimtot (mis. 1/x) tidak merusak skala.
    let lo: number;
    let hi: number;
    if (ys.length) {
      const sorted = [...ys].sort((a, b) => a - b);
      lo = sorted[Math.floor(sorted.length * 0.02)] ?? sorted[0];
      hi = sorted[Math.floor(sorted.length * 0.98)] ?? sorted[sorted.length - 1];
    } else {
      lo = -10;
      hi = 10;
    }
    const pad = Math.max((hi - lo) * 0.1, 1);
    yMin = yMin ?? lo - pad;
    yMax = yMax ?? hi + pad;
  }
  if (!(yMax > yMin)) {
    yMin -= 1;
    yMax += 1;
  }

  const sx = (x: number) => margin.l + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) => margin.t + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  // Titik potong sumbu (0,0) + visibilitas — dipakai penempatan label angka & tick.
  const x0 = sx(0);
  const y0 = sy(0);
  const xAxisVisible = yMin <= 0 && yMax >= 0; // sumbu-x (garis y=0) tampil?
  const yAxisVisible = xMin <= 0 && xMax >= 0; // sumbu-y (garis x=0) tampil?

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Grafik ${funcs.map((f) => f.expr).join(' ; ')}">`);
  parts.push(`<style>text{font-family:Arial,sans-serif;font-size:12px;fill:#334155}.grid{stroke:#e2e8f0;stroke-width:1}.axis{stroke:#0f172a;stroke-width:1.5}.curve{fill:none;stroke:#2563eb;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.tick{fill:#64748b;paint-order:stroke;stroke:#ffffff;stroke-width:3px;stroke-linejoin:round}</style>`);
  // Area clip untuk kurva: memotong visual titik di luar plot (tanpa flatten ke batas y).
  parts.push(`<defs><clipPath id="plot-clip"><rect x="${fmt(margin.l)}" y="${fmt(margin.t)}" width="${fmt(plotW)}" height="${fmt(plotH)}"/></clipPath></defs>`);

  // Garis bantu & label angka — gaya cartesius matematika: angka menempel DI ATAS
  // sumbu (bukan di tepi canvas). Bila sumbu tidak terlihat (0 di luar rentang),
  // fallback ke tepi plot seperti gambar cartesius tanpa sumbu.
  if (showGrid) {
    // Step sumbu-x: dalam derajat pilih nilai "bersih" (30/45/60/90/180) agar label trig rapi.
    let xStep: number;
    if (degMode) {
      xStep = niceDegreeStep(xMax - xMin, Math.max(8, Math.floor(plotW / 60)));
    } else {
      xStep = niceStep(xMax - xMin, Math.max(8, Math.floor(plotW / 60)));
    }
    const yStep = niceStep(yMax - yMin, Math.max(8, Math.floor(plotH / 45)));
    // Posisi label: tepat di bawah garis y=0 / di kiri garis x=0 (bila sumbu tampil)
    const xLabelY = xAxisVisible ? y0 + 16 : margin.t + plotH + 18;
    const yLabelX = yAxisVisible ? x0 - 7 : margin.l - 8;
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + xStep / 100; x += xStep) {
      if (Math.abs(x) < xStep / 100) continue; // skip sumbu y
      const px = sx(x);
      parts.push(`<line class="grid" x1="${fmt(px)}" y1="${margin.t}" x2="${fmt(px)}" y2="${margin.t + plotH}"/>`);
      // tick gelap menyebrangi sumbu-x (penanda angka ala kartesius)
      if (xAxisVisible) {
        parts.push(`<line x1="${fmt(px)}" y1="${fmt(y0 - 3)}" x2="${fmt(px)}" y2="${fmt(y0 + 3)}" stroke="#0f172a" stroke-width="1"/>`);
      }
      parts.push(`<text class="tick" x="${fmt(px)}" y="${fmt(xLabelY)}" text-anchor="middle">${degMode ? fmt(x) + '°' : fmt(x)}</text>`);
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      if (Math.abs(y) < yStep / 100) continue; // skip sumbu x
      const py = sy(y);
      parts.push(`<line class="grid" x1="${margin.l}" y1="${fmt(py)}" x2="${margin.l + plotW}" y2="${fmt(py)}"/>`);
      // tick gelap menyebrangi sumbu-y
      if (yAxisVisible) {
        parts.push(`<line x1="${fmt(x0 - 3)}" y1="${fmt(py)}" x2="${fmt(x0 + 3)}" y2="${fmt(py)}" stroke="#0f172a" stroke-width="1"/>`);
      }
      parts.push(`<text class="tick" x="${fmt(yLabelX)}" y="${fmt(py + 4)}" text-anchor="end">${fmt(y)}</text>`);
    }
  }

  // Sumbu. Sumbu-x (garis horizontal y=0) tampil bila 0 berada dalam rentang y;
  // sumbu-y (garis vertikal x=0) tampil bila 0 berada dalam rentang x.
  // (Sempat terbalik: sumbu-y hilang untuk kurva yang seluruhnya di atas sumbu-x,
  //  mis. f(x)=x^2+3.)
  if (xAxisVisible) {
    parts.push(`<line class="axis" x1="${fmt(margin.l)}" y1="${fmt(y0)}" x2="${fmt(margin.l + plotW)}" y2="${fmt(y0)}"/>`);
    parts.push(`<polygon points="${fmt(margin.l + plotW)},${fmt(y0)} ${fmt(margin.l + plotW - 9)},${fmt(y0 - 4)} ${fmt(margin.l + plotW - 9)},${fmt(y0 + 4)}" fill="#0f172a"/>`);
  }
  if (yAxisVisible) {
    parts.push(`<line class="axis" x1="${fmt(x0)}" y1="${fmt(margin.t)}" x2="${fmt(x0)}" y2="${fmt(margin.t + plotH)}"/>`);
    parts.push(`<polygon points="${fmt(x0)},${fmt(margin.t)} ${fmt(x0 - 4)},${fmt(margin.t + 9)} ${fmt(x0 + 4)},${fmt(margin.t + 9)}" fill="#0f172a"/>`);
  }

  // =========================================================================
  // MULAI GAMBAR ISI GRAFIK FUNGSI (kurva f(x)) — di luar sumbu X/Y (cartesian)
  // Sumbu + grid sudah digambar di atas; blok berikut hanya menggambar kurva.
  // =========================================================================
  // Kurva: sampling + putus polyline di titik non-finite / di luar rentang / lompatan besar
  const plotRight = margin.l + plotW;
  const plotBottom = margin.t + plotH;
  fns.forEach((f, idx) => {
    const color = CURVE_COLORS[idx % CURVE_COLORS.length];
    const points: string[] = [];
    const flush = () => {
      if (points.length) {
        // clip-path: titik di luar area plot dipotong tampilan (bukan di-flatten
        // ke ymin/ymax — lihat bug lama di clamp sy(Math.max/min)).
        parts.push(`<polyline class="curve" clip-path="url(#plot-clip)" stroke="${color}" points="${points.join(' ')}"/>`);
        points.length = 0;
      }
    };
    const N = 800;
    let prevY: number | null = null;
    let lastPx = 0;
    let lastPy = 0;
    for (let i = 0; i <= N; i++) {
      const x = xMin + ((xMax - xMin) * i) / N;
      let y: number;
      try {
        y = f(x);
      } catch {
        flush();
        prevY = null;
        continue;
      }
      if (!Number.isFinite(y) || y < yMin - (yMax - yMin) * 2 || y > yMax + (yMax - yMin) * 2) {
        // keluar jangkauan (mis. mendekati asimtot) → akhiri segmen
        flush();
        prevY = null;
        continue;
      }
      const px = sx(x);
      // JANGAN clamp y ke [yMin, yMax] — clamp menyebabkan kurva yang melewati
      // batas "dipipihkan" horizontal sejajar ymin/ymax (bug). Biarkan koordinat
      // keluar area plot; clip-path (#plot- crop visualnya di tepi plot.
      const py = sy(y);
      if (prevY != null && Math.abs(y - prevY) > (yMax - yMin) * 4) {
        flush();
      }
      points.push(`${fmt(px)},${fmt(py)}`);
      lastPx = px;
      lastPy = py;
      prevY = y;
    }
    flush();
    if (showLabels) {
      const lbl = functionLabel(funcs[idx], idx);
      parts.push(curveLabel(lbl.markup, lbl.plain, lastPx, lastPy, plotRight, plotBottom, color));
    }
  });

  parts.push('</svg>');
  return parts.join('');
}

/** Encode SVG → data URI base64 agar bisa dipakai sebagai src img (self-contained). */
export function svgToDataUri(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}