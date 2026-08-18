# CBT & LMS Frontend

Frontend SPA untuk aplikasi **Computer Based Test (CBT)** & **LMS** — SvelteKit (SSR dimatikan, static SPA) + Tailwind.

| Layer            | Teknologi                                                       |
| ---------------- | --------------------------------------------------------------- |
| Framework        | [SvelteKit](https://kit.svelte.dev) 2.x (adapter-static, SPA)   |
| Language/UI      | Svelte 5 (runes `$state`) + Tailwind CSS 3                      |
| Rich Text        | [Tiptap](https://tiptap.dev) + [MathLive](https://cortexjs.io/mathlive/) + [KaTeX](https://katex.org) |
| Auth             | HTTP-only cookie (JWT) — frontend tidak menyentuh token         |
| Deploy           | [Cloudflare Pages](https://pages.cloudflare.com) (via Wrangler) |

---

## Setup

```bash
cd frontend
cp .env.example .env       # isi PUBLIC_API_URL (default http://localhost:3000)
bun install
bun run dev                # http://localhost:5173
```

Backend harus berjalan di `PUBLIC_API_URL`. Daftarkan origin frontend di `CORS_ORIGIN` backend.

## Perintah

```bash
bun run dev        # dev server (watch) → http://localhost:5173
bun run check      # svelte-check (WAJIB 0 error sebelum selesai)
bun run build      # build SPA ke /build (jalankan check dulu)
bun run preview    # preview build
bun run deploy     # wrangler pages deploy build (Cloudflare Pages)
```

## Environment Variables

| Variable             | Keterangan                                                       |
| -------------------- | ---------------------------------------------------------------- |
| `PUBLIC_API_URL`     | Base URL backend API (tanpa trailing slash). Di production set ke URL backend. |
| `PUBLIC_APP_ORIGIN`  | Origin frontend (untuk didaftarkan di `CORS_ORIGIN` backend).    |

> Semua var publik dirender di client (prefix `PUBLIC_`). **Jangan** simpan secret di sini.

---

## Struktur Folder

```
frontend/src/
├── app.css                    # Tailwind + styling KaTeX, tabel, editor
├── app.html
├── lib/
│   ├── api/client.ts          # fetch wrapper: credentials include + envelope
│   ├── components/
│   │   ├── RichTextEditor.svelte  # Tiptap: teks, tabel, rumus, gambar
│   │   ├── Html.svelte            # Render rich-text + renderMath (KaTeX)
│   │   ├── ExamSheet.svelte       # Halaman kerjakan ujian (timer, auto-save)
│   │   ├── ProjectorView.svelte   # Layar proyektor live (SSE)
│   │   ├── ScheduleForm.svelte    # Form jadwal + targeting
│   │   ├── QuestionNavigator.svelte
│   │   ├── ExcelImportButton.svelte
│   │   └── ui/                    # Button, Card, Badge, Progress
│   ├── excel.ts / imports.ts      # Import Excel (soal, paket, kelas, siswa)
│   ├── math.ts                    # Svelte action renderMath → KaTeX
│   └── routing.ts / stores / utils.ts
└── routes/                    # Halaman: login, student/*, teacher/*, admin/*
```

---

## Autentikasi & Session

- JWT disimpan di **HTTP-only cookie** oleh backend (`access_token` + `refresh_token`).
- Semua request memakai `credentials: "include"` (lihat `lib/api/client.ts`).
- Saat API balas **401** → panggil `POST /api/v1/auth/refresh` sekali, lalu ulangi request.
- Logout memanggil `POST /api/v1/auth/logout` (backend hapus cookie).

## Kontrak API (perbedaan yang harus ditangani)

Sebagian besar endpoint membungkus respons dengan `{ success, data }`, tapi beberapa **tidak**:

| Endpoint                     | Bentuk                                             |
| ---------------------------- | -------------------------------------------------- |
| `GET /questions?topicId=`    | **array mentah** (bukan `{data}`)                  |
| `GET /grading/:studentExamId`| objek mentah student_exam                          |
| `GET /student/schedules/active`, `/my/schedules` | array mentah            |
| `POST /schedules`            | objek mentah schedule                              |

Pola aman di frontend: `const res = raw as any; const data = res?.data ?? res;` dan untuk array: `Array.isArray(res) ? res : res?.data ?? []`.

Drizzle `numeric` dikirim sebagai **string** dari backend — konversi ke number saat ditampilkan.

---

## Rich Text & Persamaan Matematika

- **RichTextEditor** (Tiptap): bold/italic/heading, list, gambar (upload → S3), **tabel** (tombol `Sisipkan tabel 3×3`, mini-toolbar `+ Baris / + Kolom / Hapus`), dan **rumus** via MathLive (Σ).
- Rumus disimpan sebagai `<span class="math-latex" data-latex="…">` di dalam HTML soal.
- **Html.svelte** merender HTML apa adanya lalu menjalankan action `renderMath` (`lib/math.ts`) yang mengganti setiap `.math-latex` menjadi KaTeX.
- **Jangan pernah strip HTML soal** dengan `replace(/<[^>]*>/g,'')` untuk ditampilkan — itu menghancurkan rumus/tabel/gambar. Gunakan `<Html>`.

## Fitur Penting per Halaman

- **`/teacher/questions`** — bank soal per topik; form memakai RichTextEditor (rumus/tabel/gambar). Membuat soal: `minWordCount`/`maxWordCount` hanya dikirim jika terisi (backend menolak `null`).
- **`/teacher/packages`** — kartu paket + tombol **Kelola Soal**: pilih **mapel → banyak topik** (chip) → centang soal per topik (ada tombol "Semua") → Simpan mengirim seluruh `questionIds` (`PUT /packages/:id`).
- **`/student/exam/[id]`** — `ExamSheet`: timer **server-synced** (hitung dari `deadlineAt`, bukan `remainingSeconds`), auto-save debounced, warning esai di bawah `minWordCount` bersifat **peringatan saja**, submit otomatis saat `expired`.
- **`/teacher/monitor/[scheduleId]`** & **`/schedules/[id]/projector`** — status polling JSON (`{success,data}`) & SSE stream (payload double-wrapped `data: {"data":{…}}` — gunakan `payload.data`).

---

## Catatan Svelte 5

- Jangan memutasi `$state` **saat render** (di template `{@const}` / `{@each}`) — memicu error `state_unsafe_mutation` dan render rusak senyap. Mutasi hanya di event handler / `onMount`; gunakan getter non-mutating di template.
- Untuk map/set reaktif: reassign variabel (`x = { ...x, [k]: v }`), bukan mutasi in-place.

---

## Deployment (Cloudflare Pages)

```bash
bun run build
bun run deploy    # wrangler pages deploy build
```

- Build menghasilkan `build/404.html` + `build/_routes.json` (SPA fallback) lewat `scripts/postbuild.mjs`.
- Konfigurasi di `wrangler.toml` (project name) — sesuaikan sebelum deploy.
- Set `PUBLIC_API_URL` ke URL backend production di dashboard Pages (Environment Variables).
- Backend harus mengizinkan origin Cloudflare Pages di `CORS_ORIGIN` + cookie butuh `SameSite=Lax`/`Secure` sesuai domain.