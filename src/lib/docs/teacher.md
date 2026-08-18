# Alur Sistem & Panduan Guru

Dokumen ini menjelaskan alur kerja aplikasi CBT & LMS dan cara menggunakan setiap fitur, langkah demi langkah.

---

## Alur Sistem (Ringkas)

Aplikasi bekerja dalam 6 tahap:

1. **Bank Soal** — buat mata pelajaran, topik, dan soal (pilihan ganda, esai, benar salah, berbobot, multi).
2. **Paket** — kumpulkan soal dari satu atau banyak topik menjadi satu paket ujian, atur waktu & nilai lulus.
3. **Jadwal** — tentukan kapan ujian berlangsung, untuk kelas siapa, dan kode akses.
4. **Siswa Mengerjakan** — siswa melihat jadwal aktif dan mengerjakan (timer otomatis, jawaban tersimpan otomatis).
5. **Monitor & Proyektor** — pantau kelas secara live, pause/resume, tambah waktu, tampilkan timer besar di proyektor.
6. **Koreksi & Nilai** — nilai esai secara manual, lihat rekap nilai per jadwal.

> **Rekomendasi urutan pertama kali:** Buat soal → buat paket → buat jadwal → minta siswa mengerjakan → pantau & koreksi.

---

## Panduan Bank Soal

Bank soal tersusun berjenjang: **Mata Pelajaran → Topik → Soal**.

### Membuat Mata Pelajaran & Topik

1. Buka menu **Bank Soal**.
2. Klik **Mata Pelajaran** untuk menambah mapel (contoh: `MTK` — Matematika).
3. Pada tab **Topik**, tambahkan topik di dalam mapel (contoh: Aljabar, Persamaan Linear).
4. Soal selalu berada di dalam sebuah topik, jadi pastikan topik sudah ada.

### Membuat Soal

1. Buka menu **Bank Soal → Soal**.
2. Pilih **Topik** tujuan.
3. Klik **Soal** untuk membuka form.
4. Tulis teks soal. Anda bisa menambahkan **rumus** (klik tombol Σ), **tabel**, dan **gambar**.
5. Pilih **Tipe Soal**:

| Tipe | Kegunaan |
| ---- | -------- |
| Pilihan Ganda | Pilih satu jawaban, tandai satu kunci (benar). |
| Benar Salah | Dua pilihan Benar/Salah, tandai satu kunci. |
| Esai | Jawaban bebas, dinilai guru secara manual. |
| Pilihan Ganda Berbobot | Pilih satu jawaban, tiap opsi punya bobot (cocok untuk skala/tes psikologi). |
| Pilihan Ganda (Banyak Jawaban) | Boleh pilih lebih dari satu; nilai = jumlah bobot opsi terpilih. |

6. Isi **Opsi Jawaban**. Centang **Benar** pada jawaban yang benar (bobot 1). Untuk skala/tes psikologi, isi **Bobot** setiap opsi (contoh 0–4).
7. Klik **Simpan**. Soal muncul di daftar dengan keterangan `Kunci: B` (atau `Bobot: …`).

> Untuk soal **Pilihan Ganda / Benar Salah**, aplikasi memblokir simpan jika tidak ada jawaban yang ditandai benar — agar sistem bisa mengoreksi otomatis.

### Mengelola Soal (Edit & Hapus)

- Klik ikon pensil untuk mengubah soal (termasuk opsi, kunci, dan bobot).
- Klik ikon tempat sampah untuk menghapus soal.

### Import Soal dari Excel

Untuk membuat banyak soal sekaligus:

1. Klik **Import Soal (Excel)** dan unduh template (`template_soal.xlsx`).
2. Isi kolom: `mapel`, `topik`, `tipe`, `soal`, `a`–`e` (opsi), `kunci` (huruf kunci, pisah koma untuk multi), `min_kata`, `max_kata`.
3. Unggah file. Soal yang valid langsung masuk ke mapel/topik yang sesuai.

---

## Panduan Paket

Paket adalah **kumpulan soal** yang akan diujikan. Satu paket bisa memuat soal dari beberapa topik (misal: Aljabar + Persamaan Linear).

### Membuat Paket

1. Buka menu **Paket** → **Paket Baru**.
2. Isi **Nama Paket** dan pilih **Mata Pelajaran**.
3. Atur opsi:
   - **Timer**: aktifkan bila ujian dibatasi waktu, lalu isi durasi (menit).
   - **Nilai Lulus (Pass Score)**: ambang lulus (opsional).
   - **Acak Soal / Acak Opsi**: mengacak urutan soal/opsi untuk tiap siswa.
4. Simpan.

### Kelola Soal dalam Paket

1. Pada kartu paket, klik **Kelola Soal**.
2. Pilih **Mata Pelajaran**, lalu aktifkan satu/beberapa **Topik** (chip).
3. Centang soal yang ingin dimasukkan (gunakan **Semua** untuk memilih seluruh soal di topik).
4. Klik **Simpan**. Jumlah soal (badge di kartu) diperbarui.

> Paket adalah **snapshot** — menambah soal di bank tidak otomatis masuk ke paket yang sudah ada. Jalankan "Kelola Soal" lagi setelah mengubah bank soal.

---

## Panduan Jadwal

Jadwal menentukan **siapa, kapan, dan bagaimana** ujian berlangsung.

### Membuat Jadwal Ujian

1. Buka menu **Jadwal** → **Jadwal Baru**.
2. Pilih **Paket** yang akan diujikan.
3. Isi **Judul** dan **Waktu Mulai** (dan waktu selesai bila perlu).
4. Atur **Kategori** (opsional) dan **Kode Akses** (opsional — siswa harus memasukkan kode untuk mulai).
5. Tentukan **Target** — siapa yang bisa melihat & mengerjakan:
   - **Semua Siswa** — default.
   - **Berdasarkan Kelas** — pilih kelas/rombel tertentu.
   - **Berdasarkan Tingkat** — misal seluruh kelas IX.
   - **Siswa Tertentu** — pilih siswa satu per satu.
   - Filter **Agama** — batasi ke agama tertentu (kosong = semua).
6. Simpan.

### Mengatur Siswa (Alokasi)

- Jika memakai target **Siswa Tertentu**, gunakan **Atur Alokasi** di halaman jadwal untuk mengganti daftar siswa.
- Untuk target kelas/tingkat/semua, siswa otomatis diikutkan saat mulai ujian (auto-allocation) bila memenuhi kriteria.

### Cara Siswa Mengerjakan

Siswa cukup:

1. Masuk ke aplikasi → **Dashboard Siswa**.
2. Pada daftar **Jadwal Aktif**, klik ujian yang tersedia.
3. Masukkan **kode akses** bila diminta, lalu **Mulai Ujian**.
4. Jawab soal (timer dihitung otomatis), jawaban **tersimpan otomatis**.
5. Klik **Kumpulkan** — nilai pilihan ganda langsung dihitung sistem.

> Pastikan waktu berjalan (`Waktu Mulai` sudah lewat) agar jadwal tampil sebagai aktif.

---

## Panduan Monitor & Proyektor

Pantau kelas secara real-time dan kendalikan ujian dari jarak jauh.

### Layar Proyektor

1. Dari **Dashboard Guru** atau halaman **Jadwal**, klik **Proyektor** pada jadwal yang berlangsung.
2. Layar menampilkan **timer besar** dan pesan motivasi — tampilkan di proyektor kelas.
3. Sinkronisasi otomatis lewat server (SSE), tidak perlu refresh.

### Monitor Live

1. Dari halaman jadwal, klik **Monitor**.
2. Lihat status ujian secara live (siswa yang sudah masuk, progres).
3. Tombol yang tersedia:
   - **Pause** / **Resume** — menghentikan/sambung kembali waktu untuk semua siswa.
   - **Tambah Waktu** — menambah durasi untuk semua siswa.
   - **Motivasi** — menampilkan pesan di layar proyektor.

---

## Panduan Koreksi & Nilai

### Menilai Esai

1. Dari halaman **Jadwal**, klik **Koreksi** (atau menu **Koreksi** pada jadwal).
2. Buka ujian siswa yang berstatus menunggu koreksi.
3. Masukkan **nilai** dan **umpan balik** untuk tiap esai, lalu simpan.
4. Nilai akhir siswa dihitung dari nilai pilihan ganda + esai.

### Rekap Nilai

- Halaman koreksi per jadwal menampilkan **rekap nilai** semua siswa (skor, status lulus/gagal bila pass score diatur).

---

## Tips & Catatan

- **Rumus, tabel, gambar** di soal tersimpan sebagai konten kaya — jangan dihapus saat mengedit teks soal.
- **Esai di bawah batas minimum kata**: siswa tetap bisa mengumpulkan (hanya peringatan). Nilai ditentukan guru.
- **Timer sinkron server**: hitungan waktu memakai waktu server; jangan andalkan jam perangkat siswa.
- **Hasil langsung**: bisa diatur per jadwal (`Tampilkan hasil langsung`). Bila nonaktif, siswa menunggu nilai final.