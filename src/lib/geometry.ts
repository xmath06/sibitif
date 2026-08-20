// Generator bangun geometri 2D & 3D → SVG inline (self-contained di questionText).
// Label titik sudut otomatis (A, B, C, …) dan panjang sisi opsional (dihitung dari dimensi).
// Tanpa dependensi eksternal. Sudut-sudut yang berurutan diberi huruf sesuai arah gambar.

const TAU = Math.PI * 2;

interface Pt { x: number; y: number }

export interface GeometryShapeDef {
  id: string;
  label: string;
  kind: '2d' | '3d';
  params: { key: string; label: string; def: number }[];
}

// Daftar bangun: 2D (poligon + lingkaran) dan 3D (proyeksi isometrik sederhana).
export const GEOMETRY_SHAPES: GeometryShapeDef[] = [
  // ── 2D ─────────────────────────────────────────────
  { id: 'square', label: 'Persegi', kind: '2d', params: [{ key: 'side', label: 'Sisi', def: 4 }] },
  { id: 'rectangle', label: 'Persegi Panjang', kind: '2d', params: [{ key: 'w', label: 'Panjang', def: 6 }, { key: 'h', label: 'Lebar', def: 4 }] },
  { id: 'triangle_right', label: 'Segitiga Siku-siku', kind: '2d', params: [{ key: 'a', label: 'Alas', def: 6 }, { key: 'b', label: 'Tinggi', def: 4 }] },
  { id: 'triangle_isosceles', label: 'Segitiga Sama Kaki', kind: '2d', params: [{ key: 'base', label: 'Alas', def: 6 }, { key: 'height', label: 'Tinggi', def: 4 }] },
  { id: 'triangle_equilateral', label: 'Segitiga Sama Sisi', kind: '2d', params: [{ key: 'side', label: 'Sisi', def: 5 }] },
  { id: 'parallelogram', label: 'Jajar Genjang', kind: '2d', params: [{ key: 'base', label: 'Alas', def: 6 }, { key: 'height', label: 'Tinggi', def: 3 }, { key: 'shift', label: 'Geser', def: 2 }] },
  { id: 'trapezoid', label: 'Trapesium', kind: '2d', params: [{ key: 'bottom', label: 'Alas bawah', def: 7 }, { key: 'top', label: 'Alas atas', def: 4 }, { key: 'height', label: 'Tinggi', def: 4 }] },
  { id: 'rhombus', label: 'Belah Ketupat', kind: '2d', params: [{ key: 'd1', label: 'Diagonal 1', def: 6 }, { key: 'd2', label: 'Diagonal 2', def: 4 }] },
  { id: 'kite', label: 'Layang-layang', kind: '2d', params: [{ key: 'w', label: 'Lebar', def: 6 }, { key: 'h1', label: 'Bagian atas', def: 3 }, { key: 'h2', label: 'Bagian bawah', def: 4 }] },
  { id: 'circle', label: 'Lingkaran', kind: '2d', params: [{ key: 'r', label: 'Jari-jari', def: 3 }] },
  { id: 'semicircle', label: 'Setengah Lingkaran', kind: '2d', params: [{ key: 'r', label: 'Jari-jari', def: 3 }] },
  // ── 3D ─────────────────────────────────────────────
  { id: 'cube', label: 'Kubus', kind: '3d', params: [{ key: 'side', label: 'Rusuk', def: 3 }] },
  { id: 'cuboid', label: 'Balok', kind: '3d', params: [{ key: 'p', label: 'Panjang', def: 5 }, { key: 'l', label: 'Lebar', def: 3 }, { key: 't', label: 'Tinggi', def: 4 }] },
  { id: 'cylinder', label: 'Tabung', kind: '3d', params: [{ key: 'r', label: 'Jari-jari', def: 2 }, { key: 'h', label: 'Tinggi', def: 4 }] },
  { id: 'cone', label: 'Kerucut', kind: '3d', params: [{ key: 'r', label: 'Jari-jari', def: 2 }, { key: 'h', label: 'Tinggi', def: 4 }] },
  { id: 'sphere', label: 'Bola', kind: '3d', params: [{ key: 'r', label: 'Jari-jari', def: 2.5 }] },
  { id: 'tri_prism', label: 'Prisma Segitiga', kind: '3d', params: [{ key: 'base', label: 'Alas segitiga', def: 4 }, { key: 'height', label: 'Tinggi segitiga', def: 3 }, { key: 'depth', label: 'Kedalaman', def: 4 }] },
  { id: 'pyramid', label: 'Limas', kind: '3d', params: [{ key: 'base', label: 'Alas', def: 4 }, { key: 'height', label: 'Tinggi', def: 5 }] }
];

export function geometryShape(id: string): GeometryShapeDef | undefined {
  return GEOMETRY_SHAPES.find((s) => s.id === id);
}

function fmt(v: number): string {
  if (Object.is(v, -0)) v = 0;
  const r = Math.round(v * 1e4) / 1e4;
  return String(r);
}

// Pembulatan panjang sisi agar rapi (mis. 3.000 → "3", 2.5 → "2,5" → gunakan titik).
function fmtLen(v: number): string {
  if (Object.is(v, -0)) v = 0;
  return String(Math.round(v * 100) / 100);
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Jarak 2 titik (untuk label panjang sisi)
function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

interface Shape {
  // titik-titik sudut (urutan: mengelilingi bangun). Boleh kosong untuk lingkaran.
  pts: Pt[];
  // label sudut-sudut. Default: A, B, C, … sesuai urutan pts.
  // Untuk lingkaran/setengah lingkaran: label pusat O.
  center?: Pt;
  radius?: number;
  // daftar segmen garis tambahan (mis. jari-jari, diagonal) — tanpa huruf sudut
  extraLines?: { a: Pt; b: Pt }[];
  // tinggi (3D) → teks 3D di bagian bawah
  is3D?: boolean;
  // label pusat: "O"
  centerLabel?: string;
  // apakah sisi (garis penghubung pts) perlu diberi panjang
  dimSides?: boolean;
}

// Build 2D poligon dari param
function build2D(def: GeometryShapeDef, p: Record<string, number>): Shape {
  const s: Shape = { pts: [], dimSides: true };
  switch (def.id) {
    case 'square': {
      const s2 = p.side;
      s.pts = [{ x: 0, y: 0 }, { x: s2, y: 0 }, { x: s2, y: s2 }, { x: 0, y: s2 }];
      break;
    }
    case 'rectangle': {
      const w = p.w, h = p.h;
      s.pts = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
      break;
    }
    case 'triangle_right': {
      const a = p.a, b = p.b;
      s.pts = [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: 0, y: b }];
      break;
    }
    case 'triangle_isosceles': {
      const b2 = p.base, h = p.height;
      s.pts = [{ x: 0, y: 0 }, { x: b2, y: 0 }, { x: b2 / 2, y: h }];
      break;
    }
    case 'triangle_equilateral': {
      const s3 = p.side;
      s.pts = [{ x: 0, y: 0 }, { x: s3, y: 0 }, { x: s3 / 2, y: (Math.sqrt(3) / 2) * s3 }];
      break;
    }
    case 'parallelogram': {
      const b4 = p.base, h = p.height, sh = p.shift;
      s.pts = [{ x: 0, y: 0 }, { x: b4, y: 0 }, { x: b4 + sh, y: h }, { x: sh, y: h }];
      break;
    }
    case 'trapezoid': {
      const bot = p.bottom, top = p.top, h = p.height;
      const off = (bot - top) / 2;
      s.pts = [{ x: 0, y: 0 }, { x: bot, y: 0 }, { x: bot - off, y: h }, { x: off, y: h }];
      break;
    }
    case 'rhombus': {
      const d1 = p.d1, d2 = p.d2;
      s.pts = [{ x: d1 / 2, y: 0 }, { x: d1, y: d2 / 2 }, { x: d1 / 2, y: d2 }, { x: 0, y: d2 / 2 }];
      break;
    }
    case 'kite': {
      const w = p.w, h1 = p.h1, h2 = p.h2;
      s.pts = [{ x: 0, y: 0 }, { x: w / 2, y: h1 }, { x: 0, y: h1 + h2 }, { x: -w / 2, y: h1 }];
      break;
    }
    case 'circle': {
      s.pts = [];
      s.center = { x: 0, y: 0 };
      s.radius = p.r;
      s.centerLabel = 'O';
      s.extraLines = [{ a: { x: 0, y: 0 }, b: { x: p.r, y: 0 } }];
      s.dimSides = false;
      break;
    }
    case 'semicircle': {
      s.pts = [{ x: -p.r, y: 0 }, { x: p.r, y: 0 }];
      s.center = { x: 0, y: 0 };
      s.radius = p.r;
      s.centerLabel = 'O';
      s.extraLines = [{ a: { x: -p.r, y: 0 }, b: { x: 0, y: 0 } }, { a: { x: -p.r, y: 0 }, b: { x: p.r, y: 0 } }];
      s.dimSides = false;
      break;
    }
    default:
      s.pts = [];
  }
  return s;
}

// Proyeksi isometrik: (x,y,z) → (x', y'). z ke atas.
function iso(p: { x: number; y: number; z: number }): Pt {
  return { x: p.x - p.y, y: (p.x + p.y) / 2 - p.z };
}

// Build 3D → kumpulan garis + label
function build3D(def: GeometryShapeDef, p: Record<string, number>): { lines: { a: Pt; b: Pt; dashed?: boolean }[]; pts: Pt[]; dimLines: { a: Pt; b: Pt; value: number }[] } {
  const lines: { a: Pt; b: Pt; dashed?: boolean }[] = [];
  const pts: Pt[] = [];
  const dimLines: { a: Pt; b: Pt; value: number }[] = [];

  const seg = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, dashed = false) =>
    lines.push({ a: iso(a), b: iso(b), dashed });

  const mark = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
    dimLines.push({ a: iso(a), b: iso(b), value: dist(iso(a), iso(b)) });

  switch (def.id) {
    case 'cube': {
      const s = p.side;
      const pts3 = [
        { x: 0, y: 0, z: 0 }, { x: s, y: 0, z: 0 }, { x: s, y: s, z: 0 }, { x: 0, y: s, z: 0 }, // alas
        { x: 0, y: 0, z: s }, { x: s, y: 0, z: s }, { x: s, y: s, z: s }, { x: 0, y: s, z: s } // atas
      ];
      pts3.forEach((v) => pts.push(iso(v)));
      // alas
      seg(pts3[0], pts3[1]); seg(pts3[1], pts3[2]); seg(pts3[2], pts3[3]); seg(pts3[3], pts3[0]);
      // atas
      seg(pts3[4], pts3[5]); seg(pts3[5], pts3[6]); seg(pts3[6], pts3[7]); seg(pts3[7], pts3[4]);
      // tegak
      seg(pts3[0], pts3[4]); seg(pts3[1], pts3[5]); seg(pts3[2], pts3[6], true); seg(pts3[3], pts3[7]);
      mark(pts3[0], pts3[1]);
      mark(pts3[1], pts3[2]);
      mark(pts3[0], pts3[4]);
      break;
    }
    case 'cuboid': {
      const P = p.p, L = p.l, T = p.t;
      const pts3 = [
        { x: 0, y: 0, z: 0 }, { x: P, y: 0, z: 0 }, { x: P, y: L, z: 0 }, { x: 0, y: L, z: 0 },
        { x: 0, y: 0, z: T }, { x: P, y: 0, z: T }, { x: P, y: L, z: T }, { x: 0, y: L, z: T }
      ];
      pts3.forEach((v) => pts.push(iso(v)));
      seg(pts3[0], pts3[1]); seg(pts3[1], pts3[2]); seg(pts3[2], pts3[3]); seg(pts3[3], pts3[0]);
      seg(pts3[4], pts3[5]); seg(pts3[5], pts3[6]); seg(pts3[6], pts3[7]); seg(pts3[7], pts3[4]);
      seg(pts3[0], pts3[4]); seg(pts3[1], pts3[5]); seg(pts3[2], pts3[6], true); seg(pts3[3], pts3[7]);
      mark(pts3[0], pts3[1]);
      mark(pts3[1], pts3[2]);
      mark(pts3[0], pts3[4]);
      break;
    }
    case 'cylinder': {
      const r = p.r, h = p.h;
      // lingkaran alas & atas → poligon aproksimasi (elips isometrik)
      const N = 32;
      const bot: Pt[] = [];
      const top: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const v = { x: r * Math.cos(a), y: r * Math.sin(a), z: 0 };
        bot.push(iso(v));
        const v2 = { x: r * Math.cos(a), y: r * Math.sin(a), z: h };
        top.push(iso(v2));
      }
      // garis sisi: titik terjauh kiri/kanan dari elips
      const left = bot[Math.floor(N * 0.75)]; // arah y negatif (kiri dalam iso)
      const right = bot[Math.floor(N * 0.25)];
      seg({ x: left.x, y: left.y, z: 0 }, { x: left.x, y: left.y, z: h });
      seg({ x: right.x, y: right.y, z: 0 }, { x: right.x, y: right.y, z: h });
      // elips sebagai polyline
      pts.push(...bot, ...top);
      lines.push(...bot.slice(0, N).map((p2, i) => ({ a: p2, b: bot[i + 1] })));
      lines.push(...top.slice(0, N).map((p2, i) => ({ a: p2, b: top[i + 1] })));
      mark({ x: 0, y: 0, z: 0 }, { x: r, y: 0, z: 0 });
      mark({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: h });
      break;
    }
    case 'cone': {
      const r = p.r, h = p.h;
      const N = 32;
      const bot: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        bot.push(iso({ x: r * Math.cos(a), y: r * Math.sin(a), z: 0 }));
      }
      const apex = iso({ x: 0, y: 0, z: h });
      pts.push(apex, ...bot);
      const left = bot[Math.floor(N * 0.75)];
      const right = bot[Math.floor(N * 0.25)];
      seg({ x: left.x, y: left.y, z: 0 }, { x: 0, y: 0, z: h });
      seg({ x: right.x, y: right.y, z: 0 }, { x: 0, y: 0, z: h });
      lines.push(...bot.slice(0, N).map((p2, i) => ({ a: p2, b: bot[i + 1] })));
      mark({ x: 0, y: 0, z: 0 }, { x: r, y: 0, z: 0 });
      mark({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: h });
      break;
    }
    case 'sphere': {
      const r = p.r;
      const N = 40;
      const ring: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        ring.push(iso({ x: r * Math.cos(a), y: r * Math.sin(a), z: 0 }));
      }
      pts.push(...ring);
      lines.push(...ring.slice(0, N).map((p2, i) => ({ a: p2, b: ring[i + 1] })));
      // elips meridian
      const mer: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        mer.push(iso({ x: r * Math.cos(a), y: 0, z: r * Math.sin(a) }));
      }
      lines.push(...mer.slice(0, N).map((p2, i) => ({ a: p2, b: mer[i + 1], dashed: true })));
      const mer2: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        mer2.push(iso({ x: 0, y: r * Math.cos(a), z: r * Math.sin(a) }));
      }
      lines.push(...mer2.slice(0, N).map((p2, i) => ({ a: p2, b: mer2[i + 1], dashed: true })));
      mark({ x: 0, y: 0, z: 0 }, { x: r, y: 0, z: 0 });
      break;
    }
    case 'tri_prism': {
      const base = p.base, ht = p.height, dep = p.depth;
      const tri = [
        { x: 0, y: 0, z: 0 },
        { x: base, y: 0, z: 0 },
        { x: base / 2, y: 0, z: ht }
      ];
      const tri2 = tri.map((v) => ({ x: v.x, y: v.y + dep, z: v.z }));
      [...tri, ...tri2].forEach((v) => pts.push(iso(v)));
      seg(tri[0], tri[1]); seg(tri[1], tri[2]); seg(tri[2], tri[0]);
      seg(tri2[0], tri2[1]); seg(tri2[1], tri2[2]); seg(tri2[2], tri2[0]);
      seg(tri[0], tri2[0]); seg(tri[1], tri2[1], true); seg(tri[2], tri2[2]);
      mark(tri[0], tri[1]);
      mark(tri[0], tri2[0]);
      mark(tri[1], tri[2]);
      break;
    }
    case 'pyramid': {
      const base = p.base, ht = p.height;
      const s2 = base / 2;
      const base4 = [
        { x: -s2, y: -s2, z: 0 },
        { x: s2, y: -s2, z: 0 },
        { x: s2, y: s2, z: 0 },
        { x: -s2, y: s2, z: 0 }
      ];
      const apex = { x: 0, y: 0, z: ht };
      [...base4, apex].forEach((v) => pts.push(iso(v)));
      seg(base4[0], base4[1]); seg(base4[1], base4[2]); seg(base4[2], base4[3], true); seg(base4[3], base4[0]);
      seg(base4[0], apex); seg(base4[1], apex); seg(base4[2], apex, true); seg(base4[3], apex);
      mark(base4[0], base4[1]);
      mark(base4[1], base4[2]);
      mark({ x: 0, y: 0, z: 0 }, apex);
      break;
    }
    default:
      break;
  }
  return { lines, pts, dimLines };
}

// Hitung bounding box dari sekumpulan titik + radius (lingkaran)
function bounds(pts: Pt[], radius?: number): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const all = radius ? [...pts, { x: -radius, y: -radius }, { x: radius, y: radius }] : pts;
  for (const p of all) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!isFinite(minX)) { minX = -1; maxX = 1; }
  if (!isFinite(minY)) { minY = -1; maxY = 1; }
  if (maxX === minX) { maxX = minX + 1; }
  if (maxY === minY) { maxY = minY + 1; }
  return { minX, maxX, minY, maxY };
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface GeometryItem {
  shapeId: string;
  params: Record<string, number>;
  showVertices?: boolean;
  showSides?: boolean;
  labelStart?: string;
}

export interface GeometryOptions {
  items: GeometryItem[];
  columns?: number;
  width?: number;
  height?: number;
}

// Bangun inner-element SVG untuk satu bangun, muat dalam viewport w×h (sudah di-scale).
// `idSuffix` agar class/id unik bila dipakai banyak bangun dalam satu svg.
function renderItemInner(
  def: GeometryShapeDef,
  p: Record<string, number>,
  showVertices: boolean,
  showSides: boolean,
  w: number,
  h: number,
  labelStart = 'A'
): string[] {
  const parts: string[] = [];

  let shape: Shape = { pts: [] };
  let lines: { a: Pt; b: Pt; dashed?: boolean }[] = [];
  let dimLines: { a: Pt; b: Pt; value: number }[] = [];
  let allPts: Pt[] = [];
  let radius: number | undefined;

  if (def.kind === '2d') {
    shape = build2D(def, p);
    allPts = shape.pts;
    radius = shape.radius;
    // sisi poligon: hubungkan titik-titik sudut (urutan mengelilingi)
    for (let i = 0; i < shape.pts.length; i++) {
      lines.push({ a: shape.pts[i], b: shape.pts[(i + 1) % shape.pts.length] });
    }
    lines.push(...(shape.extraLines ?? []).map((l) => ({ a: l.a, b: l.b })));
    if (shape.center) {
      dimLines.push({ a: shape.center, b: { x: shape.center.x + (shape.radius ?? 0), y: shape.center.y }, value: shape.radius ?? 0 });
      allPts.push({ x: shape.center.x - (shape.radius ?? 0), y: shape.center.y - (shape.radius ?? 0) });
      allPts.push({ x: shape.center.x + (shape.radius ?? 0), y: shape.center.y + (shape.radius ?? 0) });
      radius = shape.radius;
    }
  } else {
    const r = build3D(def, p);
    lines = r.lines;
    dimLines = r.dimLines;
    allPts = r.pts;
  }

  const b = bounds(allPts, radius);
  const pad = 30;
  const scale = Math.min((w - pad * 2) / (b.maxX - b.minX), (h - pad * 2) / (b.maxY - b.minY));
  const ox = (w - (b.minX + b.maxX) * scale) / 2;
  const oy = (h - (b.minY + b.maxY) * scale) / 2;
  const sx = (x: number) => ox + x * scale;
  const sy = (y: number) => oy + y * scale;

  // Gambar segmen
  for (const l of lines) {
    const cls = l.dashed ? 'dashed' : '';
    parts.push(`<line class="${cls}" x1="${fmt(sx(l.a.x))}" y1="${fmt(sy(l.a.y))}" x2="${fmt(sx(l.b.x))}" y2="${fmt(sy(l.b.y))}"/>`);
  }

  // Lingkaran penuh / setengah lingkaran (busur atas)
  if (def.kind === '2d' && shape.center && shape.radius) {
    const r2 = shape.radius * scale;
    const cx = sx(shape.center.x);
    const cy = sy(shape.center.y);
    if (def.id === 'semicircle') {
      parts.push(`<path d="M ${fmt(cx - r2)} ${fmt(cy)} A ${fmt(r2)} ${fmt(r2)} 0 0 1 ${fmt(cx + r2)} ${fmt(cy)}" fill="none" stroke="#1e3a8a" stroke-width="2"/>`);
    } else {
      parts.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r2)}" fill="none" stroke="#1e3a8a" stroke-width="2"/>`);
    }
  }

  // Titik sudut
  if (showVertices) {
    if (def.kind === '2d' && shape.center && shape.centerLabel) {
      parts.push(`<text class="lbl" x="${fmt(sx(shape.center.x) + 8)}" y="${fmt(sy(shape.center.y) - 6)}">${shape.centerLabel}</text>`);
    }
    const skip3DLabels = def.kind === '3d' && (def.id === 'cylinder' || def.id === 'sphere' || def.id === 'cone');
    if (!skip3DLabels) {
      const labelTargets = def.kind === '2d' ? shape.pts : allPts;
      const labelN = def.kind === '3d' ? Math.min(labelTargets.length, def.id === 'tri_prism' || def.id === 'pyramid' ? 6 : 8) : labelTargets.length;
      const startIdx = Math.max(0, LETTERS.indexOf(labelStart.toUpperCase()));
      for (let i = 0; i < labelN; i++) {
        const pt = labelTargets[i];
        if (!pt) continue;
        const letter = LETTERS[startIdx + i] ?? `P${i + 1}`;
        parts.push(`<circle class="pt" cx="${fmt(sx(pt.x))}" cy="${fmt(sy(pt.y))}" r="2.5"/>`);
        const dy = i === 0 ? -10 : 10;
        parts.push(`<text class="lbl" x="${fmt(sx(pt.x) + 4)}" y="${fmt(sy(pt.y) + dy)}">${letter}</text>`);
      }
    }
  }

  // Panjang sisi
  if (showSides) {
    const drawDim = (a: Pt, b: Pt, value: number) => {
      const mx = sx((a.x + b.x) / 2);
      const my = sy((a.y + b.y) / 2);
      parts.push(`<text class="dimlabel" x="${fmt(mx)}" y="${fmt(my - 5)}" text-anchor="middle">${fmtLen(value)}</text>`);
    };
    if (def.kind === '2d' && shape.pts.length >= 2) {
      for (let i = 0; i < shape.pts.length; i++) {
        const a = shape.pts[i];
        const b = shape.pts[(i + 1) % shape.pts.length];
        drawDim(a, b, dist(a, b));
      }
    }
    for (const dl of dimLines) {
      drawDim(dl.a, dl.b, dl.value);
    }
  }

  return parts;
}

/**
 * Render satu atau lebih bangun geometri → string `<svg …>`.
 * Multi-object disusun dalam grid; tiap sel diberi keterangan (a), (b), (c), …
 * - `showVertices`: label titik sudut (A, B, C, …); lingkaran → pusat O.
 * - `showSides`: panjang sisi di tengah tiap garis (dihitung dari dimensi param).
 */
export function renderGeometry(opts: GeometryOptions): string {
  const W = opts.width ?? 480;
  const H = opts.height ?? 360;
  const items = opts.items.filter((it) => geometryShape(it.shapeId));
  if (!items.length) return '';

  const n = items.length;
  const cols = Math.max(1, Math.min(opts.columns ?? 0, n) || (n === 1 ? 1 : n <= 4 ? 2 : 3));
  const rows = Math.ceil(n / cols);
  const cellW = W / cols;
  const cellH = H / rows;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${items.length === 1 ? geometryShape(items[0].shapeId)!.label : 'Bangun geometri'}">`);
  parts.push(`<style>line{stroke:#1e3a8a;stroke-width:2;stroke-linecap:round}.dashed{stroke-dasharray:5 4}.dim{stroke:#94a3b8;stroke-width:1}.pt{fill:#1e3a8a}.lbl{font-family:Arial,sans-serif;font-size:14px;fill:#1e3a8a;font-style:italic}.dimlabel{font-family:Arial,sans-serif;font-size:11px;fill:#64748b}.caption{font-family:Arial,sans-serif;font-size:12px;fill:#334155}</style>`);

  items.forEach((it, idx) => {
    const def = geometryShape(it.shapeId)!;
    const showV = it.showVertices ?? true;
    const showS = it.showSides ?? false;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const inner = renderItemInner(def, it.params, showV, showS, cellW, cellH, it.labelStart);
    // sel grid
    parts.push(`<g transform="translate(${fmt(col * cellW)} ${fmt(row * cellH)})">`);
    // garis sel (border) agar jelas letak tiap bangun — tipis
    parts.push(`<rect x="2" y="2" width="${fmt(cellW - 4)}" height="${fmt(cellH - 4)}" fill="none" stroke="#e2e8f0" stroke-width="1" rx="4"/>`);
    parts.push(...inner);
    // keterangan huruf di pojok kiri atas sel
    const caption = `(${LETTERS[idx]?.toLowerCase()})`;
    parts.push(`<text class="caption" x="8" y="18">${caption}</text>`);
    parts.push(`</g>`);
  });

  parts.push('</svg>');
  return parts.join('');
}

/** Encode SVG → data URI base64 agar bisa dipakai sebagai src img (self-contained). */
export function geometryToDataUri(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}