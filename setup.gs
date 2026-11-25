/**
 * ================================================================================
 * SchoolPrime QR Attendance System - Database Setup & Safe Migration
 * Platform: Google Apps Script + Google Sheets
 * Standard: ZettBOT Engineering Standards (Safe Migration & Idempotent)
 * (c) 2026 Zettbos. All Rights Reserved.
 * ================================================================================
 */

/**
 * Konfigurasi Skema Database (Nama Tab Sheet Bersih Tanpa Underscore)
 */
var SCHEMA_CONFIG = {
  Siswa: {
    headers: ['ID', 'NIS', 'Nama', 'Kelas', 'JenisKelamin', 'Foto', 'Status', 'CreatedAt', 'FaceDescriptor'],
    seeds: [
      ['SIS-001', '1001', 'Ahmad Rizky Pratama', 'X RPL 1', 'L', '', 'Aktif', '2026-07-15 08:00:00'],
      ['SIS-002', '1002', 'Annisa Fitriani', 'X RPL 1', 'P', '', 'Aktif', '2026-07-15 08:00:00'],
      ['SIS-003', '1003', 'Budi Santoso', 'X RPL 1', 'L', '', 'Aktif', '2026-07-15 08:00:00'],
      ['SIS-004', '1004', 'Citra Dewi Anggraini', 'X RPL 2', 'P', '', 'Aktif', '2026-07-15 08:00:00'],
      ['SIS-005', '1005', 'Dedi Kurniawan', 'XI TKJ 1', 'L', '', 'Aktif', '2026-07-15 08:00:00'],
      ['SIS-006', '1006', 'Eka Rahmawati', 'XI TKJ 1', 'P', '', 'Aktif', '2026-07-15 08:00:00'],
      ['SIS-007', '1007', 'Fajar Ramadhan', 'XII MM 1', 'L', '', 'Aktif', '2026-07-15 08:00:00'],
      ['SIS-008', '1008', 'Gita Permatasari', 'XII MM 1', 'P', '', 'Aktif', '2026-07-15 08:00:00']
    ]
  },
  Kelas: {
    headers: ['ID', 'NamaKelas', 'Jurusan', 'Tingkat', 'WaliKelas'],
    seeds: [
      ['KLS-001', 'X RPL 1', 'Rekayasa Perangkat Lunak', '10', 'Bambang Supriyanto, S.Kom'],
      ['KLS-002', 'X RPL 2', 'Rekayasa Perangkat Lunak', '10', 'Sri Wahyuni, M.Pd'],
      ['KLS-003', 'XI TKJ 1', 'Teknik Komputer Jaringan', '11', 'Hendra Gunawan, S.T'],
      ['KLS-004', 'XI TKJ 2', 'Teknik Komputer Jaringan', '11', 'Nurul Hidayati, S.Pd'],
      ['KLS-005', 'XII MM 1', 'Multimedia / DKV', '12', 'Agus Prasetyo, S.Sn'],
      ['KLS-006', 'XII MM 2', 'Multimedia / DKV', '12', 'Ratna Sari, M.Kom']
    ]
  },
  Semester: {
    headers: ['ID', 'TahunAjaran', 'Semester', 'StatusAktif', 'Keterangan'],
    seeds: [
      ['SMT-001', '2026/2027', 'Ganjil', 'Aktif', 'Tahun Pelajaran 2026/2027 Semester Ganjil'],
      ['SMT-002', '2026/2027', 'Genap', 'Nonaktif', 'Tahun Pelajaran 2026/2027 Semester Genap']
    ]
  },
  Presensi: {
    headers: ['ID', 'Tanggal', 'NIS', 'Nama', 'Kelas', 'SemesterID', 'JamMasuk', 'JamPulang', 'Status', 'Keterangan', 'LokasiGPS'],
    seeds: [
      ['ABS-20261124-001', '2026-11-24', '1001', 'Ahmad Rizky Pratama', 'X RPL 1', 'SMT-001', '06:55:12', '14:05:30', 'Hadir', 'Tepat Waktu'],
      ['ABS-20261124-002', '2026-11-24', '1002', 'Annisa Fitriani', 'X RPL 1', 'SMT-001', '07:22:10', '', 'Terlambat', 'Terlambat 7 menit'],
      ['ABS-20261124-003', '2026-11-24', '1005', 'Dedi Kurniawan', 'XI TKJ 1', 'SMT-001', '07:02:45', '14:10:00', 'Hadir', 'Tepat Waktu']
    ]
  },
  Pengaturan: {
    headers: ['Kunci', 'Nilai'],
    seeds: [
      ['JamMasukMulai', '06:00'],
      ['JamMasukBatas', '07:15'],
      ['JamPulangMulai', '14:00'],
      ['NamaSekolah', 'SMK BINA BANGSA'],
      ['AlamatSekolah', 'Jl. Pendidikan No. 45, Kota Cerdas'],
      ['NamaKepsek', 'Drs. H. Mulyono, M.M.'],
      ['ToleransiMenit', '15'],
      ['LatitudeSekolah', '-6.208763'],
      ['LongitudeSekolah', '106.845599'],
      ['RadiusMeter', '100'],
      ['GpsEnabled', 'false']
    ]
  },
  Pengumuman: {
    headers: ['ID', 'Judul', 'TanggalAgenda', 'Kategori', 'Warna'],
    seeds: [
      ['NOT-001', 'Study Tour & Kunjungan Industri Siswa Kelas XI', '2026-12-10', 'Trip', 'amber'],
      ['NOT-002', 'Pekan Olahraga & Seni (Porseni) Sekolah', '2026-12-18', 'Sports Day', 'blue'],
      ['NOT-003', 'Penilaian Akhir Semester (PAS) Ganjil', '2026-12-01', 'Ujian', 'emerald']
    ]
  }
};

/**
 * Inisialisasi Database Google Sheets Idempoten (Safe Migration)
 * Menjamin sheet tidak dihapus jika sudah ada, hanya menambah kolom baru di paling kanan.
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = Object.keys(SCHEMA_CONFIG);
  var log = [];

  sheetNames.forEach(function(name) {
    var config = SCHEMA_CONFIG[name];
    var sheet = ss.getSheetByName(name);
    var isNew = false;

    if (!sheet) {
      sheet = ss.insertSheet(name);
      isNew = true;
      log.push('Membuat tab baru: ' + name);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (isNew || lastRow === 0) {
      // Sheet baru atau kosong: pasang header dan sampel data
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);

      if (config.seeds && config.seeds.length > 0) {
        sheet.getRange(2, 1, config.seeds.length, config.headers.length).setValues(config.seeds);
        log.push('Menyuntikkan ' + config.seeds.length + ' data sampel awal ke tab ' + name);
      }
    } else {
      // Safe Migration: Sheet sudah ada, periksa sinkronisasi kolom
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
      var missingHeaders = [];

      config.headers.forEach(function(h) {
        if (existingHeaders.indexOf(h) === -1) {
          missingHeaders.push(h);
        }
      });

      if (missingHeaders.length > 0) {
        // Tambahkan kolom baru di sebelah paling kanan tanpa merusak data lama
        sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
        sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
        log.push('Safe Migration: Menambahkan kolom baru ke tab ' + name + ': ' + missingHeaders.join(', '));
      } else {
        log.push('Tab ' + name + ' sudah mutakhir (tidak ada perubahan skema).');
      }
    }
  });

  SpreadsheetApp.flush();
  return {
    status: 'success',
    message: 'Inisialisasi database berhasil!',
    details: log
  };
}

/**
 * Menu Kustom di Google Sheets (Muncul Otomatis Saat Spreadsheet Dibuka)
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Sistem Presensi')
    .addItem('Inisialisasi / Periksa Database', 'setupDatabase')
    .addToUi();
}
