# RENCANA IMPLEMENTASI REVISI: DEPLOY KE GITHUB PAGES + BACKEND GOOGLE APPS SCRIPT
================================================================================
TANGGAL PENGAJUAN: 24 November 2026
ENGINE: ZettBOT Core v4.1 (by Zettbos)
STATUS: MENUNGGU PERSETUJUAN (PENDING APPROVAL)
================================================================================

## 1. AKAR MASALAH (ROOT CAUSE)
- **Kendala Browser:**
  Web App Google Apps Script berjalan di dalam `iframe sandbox` milik domain Google (`googleusercontent.com`).
  Kebijakan keamanan browser modern (khususnya Chrome, Edge, Safari) membatasi akses streaming video kamera live (`navigator.mediaDevices.getUserMedia`) di dalam iframe lintas-domain (*cross-origin sandbox*), sehingga pemindai QR kamera sering gagal atau terblokir izinnya.
- **Kebutuhan Pengguna:**
  Memindahkan antarmuka pengguna (Frontend) ke **GitHub Pages (HTTPS mandiri)** agar izin kamera terbuka 100% tanpa batas sandbox, sementara database tetap menggunakan **Google Sheets** dengan **Google Apps Script sebagai Backend REST API**.

---

## 2. ARSITEKTUR SOLUSI (HEADLESS GOOGLE APPS SCRIPT + GITHUB PAGES)
1. **Frontend (GitHub Pages):**
   - Di-host gratis di GitHub Pages dengan sertifikat SSL/HTTPS resmi (`https://<username>.github.io/<nama-repo>`).
   - Browser memberikan izin penuh untuk webcam laptop dan kamera HP karena halaman berjalan di konteks window utama (bukan iframe).
   - Berkas frontend statis: `index.html` mandiri (bebas dari scriptlet Apps Script `<?!= include() ?>`) yang terhubung langsung ke URL Google Apps Script API via `fetch()` asinkronus.
   - Tetap memiliki tampilan presisi **School Prime** (Deep Navy, Amber Gold, kalender, notice board, cetak kartu CR80, dual scanner).

2. **Backend (Google Apps Script API di Google Sheets):**
   - Berkas `code.gs` diperbarui agar mendukung **REST API JSON**:
     - `doGet(e)`: Menerima request parameter `?action=...` (dashboard, siswa, kelas, semester, laporan) dan mengembalikan JSON murni.
     - `doPost(e)`: Menerima payload JSON untuk transaksi presensi, simpan siswa, naik kelas, dan pengaturan menggunakan `ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON)`.
   - Menghilangkan batasan CORS sehingga frontend di GitHub Pages dapat berkomunikasi bebas dengan spreadsheet sekolah.
   - Seluruh data tetap tersimpan 100% aman di akun Google Sheets sekolah pengguna.

---

## 3. BERKAS YANG AKAN DIUBAH / DIBUAT
1. **`code.gs`**:
   - Menambahkan router API JSON pada `doGet(e)` dan `doPost(e)`.
   - Mengubah fungsi-fungsi agar mengembalikan respon JSON terstandarisasi untuk client eksternal.
2. **`index.html` (Versi Mandiri untuk GitHub Pages)**:
   - Menghilangkan scriptlet `<?!= include('css') ?>` dan `<?!= include('js') ?>` (disatukan menjadi file statis siap render di web server manapun).
   - Mengubah mekanisme pemanggilan data dari `google.script.run` menjadi `fetch(GAS_API_URL, ...)`.
   - Menyediakan kolom input URL Web App di modal Pengaturan agar pengguna cukup menempelkan URL `/exec` sekali saja dan tersimpan di `localStorage`.
3. **`README.md` & Skrip Push Git**:
   - Panduan langkah demi langkah menyambungkan repo lokal ke akun GitHub Anda dan mengaktifkan sakelar GitHub Pages.

---

## 4. ESTIMASI DAMPAK & RISIKO
- **Dampak Positif:**
  - Kamera Live Scanner (Webcam/HP) bekerja 100% mulus tanpa terhalang izin sandbox iframe.
  - Kecepatan pemindaian QR meningkat drastis.
  - Aplikasi bisa diakses lewat domain yang lebih rapi (misal: `https://sekolah.github.io/absen-siswa`).
  - Database Google Sheets tetap berjalan seperti semula tanpa biaya sewa server.
- **Risiko & Mitigasi:**
  - Pengguna perlu menempelkan URL Web App Google Apps Script ke dalam pengaturan aplikasi sekali saja agar frontend GitHub tahu ke mana harus menyimpan data presensi.

---

## 5. GERBANG PERSETUJUAN
Rencana teknis telah dituangkan secara lengkap ke dalam file ini (`revisi.md`).
Apakah rencana arsitektur ini sudah sesuai dengan yang Anda inginkan?
Jika sudah mantap dan siap saya buatkan kodenya, silakan balas: **"OKE TERAPKAN"**.
