import { convertLatexToAsciiMath, convertAsciiMathToLatex } from 'mathlive';

// Jembatan antara LaTeX <math-field> (MathLive) dan sintaks ekspresi
// parser grafik (graph.ts): x^2, sin(x), log(x, 2), sum(i,1,10,x*i), abs(x), pi…

// ascii-math dari MathLive: "sum  _(i=1)^(10)x*i" → "sum(i,1,10,x*i)".
// Eksponen bisa tanpa kurung bila satu karakter ("^3") atau berkurung ("^(10)").
// Badan berakhir sebelum '+'/'-' top-level (ikatan sum hanya sampai sisi + atau -).
function expandAsciiSum(s: string): string {
  const re = /\bsum\s*_(?:\(([^()]+)\)|(\S+?))\s*\^(?:\(([^()]+)\)|(.))/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const headEnd = m.index + m[0].length;
    const lower = m[1] ?? m[2];
    const eq = lower ? lower.indexOf('=') : -1;
    if (eq <= 0) {
      // bukan pola sum bertanda batas → biarkan apa adanya
      out += s.slice(last, headEnd);
      last = headEnd;
      continue;
    }
    const v = lower.slice(0, eq);
    const a = lower.slice(eq + 1);
    const b = m[3] ?? m[4];
    out += s.slice(last, m.index) + `sum(${v},${a},${b},`;
    let depth = 0;
    let j = headEnd;
    while (j < s.length) {
      const c = s[j];
      if (c === '(') depth++;
      else if (c === ')') {
        if (depth === 0) break;
        depth--;
      } else if (depth === 0 && (c === '+' || c === '-') && j > headEnd) break;
      j++;
    }
    // badan bisa berisi sum bersarang → rekursif
    out += expandAsciiSum(s.slice(headEnd, j)) + ')';
    last = j;
    re.lastIndex = j;
  }
  return out + s.slice(last);
}

/** LaTeX (dari <math-field>) → ekspresi yang dimengerti parser grafik. */
export function latexToExpr(latex: string): string {
  if (!latex.trim()) return '';
  let s: string;
  try {
    s = convertLatexToAsciiMath(latex);
  } catch {
    return latex.trim();
  }
  s = expandAsciiSum(s);
  // \log_{2}(x) → ascii "log _2(x)" → log(x, 2)
  s = s.replace(/\blog\s*_([\d.]+)\s*\(([^()]*)\)/g, (_m, base: string, args: string) => `log(${args}, ${base})`);
  // |x| → abs(x)
  s = s.replace(/\|([^|]+)\|/g, (_m, inner: string) => `abs(${inner})`);
  return s.trim();
}

/** Ekspresi parser grafik → LaTeX untuk ditampilkan di <math-field>. */
export function exprToLatex(expr: string): string {
  const e = expr.trim();
  if (!e) return '';
  // sum(i,1,10,x*i) → \sum_{i=1}^{10} x\cdot i (notasi sigma, bukan \sum(i,1,…))
  const m = e.match(/^sum\(\s*([A-Za-z_]\w*)\s*,\s*([^,()]+?)\s*,\s*([^,()]+?)\s*,\s*([\s\S]+)\)$/);
  if (m) {
    return `\\sum_{${m[1]}=${m[2]}}^{${m[3]}} ${exprToLatex(m[4])}`;
  }
  try {
    return convertAsciiMathToLatex(e) || e;
  } catch {
    return e;
  }
}
