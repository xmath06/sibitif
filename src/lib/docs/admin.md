# Panduan Admin

Bagian khusus untuk **Admin** — mengelola pengguna dan kelas. Untuk alur sistem dan panduan fitur guru, lihat bagian **Alur Sistem & Panduan Guru** di atas.

---

## Mengelola Pengguna

Pengguna adalah akun login: **Admin**, **Guru**, atau **Siswa**.

### Membuat Pengguna Baru

1. Buka menu **User**.
2. Klik **Tambah User**.
3. Isi data:
   - **Nama Lengkap**
   - **Username** — dipakai untuk login (harus unik).
   - **Password** — password awal (siswa/guru bisa mengganti sendiri setelah login).
   - **Peran (Role)**: `ADMIN`, `TEACHER`, atau `STUDENT`.
   - **Kelas** — wajib untuk siswa (rombelnya).
   - **Agama** — dipakai sebagai filter targeting jadwal (opsional).
4. Simpan. Akun langsung bisa dipakai login.

### Mengedit / Menghapus / Reset Password

- Klik **Edit** pada baris user untuk mengubah data (termasuk password, kelas, agama).
- Klik **Hapus** untuk menghapus akun.
- User bisa mengganti password sendiri lewat menu namanya di pojok kanan atas → **Ganti Password**.

---

## Mengelola Kelas

Kelas (rombel) adalah pengelompokan siswa, contoh: `IX IPA 1`.

1. Buka menu **Kelas**.
2. Klik **Tambah Kelas**.
3. Isi **Nama Kelas** dan **Tingkat (Grade Level)** — misal `9` untuk kelas IX.
4. Kelas dipakai saat:
   - Membuat user siswa (menentukan rombelnya).
   - Targeting jadwal **Berdasarkan Kelas** / **Berdasarkan Tingkat**.

---

## Tips untuk Admin

- **Guru mengelola konten** (bank soal, paket, jadwal, koreksi, monitor) — ikuti **Alur Sistem & Panduan Guru**.
- Admin juga bisa masuk sebagai guru: menu Bank Soal, Paket, Jadwal, Siswa juga tersedia untuk Admin.
- **Jangan bagikan password ke orang lain** — setiap user mengganti passwordnya sendiri.