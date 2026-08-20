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
  constructor(private tokens: Token[]) {}

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
    if (this.peek().type !== 'end') throw new Error('Ekspresi tidak lengkap');
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
      if (id === 'x') return (x) => x;
      if (id in CONSTS) {
        const v = CONSTS[id];
        return () => v;
      }
      if (id in FUNCS) {
        this.expect('lp');
        const arg = this.parseExpr();
        this.expect('rp');
        const fn = FUNCS[id];
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

  private startsFactor(): boolean {
    const tok = this.peek();
    return (
      tok.type === 'num' ||
      tok.type === 'lp' ||
      (tok.type === 'id' && (tok.value === 'x' || tok.value in CONSTS || tok.value in FUNCS))
    );
  }
}

/** Kompilasi string ekspresi menjadi fungsi numerik f(x). Melempar Error bila sintaks salah. */
export function compileExpression(expression: string): (x: number) => number {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
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

export interface GraphOptions {
  expression: string;
  xMin: number;
  xMax: number;
  yMin?: number | null;
  yMax?: number | null;
  showGrid?: boolean;
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

function fmt(v: number): string {
  if (Object.is(v, -0)) v = 0;
  const r = Math.round(v * 1e6) / 1e6;
  return String(r);
}

/**
 * Render grafik f(x) menjadi string `<svg …>`. 
 * Auto y-range bila yMin/yMax tidak diberikan: dihitung dari sampling kurva.
 */
export function renderFunctionGraph(opts: GraphOptions): string {
  const W = opts.width ?? 600;
  const H = opts.height ?? 420;
  const margin = { l: 46, r: 16, t: 16, b: 40 };
  const plotW = W - margin.l - margin.r;
  const plotH = H - margin.t - margin.b;
  const showGrid = opts.showGrid ?? true;

  const f = compileExpression(opts.expression);
  const xMin = opts.xMin;
  const xMax = opts.xMax;

  // Tentukan y-range
  let yMin = opts.yMin ?? null;
  let yMax = opts.yMax ?? null;
  if (yMin == null || yMax == null) {
    let lo = Infinity;
    let hi = -Infinity;
    const N = 500;
    for (let i = 0; i <= N; i++) {
      const x = xMin + ((xMax - xMin) * i) / N;
      let y: number;
      try {
        y = f(x);
      } catch {
        continue;
      }
      if (Number.isFinite(y)) {
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
    }
    if (!Number.isFinite(lo)) {
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

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Grafik ${opts.expression}">`);
  parts.push(`<style>text{font-family:Arial,sans-serif;font-size:12px;fill:#334155}.grid{stroke:#e2e8f0;stroke-width:1}.axis{stroke:#0f172a;stroke-width:1.5}.curve{fill:none;stroke:#2563eb;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.tick{fill:#94a3b8}</style>`);

  // Garis bantu & label sumbu (angka di tepi)
  if (showGrid) {
    const xStep = niceStep(xMax - xMin, Math.max(8, Math.floor(plotW / 60)));
    const yStep = niceStep(yMax - yMin, Math.max(8, Math.floor(plotH / 45)));
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      if (Math.abs(x) < xStep / 100) continue; // skip sumbu y
      const px = sx(x);
      parts.push(`<line class="grid" x1="${fmt(px)}" y1="${margin.t}" x2="${fmt(px)}" y2="${margin.t + plotH}"/>`);
      parts.push(`<text class="tick" x="${fmt(px)}" y="${margin.t + plotH + 18}" text-anchor="middle">${fmt(x)}</text>`);
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      if (Math.abs(y) < yStep / 100) continue; // skip sumbu x
      const py = sy(y);
      parts.push(`<line class="grid" x1="${margin.l}" y1="${fmt(py)}" x2="${margin.l + plotW}" y2="${fmt(py)}"/>`);
      parts.push(`<text class="tick" x="${margin.l - 8}" y="${fmt(py + 4)}" text-anchor="end">${fmt(y)}</text>`);
    }
  }

  // Sumbu
  const x0 = sx(0);
  const y0 = sy(0);
  if (xMin <= 0 && xMax >= 0) {
    parts.push(`<line class="axis" x1="${fmt(margin.l)}" y1="${fmt(y0)}" x2="${fmt(margin.l + plotW)}" y2="${fmt(y0)}"/>`);
    parts.push(`<polygon points="${fmt(margin.l + plotW)},${fmt(y0)} ${fmt(margin.l + plotW - 9)},${fmt(y0 - 4)} ${fmt(margin.l + plotW - 9)},${fmt(y0 + 4)}" fill="#0f172a"/>`);
  }
  if (yMin <= 0 && yMax >= 0) {
    parts.push(`<line class="axis" x1="${fmt(x0)}" y1="${fmt(margin.t)}" x2="${fmt(x0)}" y2="${fmt(margin.t + plotH)}"/>`);
    parts.push(`<polygon points="${fmt(x0)},${fmt(margin.t)} ${fmt(x0 - 4)},${fmt(margin.t + 9)} ${fmt(x0 + 4)},${fmt(margin.t + 9)}" fill="#0f172a"/>`);
  }

  // Kurva: sampling + putus di titik non-finite / lompatan besar
  const points: string[] = [];
  const N = 800;
  let prevY: number | null = null;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    let y: number;
    try {
      y = f(x);
    } catch {
      prevY = null;
      continue;
    }
    if (!Number.isFinite(y) || y < yMin - (yMax - yMin) * 2 || y > yMax + (yMax - yMin) * 2) {
      prevY = null;
      continue;
    }
    const px = sx(x);
    const py = sy(Math.max(yMin, Math.min(yMax, y)));
    if (prevY != null && Math.abs(y - prevY) > (yMax - yMin) * 4) {
      // lompatan asimtot → putus polyline
      if (points.length) {
        parts.push(`<polyline class="curve" points="${points.join(' ')}"/>`);
        points.length = 0;
      }
    }
    points.push(`${fmt(px)},${fmt(py)}`);
    prevY = y;
  }
  if (points.length) {
    parts.push(`<polyline class="curve" points="${points.join(' ')}"/>`);
  }

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