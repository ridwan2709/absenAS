# SPESIFIKASI KEBUTUHAN PRODUK (PRD) & MASTER CONTEXT
================================================================================
NAMA APLIKASI: SchoolPrime QR Attendance (Sistem Presensi Siswa & Kartu QR)
PLATFORM: Google Apps Script (GAS) Web App + Google Sheets (Spreadsheet)
ARSITEKTUR: Modular File Separation (index.html, css.html, js.html, code.gs, setup.gs)
VERSI DOKUMEN: 2.1.0
TANGGAL PEMBARUAN: 24 November 2026
ENGINE: ZettBOT Core v4.1 (by Zettbos)
STATUS: MENUNGGU PERSETUJUAN (PENDING APPROVAL)
================================================================================

================================================================================
ZONA ATAS: SPESIFIKASI KEBUTUHAN PRODUK (BLUEPRINT AWAL)
================================================================================

## 1. NAMA PROJEK & PROBLEM STATEMENT
- **Nama Aplikasi:** SchoolPrime QR Attendance System (Google Apps Script Modular Edition)
- **Problem Statement:**
  Sekolah memerlukan sistem absensi modern berbasis pemindaian QR Code dari Kartu Siswa yang praktis, 100% gratis tanpa biaya sewa hosting/server bulanan, dan datanya langsung tersimpan rapi di Google Sheets (spreadsheet Excel online sekolah). Sistem harus mudah dioperasikan oleh Admin/Guru piket, mendukung pergantian Semester/Tahun Ajaran, serta memiliki mekanisme Naik Kelas (promosi kelas) massal secara mudah.
- **Tujuan Sistem:**
  1. Kecepatan absensi: Siswa cukup scan QR pada Kartu Siswa untuk merekam Masuk dan Pulang.
  2. Database gratis & transparan: Seluruh data siswa, kelas, semester, dan riwayat presensi tersimpan di Google Sheets sekolah.
  3. Desain antarmuka profesional: Mengadopsi tata letak dashboard "School Prime" (Deep Navy & Amber Gold).
  4. Manajemen akademik lengkap: Tersedia pengaturan Semester/Tahun Ajaran aktif dan fitur Kenaikan Kelas (promosi kelas atau kelulusan alumni).
  5. Cetak Kartu Siswa otomatis: Format ID Card CR80 (8.5 x 5.4 cm) lengkap dengan foto dan QR Code siap print.
  6. Arsitektur Modular: Kode terpisah bersih menjadi `index.html` (struktur), `css.html` (styling), `js.html` (logika interaksi), `code.gs` (backend controller), dan `setup.gs` (database migration).

---

## 2. PERAN PENGGUNA (USER ROLE)
Sistem ini beroperasi dengan **Single Role: Admin Saja** (Guru Piket / Operator Sekolah):
- **Hak Akses Admin:**
  - Mengakses dashboard utama School Prime (statistik, kalender absensi, notice board).
  - Mengoperasikan Live QR Scanner (Masuk & Pulang) via Webcam/Kamera HP atau USB Gun Scanner.
  - Mengelola Data Siswa (tambah, edit, hapus, filter per kelas).
  - Mengelola Data Kelas (tambah, edit, hapus rombel).
  - Mengelola Data Semester & Tahun Ajaran (menentukan semester aktif berjalan).
  - Menjalankan proses **Naik Kelas** (memindahkan siswa dari kelas asal ke kelas tujuan secara massal atau menetapkan status lulus).
  - Men-generate dan mencetak Kartu Pelajar ber-QR Code (satuan maupun cetak per kelas).
  - Melihat rekaman kehadiran harian dan mengekspor rekapitulasi presensi.
  - Mengatur jam masuk, batas telat, dan jam mulai pulang.

---

## 3. ARSITEKTUR & STRUKTUR BERKAS MODULAR
Aplikasi diorganisasikan menjadi **5 Berkas Terpisah** yang terstruktur rapi:
1. `code.gs`: Backend Controller (menangani `doGet()`, fungsi `include()`, perutean API transaksi absensi, mutasi data siswa/kelas/semester, dan `SpreadsheetApp.flush()`).
2. `setup.gs`: Inisialisasi Database Google Sheets (*Safe Migration*, idempoten, membuat tab tanpa underscore, dan menyuntikkan data sampel jika tab kosong).
3. `index.html`: Struktur Antarmuka HTML (Navbar, Sidebar School Prime, Grid Kartu Statistik, Modal Form, Area Scanner, Layout Kartu Pelajar). Memuat `css.html` dan `js.html` menggunakan scriptlet `<?!= include('css'); ?>` dan `<?!= include('js'); ?>`.
4. `css.html`: Berkas khusus styling (Kustomisasi tema School Prime, animasi transisi halus, tata letak grid, dan aturan cetak ID Card CR80 `@media print`).
5. `js.html`: Berkas khusus logika frontend (State management in-memory cache, inisialisasi HTML5-QRCode scanner, penangkap USB gun scanner otomatis, audio feedback synthesizer, pagination, filter, dan fungsi render DOM anti-freeze).

- **Database:** Google Sheets Spreadsheet (Excel online resmi sekolah).
- **Target Tampilan (Viewport):** Responsif Penuh (Desktop Monitor Piket + Tablet + HP).
- **Palet Warna & Gaya Visual:**
  - *Deep Navy Blue* (`#172554`), *Slate Dark* (`#0f172a`), *Warm Amber / Gold* (`#f59e0b`), dan *Warm Off-White Canvas*.
  - Desain Anti-AI: Ikon SVG tajam, tata letak proporsional, tanpa emoji norak, bebas dari bug nested backticks.

---

## 4. ALUR KERJA APLIKASI (USER FLOW)

### A. Alur Pengaturan Semester & Tahun Ajaran:
1. Admin membuka menu **Semester & Tahun Ajaran**.
2. Admin dapat menambah tahun ajaran baru (contoh: "2026/2027") dan semester ("Ganjil" / "Genap").
3. Admin mengaktifkan salah satu semester sebagai **Semester Aktif**. Seluruh transaksi presensi dan laporan akan otomatis terikat pada semester aktif ini.

### B. Alur Kenaikan Kelas (Promosi Siswa):
1. Admin membuka menu **Naik Kelas**.
2. Admin memilih **Kelas Asal** (misal: "X RPL 1") dan **Tahun Ajaran / Semester Baru**.
3. Sistem memunculkan seluruh siswa di kelas tersebut lengkap dengan checkbox checklist (default terpilih semua).
4. Admin memilih opsi aksi:
   - **Naik ke Kelas:** Pilih kelas tujuan (misal: "XI RPL 1").
   - **Lulus / Alumni:** Mengubah status siswa menjadi Alumni (tidak aktif).
   - **Tinggal Kelas:** Siswa tetap di kelas yang sama.
5. Admin menekan tombol **"Proses Kenaikan Kelas"**.
6. Sistem secara aman memperbarui data siswa di Google Sheets dan mencatat riwayat pemindahan tanpa kehilangan data absensi lama.

### C. Alur Cetak Kartu Siswa ber-QR:
1. Admin membuka menu **Cetak Kartu Siswa**.
2. Memilih siswa atau memfilter berdasarkan kelas.
3. Sistem merender kartu pelajar berukuran 8.5 x 5.4 cm dengan Kop Sekolah, Foto Siswa, NIS, Nama, Kelas, dan QR Code unik (`SISWA-{NIS}`).
4. Admin mengklik tombol **Cetak (Print/PDF)** untuk mencetak kartu satuan atau massal.

### D. Alur Presensi QR (Masuk & Pulang):
1. Admin membuka menu **Presensi QR** dan memilih mode (**Absen Masuk** atau **Absen Pulang**).
2. Scanner siap menerima pindaian dari:
   - **Kamera Live (Webcam / HP)**.
   - **Barcode / QR Scanner USB Fisik** (otomatis mendeteksi input tanpa perlu mengklik field).
   - **Fallback Kamera Native HP** (`<input type="file" capture="environment">`) jika live stream terhalang sandbox browser.
3. Siswa memindai kartu:
   - **Absen Masuk:** Membandingkan jam scan dengan batas jam masuk:
     - <= Jam Batas -> Status: **Hadir** (hijau + audio beep).
     - > Jam Batas -> Status: **Terlambat** (kuning/oranye + notifikasi menit keterlambatan).
   - **Absen Pulang:** Memperbarui data jam pulang pada tanggal hari ini.
4. Muncul kartu informasi siswa instan di layar dan status tersimpan di Google Sheets dengan `SpreadsheetApp.flush()`.

---

## 5. DESAIN BASIS DATA (GOOGLE SHEETS TABS)
*Catatan: Sesuai aturan baku ZettBOT, nama tab TIDAK menggunakan karakter underscore (`_`).*

### Tab 1: `Siswa`
- Kolom A: `ID` (Nomor unik: SIS-001, SIS-002, dst.)
- Kolom B: `NIS` (Nomor Induk Siswa, unik)
- Kolom C: `Nama` (Nama Lengkap Siswa)
- Kolom D: `Kelas` (Nama Rombel, misal: "X RPL 1")
- Kolom E: `JenisKelamin` (L / P)
- Kolom F: `Foto` (URL foto atau icon avatar default)
- Kolom G: `Status` (Aktif / Lulus / Pindah)
- Kolom H: `CreatedAt` (Tanggal pendaftaran)

### Tab 2: `Kelas`
- Kolom A: `ID` (KLS-001, KLS-002, dst.)
- Kolom B: `NamaKelas` (Contoh: "X RPL 1", "XI TKJ 2")
- Kolom C: `Jurusan` (Contoh: "Rekayasa Perangkat Lunak")
- Kolom D: `Tingkat` (Contoh: "10", "11", "12")
- Kolom E: `WaliKelas` (Nama guru wali kelas)

### Tab 3: `Semester`
- Kolom A: `ID` (SMT-001, SMT-002, dst.)
- Kolom B: `TahunAjaran` (Contoh: "2026/2027")
- Kolom C: `Semester` (Ganjil / Genap)
- Kolom D: `StatusAktif` (Aktif / Nonaktif)
- Kolom E: `Keterangan`

### Tab 4: `Presensi`
- Kolom A: `ID` (ABS-YYYYMMDD-XXX)
- Kolom B: `Tanggal` (YYYY-MM-DD)
- Kolom C: `NIS`
- Kolom D: `Nama`
- Kolom E: `Kelas`
- Kolom F: `SemesterID`
- Kolom G: `JamMasuk` (HH:mm:ss)
- Kolom H: `JamPulang` (HH:mm:ss)
- Kolom I: `Status` (Hadir / Terlambat / Izin / Sakit / Alfa)
- Kolom J: `Keterangan`

### Tab 5: `Pengaturan`
- Kolom A: `Kunci` (JamMasukMulai, JamMasukBatas, JamPulangMulai, NamaSekolah, AlamatSekolah)
- Kolom B: `Nilai`

### Tab 6: `Pengumuman`
- Kolom A: `ID` (NOT-001, dst.)
- Kolom B: `Judul` (Contoh: "Study Tour Kelas XI", "Classmeeting Semester Ganjil")
- Kolom C: `TanggalAgenda` (YYYY-MM-DD)
- Kolom D: `Kategori` (Trip, Sports, Akademik)
- Kolom E: `Warna` (amber / blue / emerald)

---

## 6. ATURAN VALIDASI & REKAYASA KODE (ENGINEERING STANDARDS)
1. **Modular Scriptlet Include:** Backend `code.gs` menyediakan fungsi `include(filename)` yang dipanggil di `index.html` untuk memuat `css.html` dan `js.html`.
2. **Index-Based Mapping:** Pengambilan data di backend `code.gs` menggunakan konstanta indeks kolom (`const COL_SISWA = { ID: 0, NIS: 1, ... }`) dan pembacaan string murni dengan `getDisplayValues()`.
3. **Safe Migration di `setup.gs`:** Fungsi inisialisasi sheet idempoten, tidak menghapus tab jika sudah ada, dan hanya menyuntikkan data sampel jika tab baru/kosong.
4. **SpreadsheetApp.flush():** Wajib dipanggil pada setiap mutasi data (tambah absen, edit siswa, proses naik kelas) sebelum me-return nilai ke frontend.
5. **Anti-Freeze & Failure Handler:** Seluruh pemanggilan `google.script.run` di frontend dilengkapi `.withFailureHandler()` untuk mencegah tombol macet/mati saat terjadi gangguan koneksi.
6. **Anti-Nested Template Literals:** Tidak ada backtick bersarang di template string.
7. **In-Memory Caching:** Data siswa dan kelas disimpan di memori frontend untuk perpindahan menu super instan (0 detik) dengan invalidasi otomatis saat ada penambahan/perubahan data.

---

## 7. RENCANA ANTARMUKA PENGGUNA (SCHOOL PRIME THEME)
1. **Sidebar Navigasi (Deep Navy Blue `#172554`):**
   - Brand Logo: **School Prime** (Ikon topi wisuda emas).
   - Menu List:
     - 📊 Dashboard Utama
     - 📷 Scan Presensi (Live QR & USB Gun)
     - 👥 Data Siswa & QR
     - 🏫 Data Kelas
     - 📅 Semester & Tahun Ajaran
     - 🚀 Kenaikan Kelas (Promosi Massal)
     - 🪪 Cetak Kartu Siswa (ID Card Standar 8.5 x 5.4 cm)
     - 📋 Rekap & Laporan Kehadiran
     - 📢 Notice Board (Pengumuman)
     - ⚙️ Pengaturan Jam & Sekolah
2. **Dashboard Overview:**
   - Quick Action Cards (Scan Masuk, Scan Pulang, Tambah Siswa, Naik Kelas, Cetak Kartu).
   - Metric Stat Cards: Total Siswa Aktif, Total Kelas, Hadir Hari Ini, Terlambat Hari Ini.
   - Kalender Presensi Interaktif dengan status kehadiran per tanggal.
   - Notice Board bergaya kartu ilustrasi warna-warni (Trip, Sports Day, Ujian).
3. **Halaman Cetak Kartu Siswa:**
   - Desain Kartu Pelajar elegan ukuran 85mm x 54mm (CR80).
   - Dilengkapi kop sekolah, background bertekstur halus, foto siswa, barcode/QR Code tajam, dan stempel sekolah.
   - Opsi cetak: 1 Kartu (Satuan) atau Grid Lembar A4 (berisi 8-10 kartu siap cetak/potong).

---

## 8. KRITERIA PENGUJIAN (TESTING CHECKLIST)
- [ ] Berkas `setup.gs` berhasil membuat 6 tab sheet (`Siswa`, `Kelas`, `Semester`, `Presensi`, `Pengaturan`, `Pengumuman`) tanpa merusak data lama.
- [ ] Berkas terpisah menjadi 5 file: `code.gs`, `setup.gs`, `index.html`, `css.html`, `js.html`.
- [ ] Scriptlet `<?!= include('css'); ?>` dan `<?!= include('js'); ?>` berhasil merender gaya dan skrip secara sempurna.
- [ ] Fitur Semester & Tahun Ajaran aktif berfungsi menentukan konteks akademik presensi.
- [ ] Fitur Naik Kelas mampu memindahkan sekelompok siswa ke kelas baru atau menandai lulus secara serentak.
- [ ] Live Scanner kamera & Scanner USB fisik dapat membaca QR Code kartu siswa.
- [ ] Presensi Masuk mencatat status "Hadir" atau "Terlambat" sesuai pengaturan jam.
- [ ] Presensi Pulang memperbarui jam pulang pada record hari yang sama.
- [ ] Fitur Cetak Kartu Pelajar menghasilkan tata letak proporsional siap print/PDF.
- [ ] Laporan presensi dapat difilter per kelas/tanggal dan diekspor ke format Excel/CSV.

================================================================================
ZONA BAWAH: MASTER CONTEXT & LOGIKA SISTEM TERKINI (LIVING CONTEXT)
================================================================================

- **Status Arsitektur Aktif:** Google Apps Script Modular (5 Berkas: `code.gs`, `setup.gs`, `index.html`, `css.html`, `js.html`) + Google Sheets.
- **Nama Spreadsheet Tabs (Bebas Karakter Underscore):**
  - `Siswa`: ID, NIS, Nama, Kelas, JenisKelamin, Foto, Status, CreatedAt
  - `Kelas`: ID, NamaKelas, Jurusan, Tingkat, WaliKelas
  - `Semester`: ID, TahunAjaran, Semester, StatusAktif, Keterangan
  - `Presensi`: ID, Tanggal, NIS, Nama, Kelas, SemesterID, JamMasuk, JamPulang, Status, Keterangan
  - `Pengaturan`: Kunci, Nilai
  - `Pengumuman`: ID, Judul, TanggalAgenda, Kategori, Warna
- **Logika Akademik & Bisnis Terkini:**
  - Penomoran Otomatis: `SIS-XXX` (Siswa), `KLS-XXX` (Kelas), `SMT-XXX` (Semester), `ABS-YYYYMMDD-XXX` (Presensi).
  - Naik Kelas: Mutasi kolom `Kelas` secara batch pada tab `Siswa`, status siswa lulus diubah menjadi `Lulus`.
  - Toleransi Jam: Jam Masuk (07:00), Batas Telat (07:15), Jam Pulang Mulai (14:00).
- **Log Pembaruan Resmi:**
  - [2026-11-24 v2.1.0] Pemisahan kode menjadi arsitektur Modular 5 Berkas (`index.html`, `css.html`, `js.html`, `code.gs`, `setup.gs`) menggunakan fungsi scriptlet `include()`.
  - [2026-11-24 v2.2.0] Penambahan toolchain Auto-Deploy Google Apps Script berbasis Google Clasp (`appsscript.json`, `.claspignore`, dan skrip otomatis `deploy.bat`).
  - [2026-11-24 v2.2.1] Rekonstruksi struktur semantik HTML `index.html` dan pembersihan tag penutup di `js.html` untuk memulihkan layout dashboard School Prime.
  - [2026-11-24 v2.2.2] Perbaikan permanen warna background Deep Navy `#172554` pada sidebar, konversi link menu navigasi ke tombol semantik anti-sandbox, eliminasi class bentrok `hidden flex` pada seluruh modal dialog (`style="display: none;"`), serta penambahan proteksi `try...catch` pada fungsi `switchView()`.
  - [2026-11-24 v2.2.3] Penyelesaian insiden 'switchView is not defined': Mengabaikan berkas legacy `app.js` dan `style.css` pada `.claspignore` yang sebelumnya memicu `Syntax error: Missing name after . operator. line: 108 file: app` dan menggagalkan push Clasp ke Apps Script. Seluruh 6 berkas modular kini 100% sukses ter-push dan ter-deploy (@8).
  - [2026-11-24 v2.3.0] Arsitektur Resmi GitHub Pages: Mengonversi `index.html` menjadi standar web statis dengan `<link rel="stylesheet" href="style.css">` dan `<script src="app.js"></script>`. Menyiapkan `app.js` dengan pre-configured Default URL backend Apps Script (`AKfycbye38eAR5H1IvkbJwAkkE7M6zjCoBynOfw0DIs2gl7dAV5GVWqGFdzooouy03zHcpwRgQ`), modal konfigurasi API dinamis, dan sinkronisasi seluruh kontrol modal `style.display`. Frontend GitHub Pages kini 100% mandiri dan langsung terkoneksi ke Google Sheets.
  - [2026-11-25 v2.3.2] Smart Hardware Camera Prioritization & Anti-OBS Lock: Menghapus pemilihan hardcode kamera terakhir (`cameras[cameras.length - 1]`) yang selalu mengunci OBS Virtual Camera di Windows. Menambahkan filter pendeteksi kamera fisik/bawaan laptop (`Integrated Camera` / `HD Webcam`), memprioritaskannya di urutan pertama, menyematkan preferensi permanen ke `localStorage ('SCHOOLPRIME_SELECTED_CAMERA')`, serta mengamankan alur pelepasan hardware kamera dengan Promise chaining pada `stopCameraScanner()` untuk mengeliminasi error `NotReadableError: Device in use`. Dropdown pemilih kamera kini memberikan label tegas `(Bawaan / Fisik)` vs `(Virtual)` serta fallback UI ramah jika hardware sedang dikunci aplikasi eksternal.
