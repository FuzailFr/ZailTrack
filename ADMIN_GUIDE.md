# Panduan Local Admin Dashboard & Telegram Bot (ZailTrack v2.2)

Dokumentasi lengkap pengembangan, struktur, fitur baru, dan instruksi pengujian lokal.

---

## 1. Ikhtisar Peningkatan Sistem (Upgrade Highlights)

### A. Admin Cockpit & Database Studio (`/admin`)
1. **Executive Overview & Self-Hosted Web Analytics**:
   - **Vercel-Style Web Analytics Suite (Tanpa Layanan Pihak Ketiga)**:
     - Menggantikan `@vercel/analytics` dan `@vercel/speed-insights` dengan *native telemetry engine* mandiri yang mencatat pengunjung langsung ke database Neon PostgreSQL.
     - **3 Metrik Utama**: *Visitors*, *Page Views*, dan *Bounce Rate* dengan tab interaktif.
     - **Grafik Tren SVG**: Area & Line Chart interaktif dengan warna aksen biru `#60a5fa` dan garis putus-putus proyeksi.
     - **3 Kartu Analisis Rinci (Breakdown Widgets)**:
       - **Negara / Wilayah (Countries)**: Bendera negara, nama, persentase, dan bar progress visual (Amerika Serikat, Indonesia, Jerman, Meksiko, Filipina, dll).
       - **Perangkat & Peramban (Devices & Browsers)**: Tab switcher Desktop, Mobile, Tablet vs Chrome, Safari, Edge, Firefox.
       - **Sistem Operasi (Operating Systems)**: Distribusi iOS, Windows, Mac, Android, Ubuntu/Linux.
   - **User Online (Live)**: Indikator detak sinyal langsung (*pulsating beacon*) dengan hitungan user aktif dalam 15 menit terakhir.
   - Total user, breakdown peran (User, Admin, Developer), user aktif (30 hari), user baru (7 hari).
   - Volume arus kas platform (Total Pemasukan, Total Pengeluaran, Saldo Bersih, Frekuensi Transaksi).
   - Grafik interaktif 14 hari aktivitas kas platform (SVG responsif bertema Dark Terminal).
   - Pemantauan kesehatan API & server (Uptime, latensi query database Neon PostgreSQL).
   - Statistik penggunaan command bot Telegram terpopuler.
   - Filter rentang waktu: Hari Ini, 7 Hari, 30 Hari, 1 Tahun.
2. **User Management**:
   - Pencarian instan dan filter multi-level (Role: `user`, `admin`, `developer` | Status: `active`, `suspended`, `banned`, serta filter instan `🟢 Online Sekarang`).
   - Indikator sinyal langsung di tabel pengguna: lampu hijau berdenyut (*pulse beacon*) untuk pengguna online, keterangan waktu relatif (*relative timestamp*), serta pill wilayah (*region*).
   - **User Audit & Telemetry Inspector (Modal Ikon Pensil)**:
     - Mengklik tombol pensil pada baris pengguna akan membuka jendela inspeksi lengkap: IP Address terakhir, Wilayah Geolocation, status sinyal live, total transaksi, status Telegram Bot, tanggal bergabung, dan aksi audit terakhir yang dilakukan pengguna.
     - Di dalam modal yang sama, Admin dapat mengubah Role, Status akun, dan melakukan Reset Password paksa.
   - Tambah pengguna baru langsung dari modal dashboard.
   - Edit Role, Status akun, dan fitur Reset Password paksa oleh Admin.
   - Proteksi **Anti-Self-Lockout**: Admin tidak dapat mencabut role sendiri atau memblokir akun sendiri.
   - Hapus pengguna permanen dengan pembersihan riwayat transaksi (Cascade).
3. **Database Studio & Safe SQL Runner**:
   - Inspeksi skema dan metadata seluruh tabel publik (`users`, `transactions`, `audit_logs`, `bot_logs`, `traffic_logs`).
   - Browser data tabular dengan pagination, search bar, dan sorting.
   - **Direct CRUD**: Tambah baris baru (Insert), Ubah nilai baris (Edit), Hapus baris (Delete) dengan konfirmasi risiko.
   - **Governed Safe SQL Query Runner**:
     - Editor query monospaced dengan preset query.
     - Proteksi query: Memblokir otomatis perintah DDL berbahaya (`DROP DATABASE`, `DROP TABLE`, `ALTER TABLE`, `TRUNCATE`).
     - Limit clause otomatis (Max 100 baris) untuk mencegah beban memori.
     - Indikator waktu eksekusi query dalam milidetik (ms).
   - **Backup & Restore Database**:
     - Export dump database lengkap berformat JSON snapshot terstruktur.
     - Restore wizard dengan validasi file dan konfirmasi risiko 2 tahap.
4. **Activity, Geolocation & Security Audit Logs**:
   - Audit trail *immutable* mencatat seluruh aktivitas login, logout, reset password, CRUD database, dan perubahan role dari seluruh pengguna.
   - **Filter Cepat Berdasarkan Role**: Dilengkapi tombol filter peran (`Semua Role`, `User`, `Admin`, `Developer`) dan pencarian instan untuk mempermudah audit investigasi.
   - **Normalisasi IP & Deteksi Wilayah**:
     - Alamat loopback IPv6 (`::1`) otomatis dinormalisasi menjadi IPv4 ramah baca (`127.0.0.1`).
     - Tagging wilayah otomatis (`📍 Localhost (ID)` untuk pengujian lokal, atau nama kota/negara saat diakses publik via header `cf-ipcity`/`x-vercel-ip-city`).
   - Riwayat eksekusi command bot Telegram beserta chat ID, teks, dan latensi.
   - Traffic monitoring mencatat HTTP method, path, status, IP, dan durasi request.
   - Fitur **Export CSV** untuk seluruh audit logs (Audit, Bot, dan Traffic) yang mengikuti filter aktif.

---

### B. Otentikasi & Keamanan (Authentication & Security)
- **Role-Based Access Control (RBAC)**: Mendukung 3 tingkat hak akses (`user`, `admin`, `developer`).
- **Alur Pemulihan Sandi (Forgot / Reset Password)**:
  - Permintaan token pemulihan satu kali pakai (*one-time cryptographic token*) berlaku 1 jam.
  - Halaman khusus `/reset-password?token=...` yang aman dan terisolasi.
- **Enkripsi**: Password di-hash menggunakan algoritma Bcrypt (Salt 10).
- **Proteksi Brute-Force & Rate Limiting**:
  - Sliding-window rate limiter pada endpoint login, registrasi, dan lupa password.
- **Proteksi Akun Terblokir**:
  - Akun berstatus `suspended` atau `banned` ditolak saat login dan diputus sesinya secara instan.

---

### C. Pembaruan Telegram Bot
- **Menu Interaktif & Inline Keyboard**:
  - Tampilan responsif di Android, iOS, Desktop, dan Telegram Web.
  - Tombol navigasi cepat: `[💰 Cek Saldo]`, `[📋 Riwayat]`, `[👤 Akun Saya]`, `[⚡ Status Server]`.
- **Pagination Riwayat Transaksi**:
  - Perintah `/terakhir` menampilkan 5 transaksi per halaman lengkap dengan tombol `[◀️ Sebelumnya]` dan `[Berikutnya ▶️]`.
- **Hak Akses Tingkat Lanjut**:
  - Command `/admin` & `/admin_stats` (khusus Admin & Developer).
  - Command `/dev_info` (khusus Developer).
  - Validasi permission ketat di backend (bukan sekadar sembunyi tombol).
- **Smart Natural Language Parser**:
  - Tetap mendukung format instan: `keluar 50k kopi`, `beli bensin 35rb`, `masuk 1.5jt freelance`, `+100000 bonus`.

### D. Sistem Tema & Kenyamanan Visual
- **Palet Warna Slate-Charcoal (Dark) & Paper-Lead (Light)**:
  - Dark mode menggunakan base `#0f1115` dengan kontras terukur (`#16191f`, `#1a1e26`, `#262b35`, aksen `#60a5fa`).
  - Light mode menggunakan canvas `#fafaf9` dengan border bersih `#e2e5e9` dan aksen `#2563eb`.
  - Transisi CSS halus `150ms ease` untuk pergantian tema tanpa flickering.
  - Zero-FOUC initialization script yang membaca `localStorage` sebelum render.

---

## 2. Cara Menjalankan & Menguji Secara Lokal

### 1. Jalankan Development Server
Buka terminal di root project `d:\PROJEK\ZailTrack`:
```bash
npm run dev
```
Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

### 2. Akun Akses Admin
Untuk menguji fitur Admin & Database Studio, Anda dapat login menggunakan akun yang memiliki role `admin` (misalnya akun Anda `fuzail_dev`).

### 3. Akses Halaman Utama
- **Halaman Login & Registrasi**: [http://localhost:3000/](http://localhost:3000/)
- **Lupa / Reset Password**: [http://localhost:3000/reset-password](http://localhost:3000/reset-password) (atau klik tautan *"Lupa password?"* di form login)
- **Dashboard Transaksi Pengguna**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Admin Cockpit & Database Studio**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 3. Hasil Pengujian Unit & Integrasi Lokal

Pengujian otomatis telah dijalankan terhadap database Neon PostgreSQL lokal:
- Schema Migration: **PASSED**
- User Registration & Bcrypt Hashing: **PASSED**
- One-Time Reset Password Workflow: **PASSED**
- RBAC & Status Ban/Suspend: **PASSED**
- Database CRUD: **PASSED**
- Audit & Bot Logging: **PASSED**
- Next.js Build Compilation: **PASSED (0 Errors)**

> **Catatan:** Seluruh perubahan saat ini tersimpan 100% di lokal dan **tidak di-push ke GitHub atau di-deploy ke Vercel**.
