# ZailTrack Deployment Guide

## 1. Persiapan Database Eksternal

Karena Vercel adalah platform serverless, Anda perlu database eksternal. Pilihan:

### Option A: Railway (Recommended)
1. Buat akun di railway.app
2. Buat database MySQL baru
3. Copy kredensial ke Vercel Environment Variables

### Option B: PlanetScale
1. Buat akun di planetscale.com
2. Setup MySQL database
3. Copy connection string ke environment variables

### Option C: Aiven
1. Buat akun di aiven.io
2. Setup managed MySQL
3. Copy kredensial ke environment variables

### Option D: VPS/Hosting Sendiri
Jika Anda sudah punya VPS atau hosting sendiri dengan MySQL, gunakan kredensial tersebut.

## 2. Environment Variables yang Diperlukan

Siapkan 4 environment variables ini:
- **DB_HOST** : hostname/IP database Anda
- **DB_USER** : username untuk akses database
- **DB_PASSWORD** : password database
- **DB_NAME** : nama database yang akan dibuat otomatis

## 3. Deploy ke Vercel

### Langkah 1: Push ke GitHub
```bash
git add .
git commit -m "ZailTrack ready for production"
git push origin main
```

### Langkah 2: Import ke Vercel
1. Buka vercel.com
2. Klik "Add New..." → "Project"
3. Import repository GitHub Anda
4. Tunggu deteksi selesai

### Langkah 3: Set Environment Variables
1. Di halaman deploy Vercel, buka tab **Environment Variables**
2. Tambahkan 4 variable:
   - Key: `DB_HOST` → Value: hostname database Anda
   - Key: `DB_USER` → Value: username database Anda
   - Key: `DB_PASSWORD` → Value: password database Anda
   - Key: `DB_NAME` → Value: finance_app (atau nama custom)
3. Klik **Add More** untuk setiap variable yang baru
4. Klik **Deploy**

### Langkah 4: Verifikasi
Tunggu deployment selesai (biasanya 1-2 menit). Jika sukses, Anda akan mendapat URL seperti:
```
https://zailtrack-xxxxx.vercel.app/
```

## 4. Troubleshooting

### Database connection failed
- Pastikan kredensial DB_HOST, DB_USER, DB_PASSWORD benar
- Pastikan database tidak memerlukan SSL (jika perlu, hubungi hosting)
- Cek firewall database, apakah sudah allow koneksi dari Vercel

### Blank page / 500 error
- Cek Vercel logs: buka project di Vercel, tab "Logs"
- Pastikan vercel.json sudah benar
- Pastikan file PHP tidak ada syntax error

### Tabel tidak terbuat otomatis
- Cek logs untuk error saat create table
- Pastikan database user memiliki privilege CREATE TABLE

## 5. Setelah Deploy Sukses

1. Buka URL aplikasi Anda
2. Daftar akun baru
3. Login dan coba menambah transaksi
4. Test export Excel

Jika semua berjalan, ZailTrack Anda sudah live di production!
