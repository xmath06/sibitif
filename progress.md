# progress.md — CBT Frontend

> Dibuat 2026-08-27. Catatan continuity lintas sesi.

## Repo & Status
- Repo: `git@github.com:xmath06/sibitif.git`.
- Stack: SvelteKit 2 (adapter-static SPA, `ssr=false`) + Svelte 5 runes +
  Tailwind 3 + Tiptap.
- Status: **DIBANGUN**. Build: `bun run dev` (5173), `bun run check`,
  `bun run build` → `build/`. Deploy: Cloudflare Pages.

## Branch Strategy (PENTING)
- `main` = **v1 (scoring)** — FROZEN. `v2` = branch fitur (ikuti backend).
- ⚠️ **Launcher meng-clone `main` (v1)** saat build. Jika produk harus berisi v2,
  CI launcher harus diubah clone branch `v2`.

## Konvensi (singkat — lihat AGENTS.md untuk lengkap)
- Semua request lewat `src/lib/api/client.ts` (`credentials:"include"`,
  refresh token sekali lalu ulangi).
- Envelope `{success,data}` tp beberapa endpoint array/objek mentah.
- Render soal via `<Html html={...}/>` (KaTeX) — jangan strip HTML.
- Timer ujian dari `deadlineAt` (server-synced); poll `/exams/:id/time`.
- Svelte 5: jangan mutasi `$state` saat render (error `state_unsafe_mutation`).
- API client base = **relative** `/api/v1` (same-origin).

## Open Items / Gap
1. **Upload gambar editor bergantung S3/R2** — belum terkonfigurasi → gagal.
2. **Pastikan API relative saat di-build Launcher**: Launcher mem-proxy `/api`
   → backend (same-origin). Frontend tidak boleh di-lock ke `PUBLIC_API_URL`
   absolut (`http://localhost:3000`), agar proxy jalan. Verifikasi saat uji
   portable/installer di Windows.
3. Fitur kelas (proyektor live SSE, pause/resume/add-time) sudah ada di API;
   pastikan UI konsumsi SSE double-wrapped `data:{"data":{…}}`.

## Catatan Launcher
- Launcher menjalankan `bun run build` frontend saat "Install Launcher"
  (runtime, di folder backend/frontend yang di-bundle/portable).
- Frontend diharap panggil relative `/api/v1` → diteruskan proxy ke backend.
