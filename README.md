# ZailTrack

ZailTrack adalah aplikasi pencatat keuangan sederhana berbasis PHP, MySQL, dan Vanilla JavaScript yang dirancang untuk berjalan di Vercel dengan arsitektur serverless.

## Fitur
- Registrasi dan login pengguna
- Dashboard ringkasan pemasukan, pengeluaran, dan saldo
- Penyimpanan transaksi per user
- Export data ke format Excel
- UI dark mode yang responsif untuk mobile dan desktop

## Teknologi yang Digunakan
- PHP Native
- MySQL
- Vanilla JavaScript
- Bootstrap 5
- Vercel Serverless

## Struktur Proyek
- api/configure.php : koneksi database dan pembuatan tabel otomatis
- api/process.php : logika API register, login, dashboard, simpan transaksi, dan export
- assets/css/style.css : styling UI
- assets/js/app.js : logika frontend dan Fetch API
- index.php : halaman login/daftar
- dashboard.php : halaman dashboard utama
- vercel.json : konfigurasi routing Vercel

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
http://localhost:8000/
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
- Untuk Vercel, jangan gunakan localhost sebagai host database.
- Saat pertama kali dijalankan, aplikasi akan otomatis membuat tabel yang dibutuhkan.
