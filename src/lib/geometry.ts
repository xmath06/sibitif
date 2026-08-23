// Generator bangun geometri 2D & 3D → SVG inline (self-contained di questionText).
// Label titik sudut otomatis (A, B, C, …) dan panjang sisi opsional (dihitung dari dimensi).
// Tanpa dependensi eksternal. Sudut-sudut yang berurutan diberi huruf sesuai arah gambar.

const TAU = Math.PI * 2;
// Margin (px) yang disisakan antara isi bangun dan tepi kanvas SVG agar
// goresan (stroke) & label tidak terpotong di pinggir.
const FREE_MARGIN = 1;

// Style SVG bersama (dipakai oleh renderGeometry, renderShapeSvg, renderScene).
export const GEOMETRY_STYLE = `<style>line{stroke:#1e3a8a;stroke-width:2;stroke-linecap:round}.dashed{stroke-dasharray:5 4}.edge{fill:none;stroke:#1e3a8a;stroke-width:2}.dim{stroke:#94a3b8;stroke-width:1}.pt{fill:#1e3a8a}.lbl{font-family:Arial,sans-serif;font-size:14px;fill:#1e3a8a;font-style:italic}.dimlabel{font-family:Arial,sans-serif;font-size:11px;fill:#64748b}.caption{font-family:Arial,sans-serif;font-size:12px;fill:#334155}</style>`;

interface Pt { x: number; y: number }
interface Pt3 { x: number; y: number; z: number }

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
      // Titik ujung hanya dipakai untuk diameter; busur digambar terpisah.
      s.pts = [];
      s.center = { x: 0, y: 0 };
      s.radius = p.r;
      s.centerLabel = 'O';
      s.extraLines = [{ a: { x: -p.r, y: 0 }, b: { x: p.r, y: 0 } }];
      s.dimSides = false;
      break;
    }
    default:
      s.pts = [];
  }
  return s;
}

// Proyeksi kabinet (dimetric): bidang depan (y=0) dalam bentuk asli, kedalaman (y)
// mundur miring ke kanan-atas, z ke atas. Semua 8 sudut bangun ruang terpisah → tidak
// ada yang bertumpuk. (Proyeksi isometrik lama memetakan sudut berlawanan kubus
// (0,0,0) & (s,s,s) ke titik yang sama → tampak segi enam.)
function iso(p: Pt3): Pt {
  return { x: p.x + p.y * 0.5, y: -p.z - p.y * 0.5 };
}

// Build 3D → kumpulan garis + label
function build3D(def: GeometryShapeDef, p: Record<string, number>): {
  lines: { a: Pt; b: Pt; dashed?: boolean }[];
  pts: Pt[];
  dimLines: { a: Pt; b: Pt; value: number }[];
  circles: { cx: number; cy: number; r: number }[];
  ellipses: { cx: number; cy: number; rx: number; ry: number }[];
  edgeLines: { a: Pt; b: Pt; value: number }[];
} {
  const lines: { a: Pt; b: Pt; dashed?: boolean }[] = [];
  const pts: Pt[] = [];
  const dimLines: { a: Pt; b: Pt; value: number }[] = [];
  const circles: { cx: number; cy: number; r: number }[] = [];
  const ellipses: { cx: number; cy: number; rx: number; ry: number }[] = [];
  const edgeLines: { a: Pt; b: Pt; value: number }[] = [];

  const seg = (a: Pt3, b: Pt3, dashed = false) =>
    lines.push({ a: iso(a), b: iso(b), dashed });

  const mark = (a: Pt3, b: Pt3) =>
    dimLines.push({ a: iso(a), b: iso(b), value: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) });

  switch (def.id) {
    case 'cube': {
      const s = p.side;
      const pts3 = [
        { x: 0, y: 0, z: 0 }, { x: s, y: 0, z: 0 }, { x: s, y: s, z: 0 }, { x: 0, y: s, z: 0 }, // alas
        { x: 0, y: 0, z: s }, { x: s, y: 0, z: s }, { x: s, y: s, z: s }, { x: 0, y: s, z: s } // atas
      ];
      pts3.forEach((v) => pts.push(iso(v)));
      // alas
      seg(pts3[0], pts3[1]); seg(pts3[1], pts3[2]); seg(pts3[2], pts3[3], true); seg(pts3[3], pts3[0], true);
      // atas
      seg(pts3[4], pts3[5]); seg(pts3[5], pts3[6]); seg(pts3[6], pts3[7]); seg(pts3[7], pts3[4]);
      // tegak
      seg(pts3[0], pts3[4]); seg(pts3[1], pts3[5]); seg(pts3[2], pts3[6]); seg(pts3[3], pts3[7], true);
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
      seg(pts3[0], pts3[1]); seg(pts3[1], pts3[2]); seg(pts3[2], pts3[3], true); seg(pts3[3], pts3[0], true);
      seg(pts3[4], pts3[5]); seg(pts3[5], pts3[6]); seg(pts3[6], pts3[7]); seg(pts3[7], pts3[4]);
      seg(pts3[0], pts3[4]); seg(pts3[1], pts3[5]); seg(pts3[2], pts3[6]); seg(pts3[3], pts3[7], true);
      mark(pts3[0], pts3[1]);
      mark(pts3[1], pts3[2]);
      mark(pts3[0], pts3[4]);
      break;
    }
    case 'cylinder': {
      const r = p.r, h = p.h;
      // lingkaran alas & atas (proyeksi kabinet lewat iso, koordinat unit
      // — konsisten dengan bangun 3D lainnya; tanpa offset 200/*40 agar
      // ukuran tabung sepadan di mode freeform/kanvas).
      const N = 32;
      const bot: Pt[] = [];
      const top: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const bx = r * Math.cos(a), by = r * Math.sin(a);
        bot.push(iso({ x: bx, y: by, z: 0 }));
        top.push(iso({ x: bx, y: by, z: h }));
      }
      // garis tegak sisi kiri & kanan
      seg({ x: -r, y: 0, z: 0 }, { x: -r, y: 0, z: h });
      seg({ x: r, y: 0, z: 0 }, { x: r, y: 0, z: h });
      pts.push(...bot, ...top);
      // busur alas: depan solid, belakang (y>0) putus-putus
      lines.push(...bot.slice(0, N).map((p2, i) => ({
        a: p2,
        b: bot[i + 1],
        dashed: Math.sin(((i + 0.5) / N) * TAU) > 0
      })));
      // busur atas: selalu solid
      lines.push(...top.slice(0, N).map((p2, i) => ({
        a: p2,
        b: top[i + 1],
        dashed: false
      })));
      // dimensi: jari-jari alas & tinggi
      mark({ x: 0, y: 0, z: 0 }, { x: r, y: 0, z: 0 });
      mark({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: h });
      // rusuk: jari-jari alas (bisa diberi label panjang)
      edgeLines.push({ a: iso({ x: 0, y: 0, z: 0 }), b: iso({ x: r, y: 0, z: 0 }), value: r });
      break;
    }
    case 'cone': {
      const r = p.r, h = p.h;
      const N = 32;
      const bot: Pt[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const bx = r * Math.cos(a), by = r * Math.sin(a);
        bot.push(iso({ x: bx, y: by, z: 0 }));
      }
      // puncak tepat di atas pusat alas
      const apex = { x: 0, y: 0, z: h };
      pts.push(iso(apex), ...bot);
      // dua garis pelukis (siluet) dari puncak ke ujung kiri/kanan alas
      seg(apex, { x: -r, y: 0, z: 0 });
      seg(apex, { x: r, y: 0, z: 0 });
      // busur alas: depan (sin a < 0) solid, belakang (sin a > 0) putus-putus
      lines.push(...bot.slice(0, N).map((p2, i) => ({
        a: p2,
        b: bot[i + 1],
        dashed: Math.sin(((i + 0.5) / N) * TAU) > 0
      })));
      // dimensi: jari-jari alas & tinggi
      mark({ x: 0, y: 0, z: 0 }, { x: r, y: 0, z: 0 });
      mark({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: h });
      // rusuk: jari-jari alas (bisa diberi label panjang)
      edgeLines.push({ a: iso({ x: 0, y: 0, z: 0 }), b: iso({ x: r, y: 0, z: 0 }), value: r });
      break;
    }
    case 'sphere': {
      const r = p.r;
      // Bola digambar sebagai lingkaran (siluet) + 2 elips internal (ekuator & meridian)
      // agar terbaca sebagai bangun ruang, bukan sekadar lingkaran datar.
      // Titik ±r di ruang unit dipakai agar bounds() mencakup seluruh lingkaran.
      pts.push({ x: r, y: r }, { x: -r, y: -r }, { x: r, y: -r }, { x: -r, y: r });
      circles.push({ cx: 0, cy: 0, r });
      ellipses.push({ cx: 0, cy: 0, rx: r, ry: r * 0.34 });
      ellipses.push({ cx: 0, cy: 0, rx: r * 0.34, ry: r });
      // jari-jari dari pusat ke tepi kanan lingkaran
      mark({ x: 0, y: 0, z: 0 }, { x: r, y: 0, z: 0 });
      // rusuk: jari-jari bola (bisa diberi label panjang)
      edgeLines.push({ a: { x: 0, y: 0 }, b: { x: r, y: 0 }, value: r });
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
      seg(tri2[0], tri2[1], true); seg(tri2[1], tri2[2], true); seg(tri2[2], tri2[0], true);
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
  return { lines, pts, dimLines, circles, ellipses, edgeLines };
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

// Pusat rata-rata dari sekumpulan titik (untuk arah label menjauh dari bangun).
function centroid(pts: Pt[]): Pt {
  if (!pts.length) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

export interface GeometryItem {
  shapeId: string;
  params: Record<string, number>;
  showVertices?: boolean;
  showSides?: boolean;
  showEdgeLengths?: boolean;
  skipLabels?: boolean;
  labelStart?: string;
}

export interface GeometryOptions {
  items: GeometryItem[];
  columns?: number;
  width?: number;
  height?: number;
}

function resolvedParams(def: GeometryShapeDef, params: Record<string, number>): Record<string, number> {
  return Object.fromEntries(def.params.map((param) => {
    const value = params[param.key];
    return [param.key, Number.isFinite(value) && value > 0 ? value : param.def];
  }));
}

// Bangun inner-element SVG untuk satu bangun, muat dalam viewport w×h (sudah di-scale).
export interface LabelInfo {
  px: number; // posisi titik sudut (koordinat box)
  py: number;
  ax: number; // posisi anchor teks (sudah di-offset)
  ay: number;
  anchor: string;
  fixed?: string; // teks tetap (mis. 'O' untuk pusat lingkaran)
}

/** Kumpulkan info titik sudut yang akan diberi label, memakai sx/sy yang diberi. */
function collectLabels(
  def: GeometryShapeDef,
  p: Record<string, number>,
  sx: (x: number) => number,
  sy: (y: number) => number
): LabelInfo[] {
  const safe = resolvedParams(def, p);
  let shape: Shape = { pts: [] };
  let allPts: Pt[] = [];
  let center: Pt | undefined;
  let centerLabel: string | undefined;
  if (def.kind === '2d') {
    shape = build2D(def, safe);
    allPts = shape.pts;
    center = shape.center;
    centerLabel = shape.centerLabel;
  } else {
    const r = build3D(def, safe);
    allPts = r.pts;
  }
  const out: LabelInfo[] = [];
  const skipVertex = def.kind === '2d' && (def.id === 'circle' || def.id === 'semicircle');
  const skip3D = def.kind === '3d' && (def.id === 'cylinder' || def.id === 'sphere' || def.id === 'cone');
  if (!skipVertex && !skip3D) {
    const targets = def.kind === '2d' ? shape.pts : allPts;
    const n = def.kind === '3d' ? Math.min(targets.length, def.id === 'tri_prism' || def.id === 'pyramid' ? 6 : 8) : targets.length;
    const cx = centroid(targets).x;
    const cy = centroid(targets).y;
    for (let i = 0; i < n; i++) {
      const pt = targets[i];
      if (!pt) continue;
      const px = sx(pt.x);
      const py = sy(pt.y);
      let vx = px - sx(cx);
      let vy = py - sy(cy);
      const len = Math.hypot(vx, vy);
      if (len < 1e-6) {
        vx = 14;
        vy = -14;
      } else {
        vx = (vx / len) * 18;
        vy = (vy / len) * 18;
      }
      let anchor = 'middle';
      if (vx > 6) anchor = 'start';
      else if (vx < -6) anchor = 'end';
      out.push({ px, py, ax: px + vx, ay: py + vy + 4, anchor });
    }
  }
  if (def.kind === '2d' && center && centerLabel) {
    out.push({ px: sx(center.x), py: sy(center.y), ax: sx(center.x) + 8, ay: sy(center.y) - 6, anchor: 'middle', fixed: centerLabel });
  }
  if (def.kind === '3d' && def.id === 'sphere') {
    // Pusat bola = titik asal (0,0,0) → koordinat unit (0,0)
    out.push({ px: sx(0), py: sy(0), ax: sx(0) + 8, ay: sy(0) - 6, anchor: 'middle', fixed: 'O' });
  }
  return out;
}

// `idSuffix` agar class/id unik bila dipakai banyak bangun dalam satu svg.
function renderItemInner(
  def: GeometryShapeDef,
  p: Record<string, number>,
  showVertices: boolean,
  showSides: boolean,
  w: number,
  h: number,
  labelStart = 'A',
  pxPerUnit?: number,
  skipLabels = false,
  showEdgeLengths = false
): string[] {
  const parts: string[] = [];
  const safeParams = resolvedParams(def, p);

  let shape: Shape = { pts: [] };
  let lines: { a: Pt; b: Pt; dashed?: boolean }[] = [];
  let dimLines: { a: Pt; b: Pt; value: number }[] = [];
  let allPts: Pt[] = [];
  let circles: { cx: number; cy: number; r: number }[] = [];
  let ellipses: { cx: number; cy: number; rx: number; ry: number }[] = [];
  let edgeLines: { a: Pt; b: Pt; value: number }[] = [];
  let radius: number | undefined;

  if (def.kind === '2d') {
    shape = build2D(def, safeParams);
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
    const r = build3D(def, safeParams);
    lines = r.lines;
    dimLines = r.dimLines;
    allPts = r.pts;
    circles = r.circles;
    ellipses = r.ellipses;
    edgeLines = r.edgeLines;
  }

  const b = bounds(allPts, radius);
  let sx: (x: number) => number;
  let sy: (y: number) => number;
  let scale = 1;
  if (pxPerUnit && pxPerUnit > 0) {
    // mode freeform: koordinat natural × pxPerUnit, dengan margin agar tak terpotong
    const P = pxPerUnit;
    scale = P;
    const ox = FREE_MARGIN - b.minX * scale;
    const oy = FREE_MARGIN - b.minY * scale;
    sx = (x) => ox + x * scale;
    sy = (y) => oy + y * scale;
  } else {
    const pad = 30;
    scale = Math.min((w - pad * 2) / (b.maxX - b.minX), (h - pad * 2) / (b.maxY - b.minY));
    const ox = (w - (b.minX + b.maxX) * scale) / 2;
    const oy = (h - (b.minY + b.maxY) * scale) / 2;
    sx = (x) => ox + x * scale;
    sy = (y) => oy + y * scale;
  }

  // Gambar segmen
  for (const l of lines) {
    const cls = l.dashed ? 'dashed' : '';
    parts.push(`<line class="${cls}" x1="${fmt(sx(l.a.x))}" y1="${fmt(sy(l.a.y))}" x2="${fmt(sx(l.b.x))}" y2="${fmt(sy(l.b.y))}"/>`);
  }

  // Lingkaran & elips (bola) — bangun ruang
  for (const c of circles) {
    parts.push(`<circle class="edge" cx="${fmt(sx(c.cx))}" cy="${fmt(sy(c.cy))}" r="${fmt(c.r * scale)}"/>`);
  }
  for (const e of ellipses) {
    parts.push(`<ellipse class="edge" cx="${fmt(sx(e.cx))}" cy="${fmt(sy(e.cy))}" rx="${fmt(e.rx * scale)}" ry="${fmt(e.ry * scale)}"/>`);
  }

  // Rusuk (jari-jari) tabung(alas)/kerucut/bola + label panjangnya
  if (showEdgeLengths) {
    for (const el of edgeLines) {
      parts.push(`<line class="edge" x1="${fmt(sx(el.a.x))}" y1="${fmt(sy(el.a.y))}" x2="${fmt(sx(el.b.x))}" y2="${fmt(sy(el.b.y))}"/>`);
      const mx = (el.a.x + el.b.x) / 2;
      const my = (el.a.y + el.b.y) / 2;
      const dx = el.b.x - el.a.x;
      const dy = el.b.y - el.a.y;
      const dl = Math.hypot(dx, dy) || 1;
      const ox = (-dy / dl) * 12;
      const oy = (dx / dl) * 12;
      parts.push(`<text class="dimlabel" x="${fmt(sx(mx) + ox)}" y="${fmt(sy(my) + oy + 4)}" text-anchor="middle">${fmtLen(el.value)}</text>`);
    }
  }

  // Lingkaran penuh / setengah lingkaran (busur atas)
  if (def.kind === '2d' && shape.center && shape.radius) {
    const r2 = shape.radius * scale;
    const cx = sx(shape.center.x);
    const cy = sy(shape.center.y);
    if (def.id === 'semicircle') {
      // SVG y grows downward; sweep=0 makes the arc rise above the diameter.
      parts.push(`<path d="M ${fmt(cx - r2)} ${fmt(cy)} A ${fmt(r2)} ${fmt(r2)} 0 0 0 ${fmt(cx + r2)} ${fmt(cy)}" fill="none" stroke="#1e3a8a" stroke-width="2"/>`);
    } else {
      parts.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r2)}" fill="none" stroke="#1e3a8a" stroke-width="2"/>`);
    }
  }

  // Titik sudut
  if (showVertices) {
    const infos = collectLabels(def, safeParams, sx, sy);
    const startIdx = Math.max(0, LETTERS.indexOf(labelStart.toUpperCase()));
    infos.forEach((info, i) => {
      // titik sudut (dot) selalu digambar sebagai bagian geometri
      parts.push(`<circle class="pt" cx="${fmt(info.px)}" cy="${fmt(info.py)}" r="2.5"/>`);
      if (skipLabels) return; // teks label dipindah ke overlay scene (lihat computeSceneLabels)
      const letter = info.fixed ?? LETTERS[startIdx + i] ?? `P${i + 1}`;
      parts.push(
        `<text class="lbl" x="${fmt(info.ax)}" y="${fmt(info.ay)}" text-anchor="${info.anchor}">${letter}</text>`
      );
    });
  }

  // Panjang sisi
  if (showSides) {
    const drawDim = (a: Pt, b: Pt, value: number) => {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // offset tegak lurus sisi agar angka tidak menimpa garis
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dl = Math.hypot(dx, dy) || 1;
      const ox = (-dy / dl) * 12;
      const oy = (dx / dl) * 12;
      parts.push(`<text class="dimlabel" x="${fmt(sx(mx) + ox)}" y="${fmt(sy(my) + oy + 4)}" text-anchor="middle">${fmtLen(value)}</text>`);
    };
    if (def.kind === '2d' && shape.pts.length >= 2) {
      for (let i = 0; i < shape.pts.length; i++) {
        const a = shape.pts[i];
        const b = shape.pts[(i + 1) % shape.pts.length];
        drawDim(a, b, dist(a, b));
      }
    }
    if (def.id === 'semicircle' && shape.radius) {
      drawDim({ x: -shape.radius, y: 0 }, { x: shape.radius, y: 0 }, shape.radius * 2);
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
  parts.push(GEOMETRY_STYLE);

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

// ─────────────────────────────────────────────────────────────────────────────
// Model scene untuk kanvas interaktif: tiap bangun adalah objek bebas yang bisa
// di-drag, di-skala, dan dijadikan parent/child (objek di dalam objek).
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoSceneItem {
  id: string;
  shapeId: string;
  params: Record<string, number>;
  x: number; // posisi di kanvas (px). Untuk child: relatif terhadap parent.
  y: number;
  scale: number; // faktor skala (1 = ukuran natural)
  rotation?: number; // rotasi (derajat), searah jarum jam
  parentId?: string; // hierarki parent-child
  showVertices?: boolean;
  showSides?: boolean;
  showEdgeLengths?: boolean;
  labelStart?: string;
  z?: number; // urutan tumpuk (kecil = belakang)
}

export interface GeoScene {
  width: number;
  height: number;
  items: GeoSceneItem[];
}

function uid(): string {
  return 'g' + Math.random().toString(36).slice(2, 9);
}

export function emptyScene(width = 520, height = 380): GeoScene {
  return { width, height, items: [] };
}

/** Ukuran piksel natural sebuah bangun (sebelum posisi/skala kanvas diterapkan). */
export function shapePixelSize(item: GeometryItem, pxPerUnit = 24): { w: number; h: number } {
  const def = geometryShape(item.shapeId);
  if (!def) return { w: 0, h: 0 };
  const p = resolvedParams(def, item.params ?? {});
  const pts = def.kind === '2d' ? build2D(def, p).pts : build3D(def, p).pts;
  const b = bounds(pts);
  return {
    w: (b.maxX - b.minX) * pxPerUnit + 2 * FREE_MARGIN,
    h: (b.maxY - b.minY) * pxPerUnit + 2 * FREE_MARGIN
  };
}

/** Jumlah titik sudut yang akan diberi label pada sebuah bangun (untuk penomoran unik). */
export function geometryLabelCount(shapeId: string, params: Record<string, number> | undefined): number {
  const def = geometryShape(shapeId);
  if (!def) return 0;
  const p = resolvedParams(def, params ?? {});
  if (def.kind === '2d') {
    if (def.id === 'circle' || def.id === 'semicircle') return 0;
    return build2D(def, p).pts.length;
  }
  if (def.id === 'cylinder' || def.id === 'sphere' || def.id === 'cone') return 0;
  const n = build3D(def, p).pts.length;
  return def.id === 'tri_prism' || def.id === 'pyramid' ? Math.min(n, 6) : Math.min(n, 8);
}

/** Huruf ke-i untuk penomoran titik se-scene (A..Z, lalu A1, B1, …). */
export function sceneLabelAt(index: number): string {
  const base = LETTERS[index % LETTERS.length] ?? 'A';
  const tier = Math.floor(index / LETTERS.length);
  return tier === 0 ? base : `${base}${tier}`;
}

/** Render satu bangun menjadi SVG berdiri sendiri (ukuran natural × pxPerUnit). */
export function renderShapeSvg(item: GeometryItem, pxPerUnit = 24): string {
  const def = geometryShape(item.shapeId);
  if (!def) return '';
  const p = resolvedParams(def, item.params ?? {});
  const parts = renderItemInner(def, p, item.showVertices ?? true, item.showSides ?? false, 0, 0, item.labelStart ?? 'A', pxPerUnit, item.skipLabels ?? false, item.showEdgeLengths ?? false);
  const { w, h } = shapePixelSize(item, pxPerUnit);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}">${GEOMETRY_STYLE}${parts.join('')}</svg>`;
}

/** Posisi absolut (termasuk transform parent) dari sebuah item di kanvas. */
export function resolveItemPos(scene: GeoScene, it: GeoSceneItem): { x: number; y: number; scale: number } {
  const byId = new Map(scene.items.map((x) => [x.id, x]));
  const seen = new Set<string>();
  let x = it.x, y = it.y, s = it.scale;
  let p = it.parentId ? byId.get(it.parentId) : undefined;
  while (p && !seen.has(p.id)) {
    seen.add(p.id);
    x += p.x;
    y += p.y;
    s *= p.scale;
    p = p.parentId ? byId.get(p.parentId) : undefined;
  }
  return { x, y, scale: s };
}

/** Render seluruh scene menjadi satu SVG statis (untuk tampilan siswa / ekspor). */
function freeformMapping(def: GeometryShapeDef, params: Record<string, number>, ppu: number) {
  const p = resolvedParams(def, params);
  let shape: Shape = { pts: [] };
  let allPts: Pt[] = [];
  let radius: number | undefined;
  if (def.kind === '2d') {
    shape = build2D(def, p);
    allPts = shape.pts;
    radius = shape.radius;
  } else {
    const r = build3D(def, p);
    allPts = r.pts;
  }
  const b = bounds(allPts, radius);
  const scale = ppu;
  const ox = -b.minX * scale;
  const oy = -b.minY * scale;
  return { sx: (x: number) => ox + x * scale, sy: (y: number) => oy + y * scale };
}

export interface SceneLabel {
  x: number;
  y: number;
  letter: string;
  anchor: string;
}

/**
 * Hitung label titik sudut seluruh scene dalam koordinat scene (tidak ter-rotasi).
 * Titik dari bangun berbeda yang berimpit (mis. dua bangun menyatu) digabung
 * menjadi SATU huruf. Hasil ini dirender di lapisan terpisah agar huruf selalu
 * tegak (tidak ikut rotasi objek).
 */
export function computeSceneLabels(scene: GeoScene, ppu = 24): SceneLabel[] {
  type Raw = { id: string; sx: number; sy: number; ax: number; ay: number; anchor: string; letter?: string };
  const raw: Raw[] = [];
  for (const it of [...scene.items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))) {
    const def = geometryShape(it.shapeId);
    if (!def) continue;
    const { sx, sy } = freeformMapping(def, it.params, ppu);
    const infos = collectLabels(def, it.params, sx, sy);
    const { w, h } = shapePixelSize(
      { shapeId: it.shapeId, params: it.params, showVertices: it.showVertices, showSides: it.showSides, skipLabels: true },
      ppu
    );
    const ap = resolveItemPos(scene, it);
    const rot = ((it.rotation ?? 0) * Math.PI) / 180;
    const sc = ap.scale;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    for (const info of infos) {
      const lx = (info.px - w / 2) * sc;
      const ly = (info.py - h / 2) * sc;
      const rx = lx * cos - ly * sin;
      const ry = lx * sin + ly * cos;
      const sxS = ap.x + w / 2 + rx;
      const syS = ap.y + h / 2 + ry;
      const vx = info.ax - info.px;
      const vy = info.ay - info.py;
      const rxo = vx * cos - vy * sin;
      const ryo = vx * sin + vy * cos;
      raw.push({ id: it.id, sx: sxS, sy: syS, ax: sxS + rxo, ay: syS + ryo, anchor: info.anchor, letter: info.fixed });
    }
  }
  // Gabungkan titik berimpit antar bangun berbeda → satu huruf.
  const groups: { id: string; sx: number; sy: number; items: Raw[] }[] = [];
  for (const r of raw) {
    const g = groups.find((gr) => gr.id !== r.id && Math.hypot(gr.sx - r.sx, gr.sy - r.sy) < 8);
    if (g) g.items.push(r);
    else groups.push({ id: r.id, sx: r.sx, sy: r.sy, items: [r] });
  }
  let counter = 0;
  return groups.map((g) => {
    const fixed = g.items.find((i) => i.letter)?.letter;
    const letter = fixed ?? sceneLabelAt(counter++);
    const ax = g.items.reduce((s, i) => s + i.ax, 0) / g.items.length;
    const ay = g.items.reduce((s, i) => s + i.ay, 0) / g.items.length;
    return { x: ax, y: ay, letter, anchor: g.items[0].anchor };
  });
}

export function renderScene(scene: GeoScene, pxPerUnit = 24): string {
  const order = [...scene.items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const inner = order
    .map((it) => {
      const { x, y, scale } = resolveItemPos(scene, it);
      const svg = renderShapeSvg(
        { shapeId: it.shapeId, params: it.params, showVertices: it.showVertices, showSides: it.showSides, showEdgeLengths: it.showEdgeLengths, skipLabels: true },
        pxPerUnit
      );
      const core = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      const rot = it.rotation ?? 0;
      // Putar & skala terhadap PUSAT bangun (bukan pojok), agar sesuai pratinjau.
      const { w, h } = shapePixelSize(
        { shapeId: it.shapeId, params: it.params, showVertices: it.showVertices, showSides: it.showSides, skipLabels: true },
        pxPerUnit
      );
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `<g transform="translate(${fmt(cx)} ${fmt(cy)}) rotate(${fmt(rot)}) scale(${fmt(scale)}) translate(${fmt(-w / 2)} ${fmt(-h / 2)})">${core}</g>`;
    })
    .join('');
  // Label dirender di lapisan terpisah (tidak ter-rotasi) dan digabung bila berimpit.
  const labels = computeSceneLabels(scene, pxPerUnit)
    .map((l) => `<text class="lbl" x="${fmt(l.x)}" y="${fmt(l.y)}" text-anchor="${l.anchor}">${l.letter}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" width="${scene.width}" height="${scene.height}" role="img" aria-label="Bangun geometri">${GEOMETRY_STYLE}<g>${inner}</g><g class="labels">${labels}</g></svg>`;
}

export function sceneToDataUri(scene: GeoScene): string {
  return geometryToDataUri(renderScene(scene));
}

/** Tambah bangun ke scene (dengan posisi berjenjang agar tak tumpang tindih persis). */
export function addSceneItem(scene: GeoScene, shapeId: string, params: Record<string, number>, opts?: Partial<GeoSceneItem>): GeoScene {
  const def = geometryShape(shapeId);
  if (!def) return scene;
  const it: GeoSceneItem = {
    id: uid(),
    shapeId,
    params: resolvedParams(def, params ?? {}),
    x: 40 + (scene.items.length % 6) * 30,
    y: 40 + (scene.items.length % 6) * 24,
    scale: 1,
    rotation: 0,
    showVertices: true,
    showSides: false,
    labelStart: 'A',
    ...opts
  };
    return { ...scene, items: [...scene.items, it] };
}

/**
 * Sesuaikan ukuran canvas dengan isi: pangkas layar kosong dan pastikan semua
 * bangun muat. Geser semua item sejauh yang sama agar posisi relatif (termasuk
 * hubungan parent) tetap terjaga.
 */
export function fitSceneToContent(scene: GeoScene, ppu = 24, doShift = true): GeoScene {
  if (!scene.items.length) return { ...scene, width: 320, height: 240 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of scene.items) {
    const ap = resolveItemPos(scene, it);
    const { w, h } = shapePixelSize(
      { shapeId: it.shapeId, params: it.params, showVertices: it.showVertices, showSides: it.showSides, skipLabels: true },
      ppu
    );
    const hw = (w * ap.scale) / 2;
    const hh = (h * ap.scale) / 2;
    minX = Math.min(minX, ap.x - hw);
    minY = Math.min(minY, ap.y - hh);
    maxX = Math.max(maxX, ap.x + hw);
    maxY = Math.max(maxY, ap.y + hh);
  }
  const margin = 24;
  // Geser hanya bila diminta, atau bila isi keluar dari kiri/atas (tak bisa negatif).
  const needShift = !doShift && (minX < 0 || minY < 0);
  const shiftX = doShift || needShift ? margin - minX : 0;
  const shiftY = doShift || needShift ? margin - minY : 0;
  return {
    ...scene,
    width: Math.max(240, Math.ceil(maxX + shiftX + margin)),
    height: Math.max(200, Math.ceil(maxY + shiftY + margin)),
    items: scene.items.map((it) => ({ ...it, x: it.x + shiftX, y: it.y + shiftY }))
  };
}

/**
 * Ubah ukuran kanvas agar muat semua bangun, TANPA menggeser objek apa pun.
 * Dipakai saat mengedit transform satu bangun (X/Y/skala/rotasi) agar bangun
 * lainnya tidak ikut berpindah.
 */
export function resizeCanvasToContent(scene: GeoScene, ppu = 24): GeoScene {
  if (!scene.items.length) return { ...scene, width: 320, height: 240 };
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of scene.items) {
    const ap = resolveItemPos(scene, it);
    const { w, h } = shapePixelSize(
      { shapeId: it.shapeId, params: it.params, showVertices: it.showVertices, showSides: it.showSides, skipLabels: true },
      ppu
    );
    maxX = Math.max(maxX, ap.x + (w * ap.scale) / 2);
    maxY = Math.max(maxY, ap.y + (h * ap.scale) / 2);
  }
  const margin = 24;
  return {
    ...scene,
    width: Math.max(240, Math.ceil(Math.max(maxX, 0) + margin)),
    height: Math.max(200, Math.ceil(Math.max(maxY, 0) + margin))
  };
}

