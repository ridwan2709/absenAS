# DOKUMEN REVISI (REVISI v2.3.0 TELAH DIAPLIKASIKAN - GITHUB PAGES READY)
================================================================================
STATUS: SUKSES DITERAPKAN (MERGED TO MASTER CONTEXT)
TANGGAL: 24 November 2026
ENGINE: ZettBOT Core v4.1 (by Zettbos)
HASIL PERBAIKAN ARSITEKTUR GITHUB PAGES:
1. `index.html` kini 100% mematuhi standar web statis dengan `<link rel="stylesheet" href="style.css">` dan `<script src="app.js"></script>`, bebas dari scriptlet Apps Script yang tidak didukung GitHub Pages.
2. `style.css` memuat seluruh stylesheet resmi School Prime (Deep Navy Blue, Amber Gold, CR80 Print Stylesheet, dan animasi laser scanner).
3. `app.js` telah dikonfigurasi dengan Default URL aktif backend Apps Script (@8), sinkronisasi kontrol modal `style.display`, dan proteksi `switchView()`.
4. Header aplikasi kini dilengkapi indikator status koneksi API Google Sheets (`#apiStatusBadge`) dan modal konfigurasi dinamis (`#modalApiSettings`).
================================================================================

## 1. ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS)

1. **GitHub Pages adalah Server Statis (Bukan Google Apps Script Runtime):**
   - Di `index.html`, pemanggilan styling dan script sebelumnya menggunakan sintaks scriptlet Apps Script:
     - `<?!= include('css'); ?>`
     - `<?!= include('js'); ?>`
   - Server GitHub Pages mengirimkan teks tersebut secara mentah (raw text) ke browser tanpa mengeksekusinya.
   - Akibatnya:
     - Berkas stylesheet tidak pernah disuntikkan -> Sidebar menjadi putih polos.
     - Berkas JavaScript tidak pernah disuntikkan -> Seluruh fungsi (`switchView`, `openScannerWithMode`, `toggleMobileSidebar`) menjadi `undefined`, sehingga muncul error `ReferenceError: switchView is not defined` saat tombol diklik.
2. **Ketiadaan API `google.script.run` di GitHub Pages:**
   - Objek `google.script.run` hanya ada jika web app diakses langsung dari domain `script.google.com`.
   - Pada GitHub Pages, komunikasi ke Google Sheets wajib menggunakan protokol HTTP Fetch (REST API Bridge) yang memanggil URL Web App Apps Script (`doGet` / `doPost`).
   - Server backend `code.gs` versi @8 yang telah di-deploy sudah memiliki endpoint REST API yang siap menerima request dari GitHub Pages via CORS.

---

## 2. RENCANA TINDAKAN PERBAIKAN (SURGICAL PLAN v2.3.0)

### A. Perbaikan `index.html` (Static Web & GitHub Pages Compliant):
1. **Memuat Stylesheet Statis Resmi:**
   - Mengganti `<?!= include('css'); ?>` menjadi tautan resmi:
     `<link rel="stylesheet" href="style.css">`
   - Menambahkan blok `<style>` inline cadangan agar warna Deep Navy `#172554` dan tombol aktif langsung terkunci tanpa bergantung latensi CDN.
2. **Memuat Script Statis Resmi:**
   - Mengganti `<?!= include('js'); ?>` menjadi tautan skrip statis:
     `<script src="app.js"></script>`
3. **Penyediaan Status Koneksi API di Header:**
   - Menambahkan indikator status koneksi API Sheets di bilah header atas sehingga pengguna dapat memantau apakah frontend GitHub Pages sudah terhubung ke Google Sheets.

### B. Penyempurnaan `style.css`:
1. Menyinkronkan seluruh aturan CSS School Prime dari `css.html` ke `style.css`:
   - Latar belakang gradien Deep Navy Blue (`#172554` ke `#1e3a8a`).
   - Indikator menu aktif Amber Gold (`#f59e0b`).
   - Aturan cetak kartu ID Card CR80 (@media print).
   - Animasi laser scanner QR.

### C. Penyempurnaan `app.js` (Universal REST API Client):
1. **Pemasangan Default URL Google Apps Script:**
   - Memasang URL Web App aktif hasil deployment @8 sebagai URL default otomatis:
     `https://script.google.com/macros/s/AKfycbye38eAR5H1IvkbJwAkkE7M6zjCoBynOfw0DIs2gl7dAV5GVWqGFdzooouy03zHcpwRgQ/exec`
   - Frontend di GitHub Pages akan langsung terhubung ke database Google Sheets tanpa perlu konfigurasi manual yang rumit.
2. **Penyelarasan Seluruh Logika Interaksi & Modal:**
   - Menerapkan seluruh perbaikan modal (`style.display = 'flex'` / `'none'`).
   - Menerapkan pengaman `try...catch` pada `switchView()`.
   - Mengirim request via HTTP POST/GET sederhana yang kebal pemblokiran CORS browser.

---

## 3. BERKAS YANG TERDAMPAK
- `index.html`: Konversi include scriptlet ke `<link rel="stylesheet" href="style.css">` dan `<script src="app.js"></script>`.
- `style.css`: Sinkronisasi styling lengkap School Prime.
- `app.js`: Logika frontend universal + REST API Bridge ke Google Sheets.

---

## 4. CARA PENGUJIAN SETELAH DITERAPKAN
Setelah perbaikan diterapkan:
1. Lakukan `git add .`, `git commit -m "Fix GitHub Pages frontend integration"`, dan `git push origin main`.
2. Buka domain GitHub Pages Anda (`https://<username>.github.io/<repo>/`).
3. Tekan `Ctrl + F5` untuk Hard Refresh.
4. Seluruh tombol menu sidebar dan dashboard akan langsung berfungsi seketika.
