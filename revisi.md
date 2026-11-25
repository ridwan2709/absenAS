# RENCANA REVISI SISTEM (REVISI v2.3.2 - PRIORITAS KAMERA BAWAAN LAPTOP & ANTI-OBS VIRTUAL LOCK)
================================================================================
STATUS: SELESAI DITERAPKAN (APPLIED & VERIFIED)
TANGGAL: 25 November 2026
ENGINE: ZettBOT Core v4.1 (by Zettbos)
MASALAH UTAMA:
1. Kamera selalu otomatis memilih "OBS Virtual Camera" dan tidak mau berpindah ke kamera bawaan laptop.
2. Terjadi "NotReadableError: Device in use" saat berpindah kamera karena race condition pada hardware lock.
================================================================================

## 1. ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS)

1. **Akar Masalah Selalu Memilih "OBS Virtual Camera":**
   - Pada `app.js` (dan `js.html`) baris 416, terdapat kode:
     ```javascript
     appState.selectedCameraId = cameras[cameras.length - 1].id;
     ```
   - Kode ini secara sengaja diprogram mengambil kamera **terakhir** pada daftar (`cameras.length - 1`).
   - Pada sistem operasi Windows, driver kamera virtual (seperti OBS Virtual Camera) hampir selalu didaftarkan oleh sistem di urutan paling akhir.
   - Akibatnya, sistem selalu mengabaikan webcam fisik bawaan laptop dan memaksa menyalakan OBS Virtual Camera.

2. **Akar Masalah Mengapa Kamera Tidak Mau Dipindah (Pilihan Pengguna Tertimpa):**
   - Saat pengguna memilih kamera bawaan laptop di dropdown, fungsi `switchCamera` memanggil `stopCameraScanner()` lalu `setTimeout(startCameraScanner, 400)`.
   - Ketika `startCameraScanner()` dipanggil kembali, baris 416 mengeksekusi ulang `cameras[cameras.length - 1].id`, sehingga **pilihan pengguna langsung ditimpa balik secara otomatis ke OBS Virtual Camera**.

3. **Akar Masalah `NotReadableError: Device in use` Saat Berpindah:**
   - Pemanggilan `stopCameraScanner()` bersifat *asynchronous* (Promise).
   - Penggunaan jeda `setTimeout(400)` tanpa menunggu Promise `stop()` selesai menyebabkan kamera baru mencoba menyala saat kamera lama belum sepenuhnya melepaskan kunci hardware (*hardware lock contention*).

---

## 2. RENCANA TINDAKAN PERBAIKAN (SURGICAL FIX v2.3.2)

### A. Prioritas Kamera Fisik Bawaan Laptop (Smart Camera Auto-Detect):
1. **Penyaringan Otomatis Kamera Fisik:**
   - Sistem akan menyaring daftar kamera dan memprioritaskan kamera yang **bukan** OBS dan **bukan** Virtual Camera.
   - Kamera bawaan laptop (Integrated Camera / HD Webcam) akan otomatis menjadi pilihan utama secara default.
2. **Penyimpanan Preferensi Pengguna (`localStorage`):**
   - Pilihan kamera pengguna akan disimpan di `localStorage ('SCHOOLPRIME_SELECTED_CAMERA')`.
   - Sekali Anda memilih Kamera Bawaan Laptop, sistem akan mengingatnya secara permanen dan tidak akan pernah berpindah sendiri ke OBS.
3. **Label Jelas pada Dropdown:**
   - Di dropdown pemilih kamera, opsi akan diberi label jelas:
     - `Integrated Camera (Kamera Bawaan / Fisik)`
     - `OBS Virtual Camera (Virtual)`

### B. Perpindahan Kamera Berbasis Promise Aman (Zero Race Condition):
1. Fungsi `stopCameraScanner()` akan me-return Promise.
2. Fungsi `switchCamera()` akan menunggu Promise pelepasan hardware selesai 100% sebelum menyalakan kamera yang baru dipilih, meniadakan error `Device in use`.

### C. Penanganan Error Kotak Scanner:
1. Jika kamera sedang dikunci software lain, kotak scanner menampilkan kartu instruksi ramah dengan tombol "🔄 Coba Hubungkan Ulang".

---

## 3. BERKAS YANG TERDAMPAK
- `app.js`: Logika deteksi kamera fisik, preferensi localStorage, dan Promise-safe switching.
- `js.html`: Sinkronisasi logika yang sama untuk versi Apps Script modular.

---

## 4. CARA PENGUJIAN SETELAH DITERAPKAN
1. Setelah diterapkan dan di-push ke GitHub Pages:
2. Buka menu Scan Presensi.
3. Kamera bawaan laptop Anda akan langsung menyala secara default (bukan OBS).
4. Anda dapat dengan bebas mengganti kamera pada dropdown tanpa ditimpa balik atau mengalami error `Device in use`.
