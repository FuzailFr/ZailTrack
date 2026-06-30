# ZailTrack

ZailTrack adalah aplikasi pencatat keuangan personal berbasis Jamstack dengan frontend statis HTML, backend PHP serverless, dan MySQL eksternal.

## Fitur
- Registrasi dan login pengguna
- Dashboard ringkasan pemasukan, pengeluaran, dan saldo
- Penyimpanan transaksi per user
- Export data ke format Excel
- UI dark mode mobile-first yang ringan dan responsif

## Teknologi yang Digunakan
- HTML statis
- PHP Native (Serverless API)
- MySQL
- Vanilla JavaScript (Fetch API)
- Bootstrap 5
- Vercel

## Struktur Proyek
- api/configure.php : koneksi database dan pembuatan tabel otomatis
- api/process.php : endpoint API `?action=register`, `?action=login`, `?action=get_dashboard`, `?action=simpan`, `?action=export`
- assets/css/style.css : styling UI
- assets/js/app.js : logika frontend dan Fetch API
- index.html : halaman login/daftar statis
- dashboard.html : halaman dashboard statis
- .env.example : contoh file environment variable

## Cara Menjalankan Lokal
1. Pastikan PHP dan MySQL sudah tersedia.
2. Buat database MySQL.
3. Set environment variable:
   - DB_HOST=localhost
   - DB_USER=root
   - DB_PASSWORD=
   - DB_NAME=finance_app
4. Jalankan server lokal, misalnya dengan PHP built-in:

```bash
php -S localhost:8000
```

5. Buka browser ke:

```text
http://localhost:8000/index.html
```

## Deploy ke Vercel
1. Push project ke GitHub.
2. Import repository ke Vercel.
3. Tambahkan environment variables:
   - DB_HOST
   - DB_USER
   - DB_PASSWORD
   - DB_NAME
4. Deploy.

## Catatan
- Frontend menggunakan file statis `index.html` dan `dashboard.html`.
- Backend API adalah `api/process.php?action=...`.
- Jika Vercel mendeteksi deployment statis dengan PHP serverless, file `vercel.json` tidak wajib.
- Untuk Vercel, jangan gunakan `localhost` sebagai host database.
- Saat pertama kali dijalankan, aplikasi akan otomatis membuat tabel yang dibutuhkan.
