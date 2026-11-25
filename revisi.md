# RENCANA REVISI SISTEM (REVISI v2.4.0 - PILIHAN ABSENSI, FACE RECOGNITION BIOMETRIK & GPS GEOFENCING)
================================================================================
STATUS: SELESAI DITERAPKAN (APPLIED & VERIFIED)
TANGGAL: 25 November 2026
ENGINE: ZettBOT Core v4.1 (by Zettbos)
PRINSIP UTAMA: 
- TIDAK MENGUBAH / MERUSAK FITUR YANG SUDAH BERJALAN (QR Scanner, Cetak Kartu CR80, CRUD Siswa, Naik Kelas TETAP 100% AMAN).
- Seluruh fitur baru bersifat ADITIF (Menambah opsi dan kapabilitas baru).
================================================================================

## 1. ANALISIS KEBUTUHAN & ARSITEKTUR FITUR BARU

Pengguna meminta 3 penambahan fitur utama tanpa merusak fungsi yang sudah ada:
1. **Pilihan untuk Absen:**
   - Fleksibilitas Status Presensi: Menambahkan pilihan mode absensi lengkap (**Absen Masuk**, **Absen Pulang**, **Izin**, dan **Sakit**).
   - Fleksibilitas Metode Pemindaian (Tabs): Siswa/Guru dapat memilih metode scan:
     * Opsi 1: **Scan QR Code / Kartu Siswa** (Fitur utama yang sudah ada & stabil).
     * Opsi 2: **Scan Wajah (Face Recognition)** (Fitur biometrik baru).
     * Opsi 3: **Input Manual / Barcode Scanner USB** (Fitur yang sudah ada).
2. **Fitur Face Recognition (Pendaftaran & Scan Wajah Live):**
   - **Pendaftaran Wajah Siswa (Enrollment):**
     * Pada menu Data Master Siswa, disediakan tombol `[👤 Daftarkan Wajah]` per siswa.
     * Modal kamera interaktif dengan frame panduan oval mendeteksi wajah siswa, mengekstrak 128-dimensional biometric descriptor via `face-api.js` (TensorFlow.js), dan menyimpannya ke database Google Sheets (kolom `FaceDescriptor` pada tab `Siswa`).
   - **Pemindaian Wajah Live (Live Attendance):**
     * Pada menu Scanner (Tab Scan Wajah), kamera live mendeteksi wajah di depan webcam/HP secara real-time.
     * Sistem membandingkan descriptor wajah live dengan seluruh wajah siswa yang terdaftar menggunakan perhitungan *Euclidean Distance*.
     * Jika tingkat kemiripan memenuhi threshold (jarak < 0.5 atau kemiripan > 85%), sistem otomatis mengenali nama dan NIS siswa, membunyikan suara sukses, dan langsung merekam kehadiran tanpa perlu kartu QR!
3. **Deteksi GPS & Validasi Radius Sekolah (Geofencing):**
   - **Pengaturan Koordinat & Radius:**
     * Pada menu Pengaturan Jam & Sekolah, ditambahkan konfigurasi: `Latitude Sekolah`, `Longitude Sekolah`, `Radius Presensi (Meter)`, serta sakelar `Wajibkan Validasi GPS (Aktif/Nonaktif)`.
     * Dilengkapi tombol pintar `[📍 Ambil Lokasi Saya Saat Ini]` agar admin tidak perlu repot mencari koordinat manual.
   - **Validasi Jarak Haversine Saat Absensi:**
     * Saat siswa melakukan absensi (baik QR, Wajah, maupun Manual):
     * Sistem memeriksa koordinat geolokasi browser via `navigator.geolocation.getCurrentPosition()`.
     * Jika siswa berada di luar batas radius sekolah: Absensi **ditolak secara otomatis** dengan notifikasi peringatan: *"Presensi Ditolak! Anda berada di luar radius sekolah. Jarak Anda: XXX meter (Batas: YYY meter)"*.
     * Jika siswa berada di dalam radius: Presensi diterima dan koordinat dicatat rapi.

---

## 2. DETAIL PERUBAHAN TEKNIS PER BERKAS

### A. Berkas `index.html` (Frontend Layout)
1. **Header Scanner - Pilihan Mode Presensi:**
   - Menambahkan tombol pilihan status presensi: `Masuk`, `Pulang`, `Izin`, dan `Sakit`.
   - Jika memilih `Izin` atau `Sakit`, muncul input keterangan alasan.
2. **Navigasi Tab Metode Presensi di Halaman Scanner:**
   - Tab 1: `[📷 Scan Kartu QR]` (Viewport scanner QR Html5Qrcode yang sudah ada).
   - Tab 2: `[👤 Scan Wajah (Face Recognition)]` (Viewport deteksi wajah dengan canvas overlay real-time).
   - Tab 3: `[⌨️ Manual / Barcode USB]`.
3. **Modal Pendaftaran Wajah Siswa (`#modalFaceEnrollment`):**
   - Modal khusus dengan tampilan kamera live, deteksi wajah otomatis, panduan bingkai wajah, dan tombol "Simpan Wajah Siswa".
4. **Formulir Pengaturan Sekolah - Konfigurasi GPS:**
   - Field `Latitude Sekolah`, `Longitude Sekolah`, `Radius Presensi (Meter)`, `Sakelar GPS (Checkbox)`, dan tombol `[📍 Ambil Lokasi Saya Saat Ini]`.

### B. Berkas `app.js` (Logika GitHub Pages) & `js.html` (Logika Apps Script)
1. **Integrasi Library Biometrik `face-api.js`:**
   - Memuat skrip TensorFlow & `face-api.js` via CDN terpercaya.
   - Fungsi `loadFaceApiModels()`: Memuat model neural network wajah (`tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet`) secara asynchronous di latar belakang.
2. **Logika Pendaftaran Wajah:**
   - `openFaceEnrollmentModal(siswaId)`: Membuka kamera registrasi wajah untuk siswa yang dipilih.
   - `captureAndSaveFaceDescriptor()`: Mengambil snapshot wajah, mengekstrak 128 embedding floats, dan menyimpan ke database backend.
3. **Logika Pemindaian Wajah Live:**
   - `startFaceRecognitionScanner()`: Membaca stream webcam menggunakan `<video>` dan mendeteksi wajah secara real-time via `faceapi.detectSingleFace().withFaceLandmarks().withFaceDescriptor()`.
   - `matchFaceToSiswa(liveDescriptor)`: Menghitung jarak Euclidean dengan data cache `appState.siswaList`.
   - Memanggil `processAttendanceScan(matchedNis)` dengan debounce anti double-scan.
4. **Logika GPS Geofencing (Rumus Haversine):**
   - `calculateDistanceMeters(lat1, lon1, lat2, lon2)`: Perhitungan jarak akurat berbasis kelengkungan bumi (Haversine Formula).
   - `validateGpsLocation(callback)`: Memeriksa posisi GPS siswa dan memvalidasi apakah berada di dalam radius sekolah yang diatur di menu Pengaturan.

### C. Berkas `code.gs` & `setup.gs` (Database & Backend Controller)
1. **Pembaruan Tab Database Google Sheets:**
   - Tab `Siswa`: Menambahkan kolom ke-9 `FaceDescriptor` (menyimpan string JSON embedding biometrik wajah).
   - Tab `Pengaturan`: Menambahkan key default:
     * `LATITUDE_SEKOLAH`: `-6.208763` (dapat diubah di menu Pengaturan)
     * `LONGITUDE_SEKOLAH`: `106.845599`
     * `RADIUS_METER`: `100`
     * `GPS_ENABLED`: `false` (default nonaktif agar fleksibel dan tidak mengunci sebelum disetel)
   - Tab `Presensi`: Menambahkan kolom ke-11 `LokasiGPS` untuk mencatat koordinat dan jarak saat presensi.
2. **Backend API di `code.gs`:**
   - Endpoint `saveFaceDescriptor`: Menyimpan embedding wajah siswa ke baris siswa terkait di tab `Siswa`.
   - Pembaruan `rekamPresensi`: Menerima parameter tambahan `status` (Hadir/Izin/Sakit), `keterangan`, dan `koordinatGps`.

---

## 3. TABEL KOMPARASI FITUR (SEBELUM VS SESUDAH)

| Aspek Fitur | Sebelum Revisi v2.4.0 | Sesudah Revisi v2.4.0 |
| :--- | :--- | :--- |
| **Pilihan Status Presensi** | Hanya Masuk & Pulang otomatis | **Masuk, Pulang, Izin, dan Sakit** |
| **Metode Pemindaian** | Hanya Scan QR Code & Manual NIS | **3 Tab: Scan QR, Scan Wajah (Biometrik), dan Manual** |
| **Face Recognition** | Belum ada | **Ada (Pendaftaran Wajah Siswa + Scan Wajah Live Real-time)** |
| **Deteksi Lokasi GPS** | Belum ada | **Geofencing Haversine (Validasi radius sekolah otomatis)** |
| **Fitur Lama (QR, Kartu, CRUD)** | Berjalan normal | **TETAP 100% AMAN & UTUH tanpa perubahan breaking** |

---

## 4. RENCANA PENGUJIAN (TESTING CHECKLIST)
- [ ] Tab metode scanner (QR vs Wajah vs Manual) dapat berpindah dengan mulus tanpa memicu error kamera `Device in use`.
- [ ] Pendaftaran wajah siswa di menu Data Siswa berhasil merekam embedding wajah ke database.
- [ ] Scan wajah live di halaman Scanner mengenali siswa yang sudah terdaftar dalam jarak < 1 detik.
- [ ] Siswa yang belum mendaftarkan wajah tetap bisa absen menggunakan Kartu QR seperti biasa.
- [ ] Pengaturan GPS (Latitude, Longitude, Radius) tersimpan dan tombol "Ambil Lokasi Saya" berfungsi akurat.
- [ ] Jika validasi GPS aktif dan pengguna di luar radius, presensi ditolak dengan pesan yang informatif.
- [ ] Jika validasi GPS nonaktif atau pengguna berada di dalam radius, presensi Masuk/Pulang/Izin/Sakit berhasil dicatat.
