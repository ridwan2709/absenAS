/**
 * ================================================================================
 * SchoolPrime QR Attendance System - Backend Controller & API
 * Platform: Google Apps Script Web App
 * Standard: ZettBOT Engineering Standards (Index-Based Mapping, SpreadsheetApp.flush)
 * (c) 2026 Zettbos. All Rights Reserved.
 * ================================================================================
 */

/**
 * Pemetaan Indeks Kolom Baku (Index-Based Mapping - Kebal Modifikasi Label Header)
 */
var COL_SISWA = { ID: 0, NIS: 1, NAMA: 2, KELAS: 3, JK: 4, FOTO: 5, STATUS: 6, CREATED_AT: 7, FACE_DESCRIPTOR: 8 };
var COL_KELAS = { ID: 0, NAMA_KELAS: 1, JURUSAN: 2, TINGKAT: 3, WALI_KELAS: 4 };
var COL_SEMESTER = { ID: 0, TAHUN_AJARAN: 1, SEMESTER: 2, STATUS_AKTIF: 3, KETERANGAN: 4 };
var COL_PRESENSI = { ID: 0, TANGGAL: 1, NIS: 2, NAMA: 3, KELAS: 4, SEMESTER_ID: 5, JAM_MASUK: 6, JAM_PULANG: 7, STATUS: 8, KETERANGAN: 9, LOKASI_GPS: 10 };
var COL_PENGATURAN = { KUNCI: 0, NILAI: 1 };
var COL_PENGUMUMAN = { ID: 0, JUDUL: 1, TANGGAL_AGENDA: 2, KATEGORI: 3, WARNA: 4 };

/**
 * Handler Web App GET (Mendukung Tampilan HTML & Query API Bridge)
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    var args = [];
    if (e.parameter.args) {
      try { args = JSON.parse(e.parameter.args); } catch (ex) { args = [e.parameter.args]; }
    }
    return handleApiRequest(e.parameter.action, args);
  }
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('School Prime - Sistem Presensi QR & Kartu Siswa')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Handler Web App POST (API Bridge untuk GitHub Pages / External Frontend)
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (errJson) {
        body = {};
      }
    }
    if (!body.action && e && e.parameter && e.parameter.action) {
      body = e.parameter;
    }

    var action = body.action || '';
    var args = body.args || [];
    if (typeof args === 'string') {
      try { args = JSON.parse(args); } catch (errArgs) { args = [args]; }
    }

    return handleApiRequest(action, args);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'API Parse Error: ' + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Router Eksekusi API Terpusat
 */
function handleApiRequest(action, args) {
  try {
    var result;
    switch (action) {
      case 'getDashboardData':
        result = getDashboardData();
        break;
      case 'rekamPresensi':
        result = rekamPresensi(args[0]);
        break;
      case 'getSiswaList':
        result = getSiswaList(args[0], args[1]);
        break;
      case 'saveSiswa':
        result = saveSiswa(args[0]);
        break;
      case 'saveFaceDescriptor':
        result = saveFaceDescriptor(args[0]);
        break;
      case 'deleteSiswa':
        result = deleteSiswa(args[0]);
        break;
      case 'getKelasList':
        result = getKelasList();
        break;
      case 'saveKelas':
        result = saveKelas(args[0]);
        break;
      case 'deleteKelas':
        result = deleteKelas(args[0]);
        break;
      case 'getSemesterList':
        result = getSemesterList();
        break;
      case 'saveSemester':
        result = saveSemester(args[0]);
        break;
      case 'setSemesterAktif':
        result = setSemesterAktif(args[0]);
        break;
      case 'getSiswaByKelasForPromotion':
        result = getSiswaByKelasForPromotion(args[0]);
        break;
      case 'prosesKenaikanKelas':
        result = prosesKenaikanKelas(args[0]);
        break;
      case 'getPresensiReport':
        result = getPresensiReport(args[0], args[1], args[2]);
        break;
      case 'getPengumumanList':
        result = getPengumumanList();
        break;
      case 'savePengumuman':
        result = savePengumuman(args[0]);
        break;
      case 'deletePengumuman':
        result = deletePengumuman(args[0]);
        break;
      case 'getPengaturan':
        result = getPengaturan();
        break;
      case 'savePengaturan':
        result = savePengaturan(args[0]);
        break;
      default:
        result = { status: 'error', message: 'Action tidak dikenali: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
- Helper Modular Scriptlet Include (Memuat css.html dan js.html)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
- Helper Akses Sheet Aman
 */
function getSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(sheetName);
  }
  return sheet;
}

/**
- Helper Waktu Zona WIB (Asia/Jakarta)
 */
function getNowJakarta(format) {
  var fmt = format || 'yyyy-MM-dd HH:mm:ss';
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', fmt);
}

/**
- Inisialisasi Otomatis Struktur Tabel & Data Awal Spreadsheet
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schemas = {
    'Siswa': ['ID', 'NIS', 'Nama', 'Kelas', 'JK', 'Foto', 'Status', 'CreatedAt', 'FaceDescriptor'],
    'Kelas': ['ID', 'NamaKelas', 'Jurusan', 'Tingkat', 'WaliKelas'],
    'Semester': ['ID', 'TahunAjaran', 'Semester', 'StatusAktif', 'Keterangan'],
    'Presensi': ['ID', 'Tanggal', 'NIS', 'Nama', 'Kelas', 'SemesterID', 'JamMasuk', 'JamPulang', 'Status', 'Keterangan', 'LokasiGPS'],
    'Pengaturan': ['Kunci', 'Nilai'],
    'Pengumuman': ['ID', 'Judul', 'TanggalAgenda', 'Kategori', 'Warna']
  };

  Object.keys(schemas).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(schemas[name]);
      sheet.getRange(1, 1, 1, schemas[name].length).setFontWeight('bold');
    }
  });

  // Isi data default jika masih kosong
  var klsSheet = ss.getSheetByName('Kelas');
  if (klsSheet.getLastRow() <= 1) {
    klsSheet.appendRow(['KLS-001', 'X RPL 1', 'Rekayasa Perangkat Lunak', '10', 'Bambang Supriyanto, S.Kom']);
    klsSheet.appendRow(['KLS-002', 'XI TKJ 1', 'Teknik Komputer Jaringan', '11', 'Hendra Gunawan, S.T']);
    klsSheet.appendRow(['KLS-003', 'XII MM 1', 'Multimedia / DKV', '12', 'Agus Prasetyo, S.Sn']);
  }

  var smtSheet = ss.getSheetByName('Semester');
  if (smtSheet.getLastRow() <= 1) {
    smtSheet.appendRow(['SMT-001', '2026/2027', 'Ganjil', 'Aktif', 'Semester Berjalan']);
  }

  var setSheet = ss.getSheetByName('Pengaturan');
  if (setSheet.getLastRow() <= 1) {
    setSheet.appendRow(['NamaSekolah', 'SMK BINA BANGSA']);
    setSheet.appendRow(['AlamatSekolah', 'Jl. Pendidikan No. 45']);
    setSheet.appendRow(['NamaKepsek', 'Drs. H. Mulyono, M.M.']);
    setSheet.appendRow(['JamMasukMulai', '06:00']);
    setSheet.appendRow(['JamMasukBatas', '07:15']);
    setSheet.appendRow(['JamPulangMulai', '14:00']);
  }

  SpreadsheetApp.flush();
}

/**
- Helper ID Sekuensial Anti-Tabrakan
 */
function generateNextId(sheetName, prefix, colIndex) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return prefix + '-001';

  var values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getDisplayValues();
  var maxNum = 0;
  values.forEach(function(row) {
    var str = row[0] || '';
    var match = str.match(/\d+$/);
    if (match) {
      var num = parseInt(match[0], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  var nextNum = maxNum + 1;
  var padded = ('000' + nextNum).slice(-3);
  return prefix + '-' + padded;
}

// ================================================================================
// DASHBOARD & OVERVIEW API
// ================================================================================

function getDashboardData() {
  try {
    var todayStr = getNowJakarta('yyyy-MM-dd');
    var siswaSheet = getSheet('Siswa');
    var kelasSheet = getSheet('Kelas');
    var presensiSheet = getSheet('Presensi');
    var pengumumanSheet = getSheet('Pengumuman');
    var semesterSheet = getSheet('Semester');
    var pengaturanSheet = getSheet('Pengaturan');

    // Siswa Aktif
    var siswaRows = siswaSheet.getLastRow() > 1 ? siswaSheet.getRange(2, 1, siswaSheet.getLastRow() - 1, 8).getDisplayValues() : [];
    var totalSiswaAktif = 0;
    siswaRows.forEach(function(r) {
      if (r[COL_SISWA.STATUS] === 'Aktif') totalSiswaAktif++;
    });

    // Total Kelas
    var totalKelas = kelasSheet.getLastRow() > 1 ? kelasSheet.getLastRow() - 1 : 0;

    // Presensi Hari Ini
    var presensiRows = presensiSheet.getLastRow() > 1 ? presensiSheet.getRange(2, 1, presensiSheet.getLastRow() - 1, 10).getDisplayValues() : [];
    var hadirHariIni = 0;
    var terlambatHariIni = 0;
    var pulangHariIni = 0;
    var presensiHariIni = [];

    presensiRows.forEach(function(r) {
      if (r[COL_PRESENSI.TANGGAL] === todayStr) {
        var status = r[COL_PRESENSI.STATUS];
        if (status === 'Hadir') hadirHariIni++;
        if (status === 'Terlambat') terlambatHariIni++;
        if (r[COL_PRESENSI.JAM_PULANG]) pulangHariIni++;

        presensiHariIni.push({
          id: r[COL_PRESENSI.ID],
          tanggal: r[COL_PRESENSI.TANGGAL],
          nis: r[COL_PRESENSI.NIS],
          nama: r[COL_PRESENSI.NAMA],
          kelas: r[COL_PRESENSI.KELAS],
          jamMasuk: r[COL_PRESENSI.JAM_MASUK],
          jamPulang: r[COL_PRESENSI.JAM_PULANG],
          status: r[COL_PRESENSI.STATUS],
          keterangan: r[COL_PRESENSI.KETERANGAN]
        });
      }
    });

    // Pengumuman
    var pengumumanRows = pengumumanSheet.getLastRow() > 1 ? pengumumanSheet.getRange(2, 1, pengumumanSheet.getLastRow() - 1, 5).getDisplayValues() : [];
    var listPengumuman = pengumumanRows.map(function(r) {
      return {
        id: r[COL_PENGUMUMAN.ID],
        judul: r[COL_PENGUMUMAN.JUDUL],
        tanggal: r[COL_PENGUMUMAN.TANGGAL_AGENDA],
        kategori: r[COL_PENGUMUMAN.KATEGORI],
        warna: r[COL_PENGUMUMAN.WARNA]
      };
    });

    // Semester Aktif
    var semesterAktif = { id: '', tahunAjaran: '-', semester: '-' };
    var smtRows = semesterSheet.getLastRow() > 1 ? semesterSheet.getRange(2, 1, semesterSheet.getLastRow() - 1, 5).getDisplayValues() : [];
    smtRows.forEach(function(r) {
      if (r[COL_SEMESTER.STATUS_AKTIF] === 'Aktif') {
        semesterAktif = {
          id: r[COL_SEMESTER.ID],
          tahunAjaran: r[COL_SEMESTER.TAHUN_AJARAN],
          semester: r[COL_SEMESTER.SEMESTER]
        };
      }
    });

    // Pengaturan
    var pengaturan = getPengaturanMap();

    return {
      status: 'success',
      data: {
        today: todayStr,
        todayFormatted: getNowJakarta('dd MMMM yyyy'),
        totalSiswa: totalSiswaAktif,
        totalKelas: totalKelas,
        hadirHariIni: hadirHariIni,
        terlambatHariIni: terlambatHariIni,
        pulangHariIni: pulangHariIni,
        belumAbsen: Math.max(0, totalSiswaAktif - (hadirHariIni + terlambatHariIni)),
        presensiHariIni: presensiHariIni.reverse(),
        pengumuman: listPengumuman,
        semesterAktif: semesterAktif,
        pengaturan: pengaturan
      }
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// ================================================================================
// TRANSAKSI PRESENSI QR & USB SCANNER (MASUK & PULANG)
// ================================================================================

function rekamPresensi(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Kunci transaksi anti-tabrakan multi-scan

    var rawNis = (payload.nis || '').toString().trim();
    var mode = (payload.mode || 'masuk').toLowerCase(); // 'masuk', 'pulang', 'izin', 'sakit'
    var userKet = (payload.keterangan || '').trim();
    var lokasiGps = (payload.lokasiGps || '').trim();

    // Pembersihan jika payload QR berupa format 'SISWA-1001'
    var cleanNis = rawNis.replace(/^SISWA-/i, '').trim();

    var siswaSheet = getSheet('Siswa');
    var siswaRows = siswaSheet.getLastRow() > 1 ? siswaSheet.getRange(2, 1, siswaSheet.getLastRow() - 1, 9).getDisplayValues() : [];
    
    var siswaFound = null;
    for (var i = 0; i < siswaRows.length; i++) {
      if (siswaRows[i][COL_SISWA.NIS] === cleanNis) {
        siswaFound = {
          id: siswaRows[i][COL_SISWA.ID],
          nis: siswaRows[i][COL_SISWA.NIS],
          nama: siswaRows[i][COL_SISWA.NAMA],
          kelas: siswaRows[i][COL_SISWA.KELAS],
          jk: siswaRows[i][COL_SISWA.JK],
          foto: siswaRows[i][COL_SISWA.FOTO],
          status: siswaRows[i][COL_SISWA.STATUS],
          faceDescriptor: siswaRows[i][8] || ''
        };
        break;
      }
    }

    if (!siswaFound) {
      return { status: 'error', code: 'NOT_FOUND', message: 'Siswa dengan NIS ' + cleanNis + ' belum terdaftar!' };
    }

    if (siswaFound.status !== 'Aktif') {
      return { status: 'error', code: 'INACTIVE', message: 'Status siswa ' + siswaFound.nama + ' adalah ' + siswaFound.status + ' (tidak aktif)!' };
    }

    var todayStr = getNowJakarta('yyyy-MM-dd');
    var nowTimeStr = getNowJakarta('HH:mm:ss');
    var pengaturan = getPengaturanMap();
    var batasMasuk = pengaturan.JamMasukBatas || '07:15';

    var presensiSheet = getSheet('Presensi');
    var presensiRows = presensiSheet.getLastRow() > 1 ? presensiSheet.getRange(2, 1, presensiSheet.getLastRow() - 1, 11).getDisplayValues() : [];
    
    var targetRowIdx = -1;
    var existingRecord = null;

    for (var j = 0; j < presensiRows.length; j++) {
      if (presensiRows[j][COL_PRESENSI.TANGGAL] === todayStr && presensiRows[j][COL_PRESENSI.NIS] === cleanNis) {
        targetRowIdx = j + 2; // Row asli di Sheet (1-based, +1 header)
        existingRecord = presensiRows[j];
        break;
      }
    }

    // Ambil ID Semester Aktif
    var semesterAktifId = getSemesterAktifId();

    // Penanganan Mode Izin atau Sakit
    if (mode === 'izin' || mode === 'sakit') {
      var statusKhusus = mode === 'izin' ? 'Izin' : 'Sakit';
      var ketKhusus = userKet || (mode === 'izin' ? 'Izin Siswa' : 'Sakit Siswa');
      if (lokasiGps) ketKhusus += ' [GPS: ' + lokasiGps + ']';

      if (targetRowIdx > 0) {
        presensiSheet.getRange(targetRowIdx, COL_PRESENSI.STATUS + 1).setValue(statusKhusus);
        presensiSheet.getRange(targetRowIdx, COL_PRESENSI.KETERANGAN + 1).setValue(ketKhusus);
        if (presensiSheet.getLastColumn() >= 11) {
          presensiSheet.getRange(targetRowIdx, 11).setValue(lokasiGps);
        }
      } else {
        var newAbsenIdKhusus = 'ABS-' + todayStr.replace(/-/g, '') + '-' + ('000' + (presensiSheet.getLastRow())).slice(-3);
        presensiSheet.appendRow([
          newAbsenIdKhusus,
          todayStr,
          siswaFound.nis,
          siswaFound.nama,
          siswaFound.kelas,
          semesterAktifId,
          nowTimeStr,
          '',
          statusKhusus,
          ketKhusus,
          lokasiGps
        ]);
      }

      SpreadsheetApp.flush();
      return {
        status: 'success',
        mode: mode,
        message: 'Presensi ' + statusKhusus + ' Berhasil Dicatat!',
        siswa: siswaFound,
        jam: nowTimeStr,
        presensiStatus: statusKhusus,
        keterangan: ketKhusus
      };
    }

    if (mode === 'masuk') {
      if (existingRecord && existingRecord[COL_PRESENSI.JAM_MASUK]) {
        return {
          status: 'warning',
          code: 'ALREADY_CHECKED_IN',
          message: siswaFound.nama + ' sudah melakukan Absen Masuk hari ini pukul ' + existingRecord[COL_PRESENSI.JAM_MASUK] + '.',
          siswa: siswaFound,
          jam: existingRecord[COL_PRESENSI.JAM_MASUK],
          presensiStatus: existingRecord[COL_PRESENSI.STATUS]
        };
      }

      // Hitung keterlambatan
      var statusMasuk = 'Hadir';
      var keterangan = 'Tepat Waktu';
      var timeNowParts = nowTimeStr.split(':');
      var batasParts = batasMasuk.split(':');
      var nowMinutes = parseInt(timeNowParts[0], 10) * 60 + parseInt(timeNowParts[1], 10);
      var batasMinutes = parseInt(batasParts[0], 10) * 60 + parseInt(batasParts[1], 10);

      if (nowMinutes > batasMinutes) {
        statusMasuk = 'Terlambat';
        var selisih = nowMinutes - batasMinutes;
        keterangan = 'Terlambat ' + selisih + ' menit';
      }
      if (lokasiGps) keterangan += ' [GPS: ' + lokasiGps + ']';

      if (targetRowIdx > 0) {
        // Update baris yang sudah ada
        presensiSheet.getRange(targetRowIdx, COL_PRESENSI.JAM_MASUK + 1).setValue(nowTimeStr);
        presensiSheet.getRange(targetRowIdx, COL_PRESENSI.STATUS + 1).setValue(statusMasuk);
        presensiSheet.getRange(targetRowIdx, COL_PRESENSI.KETERANGAN + 1).setValue(keterangan);
        if (presensiSheet.getLastColumn() >= 11) {
          presensiSheet.getRange(targetRowIdx, 11).setValue(lokasiGps);
        }
      } else {
        // Buat baris baru
        var newAbsenId = 'ABS-' + todayStr.replace(/-/g, '') + '-' + ('000' + (presensiSheet.getLastRow())).slice(-3);
        presensiSheet.appendRow([
          newAbsenId,
          todayStr,
          siswaFound.nis,
          siswaFound.nama,
          siswaFound.kelas,
          semesterAktifId,
          nowTimeStr,
          '',
          statusMasuk,
          keterangan,
          lokasiGps
        ]);
      }

      SpreadsheetApp.flush();
      return {
        status: 'success',
        mode: 'masuk',
        message: 'Presensi Masuk Berhasil!',
        siswa: siswaFound,
        jam: nowTimeStr,
        presensiStatus: statusMasuk,
        keterangan: keterangan
      };

    } else {
      // Mode PULANG
      if (existingRecord && existingRecord[COL_PRESENSI.JAM_PULANG]) {
        return {
          status: 'warning',
          code: 'ALREADY_CHECKED_OUT',
          message: siswaFound.nama + ' sudah melakukan Absen Pulang hari ini pukul ' + existingRecord[COL_PRESENSI.JAM_PULANG] + '.',
          siswa: siswaFound,
          jam: existingRecord[COL_PRESENSI.JAM_PULANG],
          presensiStatus: existingRecord[COL_PRESENSI.STATUS]
        };
      }

      var ketPulang = 'Pulang';
      if (lokasiGps) ketPulang += ' [GPS: ' + lokasiGps + ']';

      if (targetRowIdx > 0) {
        presensiSheet.getRange(targetRowIdx, COL_PRESENSI.JAM_PULANG + 1).setValue(nowTimeStr);
        if (presensiSheet.getLastColumn() >= 11) {
          presensiSheet.getRange(targetRowIdx, 11).setValue(lokasiGps);
        }
      } else {
        // Belum absen masuk, langsung absen pulang
        var newAbsenIdPulang = 'ABS-' + todayStr.replace(/-/g, '') + '-' + ('000' + (presensiSheet.getLastRow())).slice(-3);
        presensiSheet.appendRow([
          newAbsenIdPulang,
          todayStr,
          siswaFound.nis,
          siswaFound.nama,
          siswaFound.kelas,
          semesterAktifId,
          '',
          nowTimeStr,
          'Hadir',
          'Absen Pulang Saja' + (lokasiGps ? ' [GPS: ' + lokasiGps + ']' : ''),
          lokasiGps
        ]);
      }

      SpreadsheetApp.flush();
      return {
        status: 'success',
        mode: 'pulang',
        message: 'Presensi Pulang Berhasil!',
        siswa: siswaFound,
        jam: nowTimeStr,
        presensiStatus: existingRecord ? existingRecord[COL_PRESENSI.STATUS] : 'Hadir',
        keterangan: ketPulang
      };
    }

  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ================================================================================
// MASTER DATA SISWA & CETAK KARTU
// ================================================================================

function getSiswaList(filterKelas, search) {
  try {
    var sheet = getSheet('Siswa');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getDisplayValues() : [];
    var result = [];

    var fKelas = (filterKelas || '').toLowerCase();
    var fSearch = (search || '').toLowerCase();

    rows.forEach(function(r) {
      var matchKelas = !fKelas || r[COL_SISWA.KELAS].toLowerCase() === fKelas;
      var matchSearch = !fSearch || r[COL_SISWA.NAMA].toLowerCase().indexOf(fSearch) !== -1 || r[COL_SISWA.NIS].toLowerCase().indexOf(fSearch) !== -1;

      if (matchKelas && matchSearch) {
        result.push({
          id: r[COL_SISWA.ID],
          nis: r[COL_SISWA.NIS],
          nama: r[COL_SISWA.NAMA],
          kelas: r[COL_SISWA.KELAS],
          jk: r[COL_SISWA.JK],
          foto: r[COL_SISWA.FOTO],
          status: r[COL_SISWA.STATUS],
          createdAt: r[COL_SISWA.CREATED_AT],
          faceDescriptor: r[8] || ''
        });
      }
    });

    return { status: 'success', data: result };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function saveFaceDescriptor(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Siswa');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getDisplayValues() : [];
    var siswaId = payload.id || '';
    var nis = payload.nis || '';
    var descriptor = payload.descriptor || '';

    var targetRow = -1;
    for (var i = 0; i < rows.length; i++) {
      if ((siswaId && rows[i][0] === siswaId) || (nis && rows[i][1] === nis)) {
        targetRow = i + 2;
        break;
      }
    }

    if (targetRow === -1) {
      return { status: 'error', message: 'Siswa tidak ditemukan untuk registrasi wajah!' };
    }

    sheet.getRange(targetRow, 9).setValue(descriptor);
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Biometrik wajah siswa berhasil disimpan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function saveSiswa(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Siswa');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues() : [];

    var nis = (data.nis || '').trim();
    var nama = (data.nama || '').trim();
    var kelas = (data.kelas || '').trim();
    var jk = (data.jk || 'L').trim();
    var foto = (data.foto || '').trim();
    var status = (data.status || 'Aktif').trim();

    if (!nis || !nama || !kelas) {
      return { status: 'error', message: 'NIS, Nama, dan Kelas wajib diisi!' };
    }

    if (data.id) {
      // Mode Edit
      var foundIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][COL_SISWA.ID] === data.id) {
          foundIdx = i + 2;
          break;
        }
      }

      if (foundIdx === -1) {
        return { status: 'error', message: 'Data siswa tidak ditemukan!' };
      }

      // Cek duplikasi NIS pada siswa lain
      for (var k = 0; k < rows.length; k++) {
        if (rows[k][COL_SISWA.NIS] === nis && rows[k][COL_SISWA.ID] !== data.id) {
          return { status: 'error', message: 'NIS ' + nis + ' sudah digunakan oleh siswa lain!' };
        }
      }

      sheet.getRange(foundIdx, COL_SISWA.NIS + 1).setValue(nis);
      sheet.getRange(foundIdx, COL_SISWA.NAMA + 1).setValue(nama);
      sheet.getRange(foundIdx, COL_SISWA.KELAS + 1).setValue(kelas);
      sheet.getRange(foundIdx, COL_SISWA.JK + 1).setValue(jk);
      sheet.getRange(foundIdx, COL_SISWA.FOTO + 1).setValue(foto);
      sheet.getRange(foundIdx, COL_SISWA.STATUS + 1).setValue(status);
    } else {
      // Mode Tambah Baru
      for (var m = 0; m < rows.length; m++) {
        if (rows[m][COL_SISWA.NIS] === nis) {
          return { status: 'error', message: 'NIS ' + nis + ' sudah terdaftar!' };
        }
      }

      var newId = generateNextId('Siswa', 'SIS', COL_SISWA.ID);
      var createdAt = getNowJakarta();
      sheet.appendRow([newId, nis, nama, kelas, jk, foto, status, createdAt]);
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Data siswa berhasil disimpan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteSiswa(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Siswa');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues() : [];

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][COL_SISWA.ID] === id) {
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { status: 'success', message: 'Siswa berhasil dihapus!' };
      }
    }
    return { status: 'error', message: 'Data siswa tidak ditemukan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ================================================================================
// MASTER DATA KELAS
// ================================================================================

function getKelasList() {
  try {
    var sheet = getSheet('Kelas');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];
    var result = rows.map(function(r) {
      return {
        id: r[COL_KELAS.ID],
        namaKelas: r[COL_KELAS.NAMA_KELAS],
        jurusan: r[COL_KELAS.JURUSAN],
        tingkat: r[COL_KELAS.TINGKAT],
        waliKelas: r[COL_KELAS.WALI_KELAS]
      };
    });
    return { status: 'success', data: result };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function saveKelas(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Kelas');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];

    var namaKelas = (data.namaKelas || '').trim();
    var jurusan = (data.jurusan || '').trim();
    var tingkat = (data.tingkat || '').trim();
    var waliKelas = (data.waliKelas || '').trim();

    if (!namaKelas) return { status: 'error', message: 'Nama kelas wajib diisi!' };

    if (data.id) {
      var foundIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][COL_KELAS.ID] === data.id) {
          foundIdx = i + 2;
          break;
        }
      }
      if (foundIdx === -1) return { status: 'error', message: 'Data kelas tidak ditemukan!' };

      sheet.getRange(foundIdx, COL_KELAS.NAMA_KELAS + 1).setValue(namaKelas);
      sheet.getRange(foundIdx, COL_KELAS.JURUSAN + 1).setValue(jurusan);
      sheet.getRange(foundIdx, COL_KELAS.TINGKAT + 1).setValue(tingkat);
      sheet.getRange(foundIdx, COL_KELAS.WALI_KELAS + 1).setValue(waliKelas);
    } else {
      var newId = generateNextId('Kelas', 'KLS', COL_KELAS.ID);
      sheet.appendRow([newId, namaKelas, jurusan, tingkat, waliKelas]);
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Data kelas berhasil disimpan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteKelas(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Kelas');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][COL_KELAS.ID] === id) {
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { status: 'success', message: 'Kelas berhasil dihapus!' };
      }
    }
    return { status: 'error', message: 'Data kelas tidak ditemukan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ================================================================================
// MODUL SEMESTER & TAHUN AJARAN
// ================================================================================

function getSemesterList() {
  try {
    var sheet = getSheet('Semester');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];
    var result = rows.map(function(r) {
      return {
        id: r[COL_SEMESTER.ID],
        tahunAjaran: r[COL_SEMESTER.TAHUN_AJARAN],
        semester: r[COL_SEMESTER.SEMESTER],
        statusAktif: r[COL_SEMESTER.STATUS_AKTIF],
        keterangan: r[COL_SEMESTER.KETERANGAN]
      };
    });
    return { status: 'success', data: result };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function saveSemester(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Semester');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];

    var tahunAjaran = (data.tahunAjaran || '').trim();
    var semester = (data.semester || 'Ganjil').trim();
    var statusAktif = (data.statusAktif || 'Nonaktif').trim();
    var keterangan = (data.keterangan || '').trim();

    if (!tahunAjaran) return { status: 'error', message: 'Tahun Ajaran wajib diisi!' };

    if (statusAktif === 'Aktif') {
      // Nonaktifkan semester lain
      for (var k = 0; k < rows.length; k++) {
        sheet.getRange(k + 2, COL_SEMESTER.STATUS_AKTIF + 1).setValue('Nonaktif');
      }
    }

    if (data.id) {
      var foundIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][COL_SEMESTER.ID] === data.id) {
          foundIdx = i + 2;
          break;
        }
      }
      if (foundIdx === -1) return { status: 'error', message: 'Data semester tidak ditemukan!' };

      sheet.getRange(foundIdx, COL_SEMESTER.TAHUN_AJARAN + 1).setValue(tahunAjaran);
      sheet.getRange(foundIdx, COL_SEMESTER.SEMESTER + 1).setValue(semester);
      sheet.getRange(foundIdx, COL_SEMESTER.STATUS_AKTIF + 1).setValue(statusAktif);
      sheet.getRange(foundIdx, COL_SEMESTER.KETERANGAN + 1).setValue(keterangan);
    } else {
      var newId = generateNextId('Semester', 'SMT', COL_SEMESTER.ID);
      sheet.appendRow([newId, tahunAjaran, semester, statusAktif, keterangan]);
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Semester & Tahun Ajaran berhasil disimpan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function setSemesterAktif(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Semester');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];

    for (var i = 0; i < rows.length; i++) {
      var currentId = rows[i][COL_SEMESTER.ID];
      sheet.getRange(i + 2, COL_SEMESTER.STATUS_AKTIF + 1).setValue(currentId === id ? 'Aktif' : 'Nonaktif');
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Semester aktif berhasil diperbarui!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function getSemesterAktifId() {
  var sheet = getSheet('Semester');
  var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][COL_SEMESTER.STATUS_AKTIF] === 'Aktif') {
      return rows[i][COL_SEMESTER.ID];
    }
  }
  return 'SMT-001';
}

// ================================================================================
// MODUL NAIK KELAS (PROMOSI MASSAL & KELULUSAN)
// ================================================================================

function getSiswaByKelasForPromotion(kelasNama) {
  try {
    var sheet = getSheet('Siswa');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues() : [];
    var result = [];

    rows.forEach(function(r) {
      if (r[COL_SISWA.KELAS] === kelasNama && r[COL_SISWA.STATUS] === 'Aktif') {
        result.push({
          id: r[COL_SISWA.ID],
          nis: r[COL_SISWA.NIS],
          nama: r[COL_SISWA.NAMA],
          kelas: r[COL_SISWA.KELAS],
          jk: r[COL_SISWA.JK]
        });
      }
    });

    return { status: 'success', data: result };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function prosesKenaikanKelas(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheet('Siswa');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues() : [];

    var aksi = payload.aksi; // 'naik', 'lulus', 'tinggal'
    var kelasTujuan = (payload.kelasTujuan || '').trim();
    var siswaIds = payload.siswaIds || []; // Array of ID: ['SIS-001', 'SIS-002']

    if (!siswaIds || siswaIds.length === 0) {
      return { status: 'error', message: 'Pilih minimal satu siswa untuk diproses!' };
    }

    if (aksi === 'naik' && !kelasTujuan) {
      return { status: 'error', message: 'Pilih kelas tujuan untuk kenaikan kelas!' };
    }

    var updatedCount = 0;
    for (var i = 0; i < rows.length; i++) {
      var currentId = rows[i][COL_SISWA.ID];
      if (siswaIds.indexOf(currentId) !== -1) {
        var rowNum = i + 2;

        if (aksi === 'naik') {
          sheet.getRange(rowNum, COL_SISWA.KELAS + 1).setValue(kelasTujuan);
          updatedCount++;
        } else if (aksi === 'lulus') {
          sheet.getRange(rowNum, COL_SISWA.STATUS + 1).setValue('Lulus');
          updatedCount++;
        } else if (aksi === 'tinggal') {
          // Tetap di kelas yang sama
          updatedCount++;
        }
      }
    }

    SpreadsheetApp.flush();
    return {
      status: 'success',
      message: 'Berhasil memproses ' + updatedCount + ' siswa (' + (aksi === 'naik' ? 'Naik ke ' + kelasTujuan : (aksi === 'lulus' ? 'Dinyatakan Lulus' : 'Tinggal Kelas')) + ')!'
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ================================================================================
// REKAP & LAPORAN PRESENSI
// ================================================================================

function getPresensiReport(filterDate, filterKelas, filterStatus) {
  try {
    var sheet = getSheet('Presensi');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getDisplayValues() : [];
    var result = [];

    var fDate = (filterDate || '').trim();
    var fKelas = (filterKelas || '').toLowerCase();
    var fStatus = (filterStatus || '').toLowerCase();

    rows.forEach(function(r) {
      var matchDate = !fDate || r[COL_PRESENSI.TANGGAL] === fDate;
      var matchKelas = !fKelas || r[COL_PRESENSI.KELAS].toLowerCase() === fKelas;
      var matchStatus = !fStatus || r[COL_PRESENSI.STATUS].toLowerCase() === fStatus;

      if (matchDate && matchKelas && matchStatus) {
        result.push({
          id: r[COL_PRESENSI.ID],
          tanggal: r[COL_PRESENSI.TANGGAL],
          nis: r[COL_PRESENSI.NIS],
          nama: r[COL_PRESENSI.NAMA],
          kelas: r[COL_PRESENSI.KELAS],
          semesterId: r[COL_PRESENSI.SEMESTER_ID],
          jamMasuk: r[COL_PRESENSI.JAM_MASUK],
          jamPulang: r[COL_PRESENSI.JAM_PULANG],
          status: r[COL_PRESENSI.STATUS],
          keterangan: r[COL_PRESENSI.KETERANGAN]
        });
      }
    });

    return { status: 'success', data: result.reverse() };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// ================================================================================
// PENGUMUMAN & PENGATURAN
// ================================================================================

function getPengumumanList() {
  try {
    var sheet = getSheet('Pengumuman');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];
    var result = rows.map(function(r) {
      return {
        id: r[COL_PENGUMUMAN.ID],
        judul: r[COL_PENGUMUMAN.JUDUL],
        tanggalAgenda: r[COL_PENGUMUMAN.TANGGAL_AGENDA],
        kategori: r[COL_PENGUMUMAN.KATEGORI],
        warna: r[COL_PENGUMUMAN.WARNA]
      };
    });
    return { status: 'success', data: result };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function savePengumuman(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Pengumuman');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];

    var judul = (data.judul || '').trim();
    var tanggalAgenda = (data.tanggalAgenda || getNowJakarta('yyyy-MM-dd')).trim();
    var kategori = (data.kategori || 'Umum').trim();
    var warna = (data.warna || 'blue').trim();

    if (!judul) return { status: 'error', message: 'Judul pengumuman wajib diisi!' };

    if (data.id) {
      var foundIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][COL_PENGUMUMAN.ID] === data.id) {
          foundIdx = i + 2;
          break;
        }
      }
      if (foundIdx === -1) return { status: 'error', message: 'Pengumuman tidak ditemukan!' };

      sheet.getRange(foundIdx, COL_PENGUMUMAN.JUDUL + 1).setValue(judul);
      sheet.getRange(foundIdx, COL_PENGUMUMAN.TANGGAL_AGENDA + 1).setValue(tanggalAgenda);
      sheet.getRange(foundIdx, COL_PENGUMUMAN.KATEGORI + 1).setValue(kategori);
      sheet.getRange(foundIdx, COL_PENGUMUMAN.WARNA + 1).setValue(warna);
    } else {
      var newId = generateNextId('Pengumuman', 'NOT', COL_PENGUMUMAN.ID);
      sheet.appendRow([newId, judul, tanggalAgenda, kategori, warna]);
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Pengumuman berhasil disimpan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deletePengumuman(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Pengumuman');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues() : [];

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][COL_PENGUMUMAN.ID] === id) {
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { status: 'success', message: 'Pengumuman berhasil dihapus!' };
      }
    }
    return { status: 'error', message: 'Pengumuman tidak ditemukan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function getPengaturanMap() {
  var sheet = getSheet('Pengaturan');
  var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues() : [];
  var map = {};
  rows.forEach(function(r) {
    if (r[COL_PENGATURAN.KUNCI]) {
      map[r[COL_PENGATURAN.KUNCI]] = r[COL_PENGATURAN.NILAI];
    }
  });
  return map;
}

function getPengaturan() {
  try {
    return { status: 'success', data: getPengaturanMap() };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function savePengaturan(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Pengaturan');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues() : [];

    var keys = Object.keys(data);
    keys.forEach(function(key) {
      var val = data[key];
      var foundIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][COL_PENGATURAN.KUNCI] === key) {
          foundIdx = i + 2;
          break;
        }
      }

      if (foundIdx > 0) {
        sheet.getRange(foundIdx, COL_PENGATURAN.NILAI + 1).setValue(val);
      } else {
        sheet.appendRow([key, val]);
      }
    });

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Pengaturan berhasil disimpan!' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}