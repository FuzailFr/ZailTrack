# ZailTrack Design System: Technical Archival & Editorial Ledger

> Dokumentasi arsitektur desain visual, filosofi antarmuka, token warna, tipografi, dan panduan komponen untuk ekosistem aplikasi bergaya **Technical Archival / Engineer Cockpit**.

---

## 1. Filosofi Desain (Design Philosophy)

Aesthetic ini memadukan ketelitian perangkat instrumen teknik (*industrial flight instrument / engineering terminal*) dengan elegansi tata letak editorial (*swiss typography & archival ledger*).

### Prinsip Utama:
1. **High Information Density with Zero Slop**:
   - Menghindari ilustrasi generik yang membuang ruang layar.
   - Setiap elemen memiliki fungsi nyata: metrik, status live, atau kontrol interaktif.
2. **Tactile & Hairline Precision**:
   - Menggunakan border setipis 1px (*hairline borders*) dengan kontras terkontrol untuk memisahkan hierarki tanpa membuat mata lelah.
   - Sudut melengkung yang proporsional: `rounded-lg` (8px) untuk tombol dan kontrol, `rounded-xl` (12px) untuk kartu kontainer.
3. **Monospace Asymmetry**:
   - Teks bacaan dan label menggunakan font display sans-serif yang berkepribadian tegas (`Bricolage Grotesque`).
   - Angka nominal, timestamp, metrik performa, kode, dan status status tag wajib menggunakan font monospace (`Space Mono`).
4. **Purpose-Driven Accents**:
   - Warna aksen tidak digunakan secara acak, melainkan membawa makna fungsional:
     - **Cyan / Sky (`#38bdf8`)**: Aksi navigasi & interaktivitas utama.
     - **Amber / Gold (`#f59e0b`)**: Mode Developer, status sistem, otoritas admin.
     - **Emerald / Mint (`#34d399`)**: Pemasukan, status online, saldo positif.
     - **Rose / Crimson (`#fb7185`)**: Pengeluaran, aksi destruktif (delete), peringatan.

---

## 2. Tipografi & Font Pairing

```css
:root {
  --font-sans: "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

| Penggunaan | Font Family | Weight & Tracking | Contoh Implementasi |
| :--- | :--- | :--- | :--- |
| **Headline & Brand** | `Bricolage Grotesque` | Bold (700), `-0.02em` | `ZailTrack`, Judul Halaman |
| **Body & Deskripsi** | `Bricolage Grotesque` | Medium (500), `-0.015em` | Keterangan transaksi, instruksi |
| **Nominal & Angka** | `Space Mono` | Bold (700), Tabular | `Rp 1.000.000`, Saldo, Nilai Kas |
| **Telemetry & Badges** | `Space Mono` | Regular / Bold, `tracking-wider` | `USER // fuzail_dev`, `709 ms` |
| **Labels & Metadata** | `Space Mono` | Regular, `uppercase text-[10px]` | `SALDO BERSIH (NET)`, `TERDAFTAR SEJAK` |

---

## 3. Palet Warna (Color Palette & Tokens)

Desain mendukung mode gelap (*Dark Mode - Slate Charcoal*) dan mode terang (*Light Mode - Paper & Lead*) secara dinamis melalui CSS Variables:

### Mode Gelap (Dark Mode - Default)
```css
/* Mode Gelap (Slate-Charcoal Technical Archival) */
[data-theme="dark"] {
  --bg: #0f1115;              /* Base canvas slate gelap teknis */
  --bg-secondary: #16191f;    /* Background header tabel / kontainer lapis kedua */
  --surface: #1a1e26;         /* Permukaan kartu / card background tegas */
  --surface-hover: #222732;   /* State hover pada baris & kontrol interaktif */
  --border: #262b35;          /* Border utama hairline berdefinisi tinggi */
  --border-subtle: #1c212a;   /* Garis pemisah internal & grid */
  --text-primary: #f1f3f5;    /* Teks judul & angka utama kontras tinggi */
  --text-secondary: #8b949e;  /* Teks deskripsi & label sekunder nyaman dibaca */
  --text-muted: #626c79;      /* Metadata, timestamp, placeholder */
  --accent: #60a5fa;          /* Blue accent (Primary Action) */
  --accent-muted: rgba(96, 165, 250, 0.12);
  --hero-gradient: linear-gradient(180deg, #0a0c0e 0%, #16191f 100%);
  --income: #34d399;          /* Emerald Mint (Pemasukan) */
  --income-bg: rgba(52, 211, 153, 0.12);
  --expense: #fb7185;         /* Rose Coral (Pengeluaran) */
  --expense-bg: rgba(251, 113, 133, 0.12);
}
```

### Mode Terang (Light Mode)
```css
/* Mode Terang (Paper & Lead Technical Archival) */
[data-theme="light"] {
  --bg: #fafaf9;              /* Off-white paper canvas */
  --bg-secondary: #f3f4f6;    /* Soft gray neutral tint */
  --surface: #ffffff;         /* Pure white clean cards */
  --surface-hover: #f8fafc;   /* Subtle slate hover state */
  --border: #e2e5e9;          /* Clean technical border */
  --border-subtle: #eceef1;   /* Faint divider line */
  --text-primary: #111827;    /* Deep slate ink */
  --text-secondary: #4b5563;  /* Charcoal body */
  --text-muted: #6b7280;      /* Lead gray */
  --accent: #2563eb;          /* Cobalt blue */
  --accent-muted: rgba(37, 99, 235, 0.08);
  --hero-gradient: linear-gradient(180deg, #f4f4f2 0%, #e9ecef 100%);
  --income: #059669;          /* Deep emerald */
  --expense: #e11d48;         /* Deep crimson */
}
```

### Transisi Halus (Smooth Transitions)
```css
body {
  background: var(--bg);
  color: var(--text-primary);
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}
```

### Anti-Kedipan (*Zero-FOUC Theme Init*)
Script inline pada `<head>` di [`app/layout.tsx`](file:///d:/PROJEK/ZailTrack/app/layout.tsx) membaca kunci penyimpanan `theme` dan fallback `zailtrack-theme` sebelum browser merender DOM:
```javascript
(function () {
  try {
    var stored = localStorage.getItem("theme") || localStorage.getItem("zailtrack-theme");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
```

---

## 4. Pola Komponen (Component Patterns)

### A. Technical Card Container
Kartu bergaris tegas dengan bayangan mikro untuk efek taktil yang halus:
```html
<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-xs">
  <!-- Content -->
</div>
```

### B. Status Badges & Pills
Badge ringkas dengan latar belakang transparan 10% dan border 20-30% serasi:
- **Admin / Dev**:
  ```html
  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
    ADMIN / DEV
  </span>
  ```
- **Pemasukan (Income)**:
  ```html
  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
    PEMASUKAN
  </span>
  ```
- **Pengeluaran (Expense)**:
  ```html
  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
    PENGELUARAN
  </span>
  ```

### C. Live Telemetry / User Pill & Online Beacon
Indikator titik lampu aktif (*active glowing dot*) dan sinyal berdenyut (*pulsating live beacon*):
```html
<!-- Pill User Header -->
<div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono">
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
  </span>
  <span className="text-emerald-400 font-bold">1</span>
  <span className="text-[var(--text-muted)] text-[11px]">Online</span>
</div>
```

### D. Segmented View Switcher (Mode User vs Mode Dev)
Kontrol mode bergaya panel instrumen kokpit:
```html
<div className="flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
  <button className="px-3 py-1.5 rounded-md bg-[var(--text-primary)] text-[var(--bg)] font-bold shadow-xs">
    Mode User
  </button>
  <button className="px-3 py-1.5 rounded-md text-[var(--text-muted)] hover:text-amber-500">
    Mode Dev
  </button>
</div>
```

### E. Geolocation & Network Address Pill
Menampilkan identitas jaringan pengguna secara bersih, menormalisasi loopback IPv6 (`::1` menjadi `127.0.0.1`), dan menyematkan tag wilayah geografis otomatis:
```html
<div className="flex flex-col">
  <span className="font-mono text-xs text-[var(--text-primary)]">127.0.0.1</span>
  <span className="font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1">
    📍 Localhost (ID)
  </span>
</div>
```

### F. Clean Monospace Identity (Zero-Clash Actor Tagging)
Menghindari prefix `@` yang dapat merusak kerning pada font `Space Mono` (misalnya `@fuzail_dev` yang terbaca mirip `afuzail_dev`), dengan memisahkan username dan tag peran secara semantik:
```html
<div className="flex items-center gap-1.5">
  <span className="font-mono font-medium text-xs text-[var(--text-primary)]">fuzail_dev</span>
  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
    admin
  </span>
</div>
```

---

## 5. Pola Responsif (Responsive Dual-View Architecture)

Salah satu keunggulan desain ini adalah **perlakuan berbeda antara mobile dan desktop** untuk menjaga kenyamanan pembacaan:

```mermaid
graph TD
    Device[Ukuran Layar] -->|Layar Ponsel < 640px| MobileView[Card View Vertikal]
    Device -->|Layar Laptop/PC >= 640px| DesktopView[Table View Horizontal Dense]
    
    MobileView --> MobileProps["• Zero horizontal scroll\n• Card per transaksi\n• Tombol thumb-friendly membentang\n• Safe-area padding bawah pb-32"]
    DesktopView --> DesktopProps["• Kolom tabel lengkap\n• Hover baris halus\n• Dense 5-kolom tabular\n• Multi-panel side-by-side"]
```

### Aturan Responsif:
1. **Layar HP (< 640px)**:
   - Hindari memaksa tabel lebar 5 kolom yang mengharuskan geser horizontal.
   - Ganti baris tabel menjadi kartu individual (`block sm:hidden`).
   - Tombol utama (*primary CTA*) dibuat membentang penuh (`w-full sm:w-auto`) agar mudah dijangkau satu tangan.
   - Berikan `pb-32` pada dasar halaman agar browser floating navbar (Safari / Chrome) tidak menutupi baris data paling bawah.
2. **Layar Desktop (>= 640px)**:
   - Tampilkan seluruh kolom tabel secara proporsional (`hidden sm:block`).
   - Maksimalkan kepadatan informasi (*high density*) dengan padding `py-3.5 px-4`.

---

## 6. Panduan Do's & Don'ts

| Lakukan (Do) | Hindari (Don't) |
| :--- | :--- |
| Gunakan border tipis `1px solid var(--border)` untuk kontainer. | Jangan gunakan bayangan tebal (*heavy drop shadows / blur*) bergaya neumorphism. |
| Gunakan `Space Mono` untuk angka nominal rupiah agar digit sejajar rapi. | Jangan gunakan font tulisan tangan atau script dekoratif. |
| Gunakan warna aksen neon (cyan, amber, emerald, rose) dengan latar transparan 10%. | Jangan gunakan warna solid neon yang menyilaukan mata di mode gelap. |
| Berikan micro-interaction pada hover: `hover:bg-[var(--surface-hover)] transition-colors`. | Jangan buat elemen statis kaku tanpa umpan balik interaksi visual. |
| Pisahkan hierarki teks dengan kontras warna: `--text-primary` untuk judul, `--text-muted` untuk keterangan. | Jangan gunakan warna teks seragam abu-abu yang membuat informasi sulit dipindai. |
