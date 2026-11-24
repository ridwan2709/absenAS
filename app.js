/**
 * ==============================================================================
 * SchoolPrime QR Attendance System - Frontend Application Logic (GitHub Pages Edition)
 * REST API Client for Google Apps Script Backend & Google Sheets Database
 * Standard: ZettBOT Engineering Standards (In-Memory Cache, Anti-Freeze, Dual Scan)
 * (c) 2026 Zettbos. All Rights Reserved.
 * ==============================================================================
 */

var GAS_API_URL_KEY = 'SCHOOLPRIME_GAS_API_URL';

// Global State Store
var appState = {
  currentView: 'dashboard',
  scannerMode: 'masuk', // 'masuk' atau 'pulang'
  scannerDebounceTime: 0,
  lastScannedNis: '',
  html5QrCode: null,
  isCameraRunning: false,
  availableCameras: [],
  selectedCameraId: null,
  usbBuffer: '',
  usbLastKeyTime: 0,
  // In-Memory Caches
  dashboardData: null,
  siswaList: [],
  kelasList: [],
  semesterList: [],
  pengumumanList: [],
  pengaturan: {}
};

// ==============================================================================
// REST API BRIDGE (FETCH CLIENT KE GOOGLE APPS SCRIPT)
// ==============================================================================
function getGasApiUrl() {
  return localStorage.getItem(GAS_API_URL_KEY) || '';
}

function setGasApiUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem(GAS_API_URL_KEY, url.trim());
    updateApiStatusUI();
  } else {
    localStorage.removeItem(GAS_API_URL_KEY);
    updateApiStatusUI();
  }
}

function updateApiStatusUI() {
  var url = getGasApiUrl();
  var badge = document.getElementById('apiStatusBadge');
  var input = document.getElementById('settingApiUrlInput');
  if (input) input.value = url;
  if (badge) {
    if (url) {
      badge.className = 'flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 cursor-pointer';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>API Sheets Terhubung';
    } else {
      badge.className = 'flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 cursor-pointer';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>Hubungkan API Sheets';
    }
  }
}

function callBackendApi(action, args, onSuccess, onFailure) {
  var gasUrl = getGasApiUrl();

  // Jika diakses di iframe Apps Script langsung tanpa URL manual
  if (typeof google !== 'undefined' && google.script && google.script.run && !gasUrl) {
    var runner = google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure || function(err) {
        showToast('Error Server: ' + err.toString(), 'error');
      });
    if (typeof runner[action] === 'function') {
      runner[action].apply(runner, args || []);
      return;
    }
  }

  // Jika URL belum disetting, munculkan modal konfigurasi
  if (!gasUrl) {
    openModalApiSettings();
    if (onFailure) onFailure('URL Google Apps Script belum diatur!');
    return;
  }

  var payload = {
    action: action,
    args: args || []
  };

  // Kirim POST dengan text/plain (CORS Simple Request tanpa OPTIONS preflight)
  fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  })
  .then(function(res) {
    return res.json();
  })
  .then(function(data) {
    if (onSuccess) onSuccess(data);
  })
  .catch(function(err) {
    // Fallback GET request jika POST mengalami kendala redirect
    var getUrl = gasUrl + (gasUrl.indexOf('?') === -1 ? '?' : '&') +
                 'action=' + encodeURIComponent(action) +
                 '&args=' + encodeURIComponent(JSON.stringify(args || []));
    fetch(getUrl)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (onSuccess) onSuccess(data);
      })
      .catch(function(fallbackErr) {
        console.error('Fetch API error:', fallbackErr);
        if (onFailure) onFailure(fallbackErr);
        showToast('Gagal menghubungi Google Apps Script: ' + fallbackErr.toString(), 'error');
      });
  });
}

function openModalApiSettings() {
  var modal = document.getElementById('modalApiSettings');
  var input = document.getElementById('settingApiUrlInput');
  if (input) input.value = getGasApiUrl();
  if (modal) modal.classList.remove('hidden');
}

function closeModalApiSettings() {
  var modal = document.getElementById('modalApiSettings');
  if (modal) modal.classList.add('hidden');
}

function saveApiUrlFromModal(e) {
  e.preventDefault();
  var input = document.getElementById('settingApiUrlInput');
  if (!input) return;
  var val = input.value.trim();
  if (!val) {
    showToast('Masukkan URL Web App Google Apps Script Anda!', 'warning');
    return;
  }
  setGasApiUrl(val);
  closeModalApiSettings();
  showToast('URL API Google Apps Script berhasil disimpan!', 'success');
  loadInitialData();
}

// ==============================================================================
// INISIALISASI APLIKASI
// ==============================================================================
document.addEventListener('DOMContentLoaded', function() {
  startLiveClock();
  initUsbScannerListener();
  initCalendarWidget();
  updateApiStatusUI();

  // Cek apakah URL API sudah ada, jika belum tampilkan panduan modal
  if (!getGasApiUrl()) {
    setTimeout(openModalApiSettings, 600);
  } else {
    loadInitialData();
  }
});

function startLiveClock() {
  setInterval(function() {
    var now = new Date();
    var h = ('0' + now.getHours()).slice(-2);
    var m = ('0' + now.getMinutes()).slice(-2);
    var s = ('0' + now.getSeconds()).slice(-2);
    var clockEl = document.getElementById('liveClockDisplay');
    if (clockEl) {
      clockEl.innerText = h + ':' + m + ':' + s + ' WIB';
    }
  }, 1000);
}

function toggleMobileSidebar() {
  var sb = document.getElementById('appSidebar');
  if (sb) {
    sb.classList.toggle('hidden');
  }
}

// ==============================================================================
// NAVIGATION & VIEW SWITCHING (0-SECOND IN-MEMORY SWITCH)
// ==============================================================================
function switchView(viewName) {
  appState.currentView = viewName;

  var views = document.querySelectorAll('main section');
  views.forEach(function(v) {
    v.classList.add('hidden');
  });

  var targetView = document.getElementById('view-' + viewName);
  if (targetView) {
    targetView.classList.remove('hidden');
  }

  var navLinks = document.querySelectorAll('.nav-item');
  navLinks.forEach(function(link) {
    link.classList.remove('nav-item-active');
  });
  var activeLink = document.getElementById('nav-' + viewName);
  if (activeLink) {
    activeLink.classList.add('nav-item-active');
  }

  var titleMap = {
    dashboard: ['Dashboard Overview', 'Monitoring absensi dan statistik sekolah'],
    scanner: ['Scan Presensi QR', 'Pindai kartu siswa dengan Kamera Live atau Barcode Scanner USB'],
    siswa: ['Data Master Siswa', 'Kelola informasi siswa, kelas, dan cetak QR Code'],
    kelas: ['Data Rombel / Kelas', 'Daftar kelas dan guru wali kelas'],
    semester: ['Semester & Tahun Ajaran', 'Atur periode kalender akademik yang aktif'],
    naikkelas: ['Kenaikan Kelas (Promosi)', 'Proses promosi massal siswa atau tetapkan status kelulusan'],
    cetakkartu: ['Cetak Kartu Siswa', 'ID Card standar 8.5 x 5.4 cm siap cetak satuan / lembar A4'],
    laporan: ['Rekap & Laporan Presensi', 'Filter dan ekspor rekaman kehadiran siswa'],
    pengumuman: ['Manajemen Notice Board', 'Kelola agenda dan pengumuman sekolah'],
    pengaturan: ['Pengaturan Jam & Sekolah', 'Konfigurasi batas telat dan profil sekolah']
  };

  if (titleMap[viewName]) {
    document.getElementById('pageTitle').innerText = titleMap[viewName][0];
    document.getElementById('pageSubtitle').innerText = titleMap[viewName][1];
  }

  if (viewName === 'scanner') {
    startCameraScanner();
  } else {
    stopCameraScanner();
  }

  if (viewName === 'siswa') {
    if (appState.siswaList.length === 0) loadSiswaData();
  } else if (viewName === 'kelas') {
    if (appState.kelasList.length === 0) loadKelasData();
  } else if (viewName === 'semester') {
    if (appState.semesterList.length === 0) loadSemesterData();
  } else if (viewName === 'naikkelas') {
    populateNaikKelasDropdowns();
  } else if (viewName === 'cetakkartu') {
    populateCetakKelasFilter();
    renderKartuBatch();
  } else if (viewName === 'laporan') {
    populateLaporanKelasFilter();
    loadLaporanPresensi();
  } else if (viewName === 'pengumuman') {
    loadPengumumanData();
  } else if (viewName === 'pengaturan') {
    loadPengaturanForm();
  }
}

// ==============================================================================
// AUDIO SYNTHESIZER (WEB AUDIO API - ZERO ASSET DEPENDENCY)
// ==============================================================================
function playAudioFeedback(type) {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    var ctx = new AudioContext();

    if (type === 'success') {
      var osc1 = ctx.createOscillator();
      var gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);
    } else if (type === 'warning') {
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.4);
    } else {
      var osc3 = ctx.createOscillator();
      var gain3 = ctx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(220, ctx.currentTime);
      gain3.gain.setValueAtTime(0.3, ctx.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start();
      osc3.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn('AudioContext disabled by browser policy:', e);
  }
}

// ==============================================================================
// TOAST NOTIFICATIONS
// ==============================================================================
function showToast(message, type) {
  var container = document.getElementById('toastContainer');
  if (!container) return;

  var toast = document.createElement('div');
  var bgColor = type === 'success' ? 'bg-emerald-600' : (type === 'warning' ? 'bg-amber-500' : 'bg-rose-600');
  var icon = type === 'success' ? '✓' : '!';

  toast.className = bgColor + ' text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 pointer-events-auto transform transition-all duration-300 translate-y-4 opacity-0';
  toast.innerHTML = '<span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">' + icon + '</span><span>' + message + '</span>';

  container.appendChild(toast);

  setTimeout(function() {
    toast.classList.remove('translate-y-4', 'opacity-0');
  }, 10);

  setTimeout(function() {
    toast.classList.add('opacity-0', 'translate-y-4');
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

// ==============================================================================
// HARDWARE SCANNER: LIVE KAMERA (FULL 100% PERMISSIONS DI GITHUB) & USB GUN
// ==============================================================================
function openScannerWithMode(mode) {
  setScannerMode(mode);
  switchView('scanner');
}

function setScannerMode(mode) {
  appState.scannerMode = mode;
  var ind = document.getElementById('scannerModeIndicator');
  var btnMasuk = document.getElementById('btnModeMasuk');
  var btnPulang = document.getElementById('btnModePulang');

  if (mode === 'masuk') {
    if (ind) {
      ind.className = 'px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 uppercase tracking-wider';
      ind.innerText = 'MODE: ABSEN MASUK';
    }
    if (btnMasuk) btnMasuk.className = 'px-4 py-2 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow';
    if (btnPulang) btnPulang.className = 'px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition';
  } else {
    if (ind) {
      ind.className = 'px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 uppercase tracking-wider';
      ind.innerText = 'MODE: ABSEN PULANG';
    }
    if (btnMasuk) btnMasuk.className = 'px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition';
    if (btnPulang) btnPulang.className = 'px-4 py-2 rounded-lg text-xs font-bold transition bg-amber-400 text-slate-950 shadow';
  }
}

function startCameraScanner() {
  if (appState.isCameraRunning) return;

  var qrReaderEl = document.getElementById('qr-reader');
  if (!qrReaderEl) return;

  if (typeof Html5Qrcode === 'undefined') {
    console.warn('Library Html5Qrcode belum termuat.');
    return;
  }

  if (!appState.html5QrCode) {
    appState.html5QrCode = new Html5Qrcode('qr-reader');
  }

  Html5Qrcode.getCameras().then(function(cameras) {
    appState.availableCameras = cameras;
    var camSelect = document.getElementById('cameraSelect');
    if (camSelect && cameras.length > 0) {
      camSelect.innerHTML = '';
      cameras.forEach(function(c, idx) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.text = c.label || 'Kamera ' + (idx + 1);
        camSelect.appendChild(opt);
      });
      appState.selectedCameraId = cameras[cameras.length - 1].id;
      camSelect.value = appState.selectedCameraId;
    }

    var selectedCam = appState.selectedCameraId || { facingMode: "environment" };

    appState.html5QrCode.start(
      selectedCam,
      {
        fps: 12,
        qrbox: { width: 250, height: 250 }
      },
      function(decodedText, decodedResult) {
        onQrCodeScanned(decodedText);
      },
      function(errorMessage) {
        // scan pass
      }
    ).then(function() {
      appState.isCameraRunning = true;
    }).catch(function(err) {
      console.warn('Gagal menyalakan live kamera:', err);
    });
  }).catch(function(err) {
    console.warn('Kamera tidak terdeteksi:', err);
  });
}

function stopCameraScanner() {
  if (appState.html5QrCode && appState.isCameraRunning) {
    appState.html5QrCode.stop().then(function() {
      appState.isCameraRunning = false;
    }).catch(function(err) {
      console.warn('Error saat mematikan scanner:', err);
    });
  }
}

function switchCamera(cameraId) {
  if (!cameraId) return;
  appState.selectedCameraId = cameraId;
  if (appState.isCameraRunning) {
    stopCameraScanner();
    setTimeout(startCameraScanner, 400);
  }
}

function onQrCodeScanned(rawText) {
  var now = Date.now();
  if (rawText === appState.lastScannedNis && (now - appState.scannerDebounceTime) < 3000) {
    return;
  }
  appState.lastScannedNis = rawText;
  appState.scannerDebounceTime = now;

  processAttendanceScan(rawText);
}

function scanFromImageFile(inputEl) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  var file = inputEl.files[0];

  if (typeof Html5Qrcode === 'undefined') return;
  var html5QrCode = appState.html5QrCode || new Html5Qrcode('qr-reader');

  html5QrCode.scanFile(file, true)
    .then(function(decodedText) {
      onQrCodeScanned(decodedText);
    })
    .catch(function(err) {
      showToast('Gagal memindai gambar QR! Pastikan gambar tajam.', 'error');
    });
}

function submitManualNis() {
  var input = document.getElementById('manualNisInput');
  if (!input || !input.value.trim()) return;
  onQrCodeScanned(input.value.trim());
  input.value = '';
}

function initUsbScannerListener() {
  window.addEventListener('keydown', function(e) {
    var activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      return;
    }

    var now = Date.now();
    if (e.key === 'Enter') {
      if (appState.usbBuffer.length >= 3) {
        var scannedCode = appState.usbBuffer;
        appState.usbBuffer = '';
        onQrCodeScanned(scannedCode);
      }
      appState.usbBuffer = '';
    } else if (e.key.length === 1) {
      if (now - appState.usbLastKeyTime > 200) {
        appState.usbBuffer = '';
      }
      appState.usbBuffer += e.key;
      appState.usbLastKeyTime = now;
    }
  });
}

// ==============================================================================
// PROSES MUTASI PRESENSI KE BACKEND
// ==============================================================================
function processAttendanceScan(rawText) {
  var cleanNis = rawText.replace(/^SISWA-/i, '').trim();

  var resultCard = document.getElementById('scanResultCard');
  if (resultCard) {
    resultCard.innerHTML = '<div class="flex flex-col items-center justify-center py-8"><div class="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div><p class="text-xs font-bold text-slate-700">Memverifikasi Kartu Siswa...</p></div>';
  }

  var payload = {
    nis: cleanNis,
    mode: appState.scannerMode
  };

  callBackendApi(
    'rekamPresensi',
    [payload],
    function(resp) {
      handleAttendanceResponse(resp);
    },
    function(err) {
      playAudioFeedback('error');
      renderResultError('Gangguan Server', err.toString());
    }
  );
}

function handleAttendanceResponse(resp) {
  if (resp.status === 'success') {
    playAudioFeedback('success');
    showToast(resp.message, 'success');
    renderResultSuccess(resp);
    refreshDashboard();
  } else if (resp.status === 'warning') {
    playAudioFeedback('warning');
    showToast(resp.message, 'warning');
    renderResultWarning(resp);
  } else {
    playAudioFeedback('error');
    showToast(resp.message, 'error');
    renderResultError('Presensi Gagal', resp.message);
  }
}

function renderResultSuccess(resp) {
  var card = document.getElementById('scanResultCard');
  if (!card) return;

  var s = resp.siswa || {};
  var badgeColor = resp.presensiStatus === 'Hadir' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300';

  card.innerHTML = 
    '<div class="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center text-emerald-700 font-extrabold text-2xl mb-3 shadow-md">' +
      (s.nama ? s.nama.charAt(0) : 'S') +
    '</div>' +
    '<span class="inline-block px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider mb-2 ' + badgeColor + '">' +
      (resp.presensiStatus || 'Hadir') + ' (' + resp.jam + ')' +
    '</span>' +
    '<h3 class="text-lg font-black text-slate-900 tracking-tight">' + s.nama + '</h3>' +
    '<p class="text-xs font-semibold text-slate-500 mt-0.5">NIS: ' + s.nis + ' | Kelas: ' + s.kelas + '</p>' +
    '<div class="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-around text-xs text-slate-600">' +
      '<div><span class="text-[10px] text-slate-400 block uppercase font-bold">Waktu</span><span class="font-bold text-slate-800">' + resp.jam + '</span></div>' +
      '<div><span class="text-[10px] text-slate-400 block uppercase font-bold">Keterangan</span><span class="font-bold text-slate-800">' + (resp.keterangan || '-') + '</span></div>' +
    '</div>';
}

function renderResultWarning(resp) {
  var card = document.getElementById('scanResultCard');
  if (!card) return;
  var s = resp.siswa || {};

  card.innerHTML = 
    '<div class="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center text-amber-700 font-extrabold text-2xl mb-3 shadow-md">' +
      '!' +
    '</div>' +
    '<span class="inline-block px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider mb-2 bg-amber-100 text-amber-900 border-amber-300">' +
      'SUDAH ABSEN' +
    '</span>' +
    '<h3 class="text-base font-extrabold text-slate-900">' + s.nama + '</h3>' +
    '<p class="text-xs text-slate-500 mt-1">' + resp.message + '</p>';
}

function renderResultError(title, msg) {
  var card = document.getElementById('scanResultCard');
  if (!card) return;

  card.innerHTML = 
    '<div class="w-20 h-20 rounded-full bg-rose-100 border-4 border-rose-400 flex items-center justify-center text-rose-700 font-extrabold text-2xl mb-3 shadow-md">' +
      '✕' +
    '</div>' +
    '<h3 class="text-base font-extrabold text-rose-700">' + title + '</h3>' +
    '<p class="text-xs text-slate-500 mt-1 max-w-xs">' + msg + '</p>';
}

// ==============================================================================
// DATA FETCHING & DASHBOARD REFRESH
// ==============================================================================
function loadInitialData() {
  refreshDashboard();
  loadKelasData();
  loadSiswaData();
}

function refreshDashboard() {
  callBackendApi('getDashboardData', [], function(resp) {
    if (resp && resp.status === 'success') {
      appState.dashboardData = resp.data;
      renderDashboard(resp.data);
    }
  });
}

function renderDashboard(data) {
  if (!data) return;

  document.getElementById('statTotalKelas').innerText = data.totalKelas || 0;
  document.getElementById('statTotalSiswa').innerText = data.totalSiswa || 0;
  document.getElementById('statHadirHariIni').innerText = data.hadirHariIni || 0;
  document.getElementById('statTerlambatHariIni').innerText = data.terlambatHariIni || 0;

  var smtInfo = document.getElementById('sidebarSemesterInfo');
  if (smtInfo && data.semesterAktif) {
    smtInfo.innerText = data.semesterAktif.tahunAjaran + ' ' + data.semesterAktif.semester;
  }

  var tbody = document.getElementById('todayAttendanceTableBody');
  if (tbody) {
    var rows = data.presensiHariIni || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-slate-400">Belum ada siswa yang absen hari ini.</td></tr>';
    } else {
      var html = '';
      rows.forEach(function(r) {
        var statusBadge = r.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
        html += 
          '<tr class="hover:bg-slate-50/80 transition">' +
            '<td class="py-3 px-4 font-mono font-bold text-slate-700">' + (r.jamMasuk || r.jamPulang || '-') + '</td>' +
            '<td class="py-3 px-4 font-mono text-slate-600">' + r.nis + '</td>' +
            '<td class="py-3 px-4 font-bold text-slate-900">' + r.nama + '</td>' +
            '<td class="py-3 px-4">' + r.kelas + '</td>' +
            '<td class="py-3 px-4 font-mono">' + (r.jamMasuk || '-') + '</td>' +
            '<td class="py-3 px-4 font-mono">' + (r.jamPulang || '-') + '</td>' +
            '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold ' + statusBadge + '">' + r.status + '</span></td>' +
            '<td class="py-3 px-4 text-slate-500">' + (r.keterangan || '-') + '</td>' +
          '</tr>';
      });
      tbody.innerHTML = html;
    }
  }

  renderNoticeBoard(data.pengumuman || []);
}

function renderNoticeBoard(list) {
  var container = document.getElementById('noticeBoardList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Belum ada pengumuman agenda.</p>';
    return;
  }

  var html = '';
  list.forEach(function(item) {
    var isAmber = item.warna === 'amber';
    var bgClass = isAmber ? 'bg-amber-50/90 border-amber-200/70' : 'bg-blue-50/90 border-blue-200/70';
    var tagClass = isAmber ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-950';
    var iconClass = isAmber ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-900';
    var iconText = isAmber ? 'TRIP' : 'INFO';

    html += 
      '<div class="rounded-xl p-4 border flex items-center justify-between ' + bgClass + '">' +
        '<div>' +
          '<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ' + tagClass + '">' + (item.kategori || 'Umum') + '</span>' +
          '<h4 class="text-sm font-bold text-slate-900 mt-1">' + item.judul + '</h4>' +
          '<p class="text-xs text-slate-500 mt-0.5">' + item.tanggal + '</p>' +
        '</div>' +
        '<div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ml-3 ' + iconClass + '">' +
          iconText +
        '</div>' +
      '</div>';
  });
  container.innerHTML = html;
}

function initCalendarWidget() {
  var grid = document.getElementById('calendarDaysGrid');
  if (!grid) return;

  var now = new Date();
  var currentDay = now.getDate();
  var daysInMonth = 30;

  var html = '';
  for (var i = 1; i <= daysInMonth; i++) {
    var isToday = i === currentDay;
    var isTrip = i === 10;
    var isSport = i === 18;

    var extraStyle = '';
    if (isToday) {
      extraStyle = 'bg-blue-900 text-white font-extrabold rounded-lg shadow-sm';
    } else if (isTrip) {
      extraStyle = 'bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300';
    } else if (isSport) {
      extraStyle = 'bg-blue-100 text-blue-900 font-bold rounded-lg border border-blue-300';
    } else {
      extraStyle = 'text-slate-600 hover:bg-slate-100 rounded-lg';
    }

    html += '<div class="py-2 ' + extraStyle + '">' + i + '</div>';
  }
  grid.innerHTML = html;
}

// ==============================================================================
// MODUL DATA SISWA
// ==============================================================================
function loadSiswaData() {
  callBackendApi('getSiswaList', [], function(resp) {
    if (resp && resp.status === 'success') {
      appState.siswaList = resp.data;
      renderSiswaTable(resp.data);
    }
  });
}

function renderSiswaTable(list) {
  var tbody = document.getElementById('siswaTableBody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400">Tidak ada data siswa ditemukan.</td></tr>';
    return;
  }

  var html = '';
  list.forEach(function(s) {
    var statusClass = s.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600';
    html += 
      '<tr class="hover:bg-slate-50 transition">' +
        '<td class="py-3 px-4 font-mono text-slate-400">' + s.id + '</td>' +
        '<td class="py-3 px-4 font-mono font-bold text-slate-800">' + s.nis + '</td>' +
        '<td class="py-3 px-4 font-bold text-slate-900">' + s.nama + '</td>' +
        '<td class="py-3 px-4">' + s.kelas + '</td>' +
        '<td class="py-3 px-4">' + (s.jk === 'L' ? 'Laki-laki' : 'Perempuan') + '</td>' +
        '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold ' + statusClass + '">' + s.status + '</span></td>' +
        '<td class="py-3 px-4 text-center">' +
          '<button onclick="previewQrSiswa(\'' + s.nis + '\', \'' + escapeHtml(s.nama) + '\', \'' + s.kelas + '\')" class="text-blue-900 hover:text-amber-600 font-bold text-xs">' +
            'Lihat QR' +
          '</button>' +
        '</td>' +
        '<td class="py-3 px-4 text-right space-x-2">' +
          '<button onclick="editSiswa(\'' + s.id + '\')" class="text-blue-900 hover:underline font-semibold">Edit</button>' +
          '<button onclick="hapusSiswa(\'' + s.id + '\', \'' + escapeHtml(s.nama) + '\')" class="text-rose-600 hover:underline font-semibold">Hapus</button>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

function filterSiswa() {
  var kelasVal = document.getElementById('filterSiswaKelas').value.toLowerCase();
  var searchVal = document.getElementById('searchSiswaInput').value.toLowerCase();

  var filtered = appState.siswaList.filter(function(s) {
    var matchKelas = !kelasVal || (s.kelas || '').toLowerCase() === kelasVal;
    var matchSearch = !searchVal || (s.nama || '').toLowerCase().indexOf(searchVal) !== -1 || (s.nis || '').indexOf(searchVal) !== -1;
    return matchKelas && matchSearch;
  });

  renderSiswaTable(filtered);
}

function openModalSiswa(data) {
  var modal = document.getElementById('modalSiswa');
  var title = document.getElementById('modalSiswaTitle');
  var formId = document.getElementById('siswaFormId');
  var formNis = document.getElementById('siswaFormNis');
  var formNama = document.getElementById('siswaFormNama');
  var formKelas = document.getElementById('siswaFormKelas');
  var formJk = document.getElementById('siswaFormJk');
  var formStatus = document.getElementById('siswaFormStatus');

  formKelas.innerHTML = '';
  appState.kelasList.forEach(function(k) {
    var opt = document.createElement('option');
    opt.value = k.namaKelas;
    opt.text = k.namaKelas;
    formKelas.appendChild(opt);
  });

  if (data) {
    title.innerText = 'Edit Data Siswa';
    formId.value = data.id || '';
    formNis.value = data.nis || '';
    formNama.value = data.nama || '';
    formKelas.value = data.kelas || '';
    formJk.value = data.jk || 'L';
    formStatus.value = data.status || 'Aktif';
  } else {
    title.innerText = 'Tambah Data Siswa';
    formId.value = '';
    formNis.value = '';
    formNama.value = '';
    formJk.value = 'L';
    formStatus.value = 'Aktif';
  }

  modal.classList.remove('hidden');
}

function closeModalSiswa() {
  document.getElementById('modalSiswa').classList.add('hidden');
}

function editSiswa(id) {
  var s = appState.siswaList.find(function(item) { return item.id === id; });
  if (s) openModalSiswa(s);
}

function handleSaveSiswa(e) {
  e.preventDefault();
  var btn = document.getElementById('btnSubmitSiswa');
  btn.disabled = true;
  btn.innerText = 'Menyimpan...';

  var payload = {
    id: document.getElementById('siswaFormId').value,
    nis: document.getElementById('siswaFormNis').value.trim(),
    nama: document.getElementById('siswaFormNama').value.trim(),
    kelas: document.getElementById('siswaFormKelas').value,
    jk: document.getElementById('siswaFormJk').value,
    status: document.getElementById('siswaFormStatus').value
  };

  callBackendApi(
    'saveSiswa',
    [payload],
    function(resp) {
      btn.disabled = false;
      btn.innerText = 'Simpan';
      if (resp && resp.status === 'success') {
        showToast(resp.message, 'success');
        closeModalSiswa();
        loadSiswaData();
        refreshDashboard();
      } else {
        showToast(resp ? resp.message : 'Gagal simpan', 'error');
      }
    },
    function(err) {
      btn.disabled = false;
      btn.innerText = 'Simpan';
    }
  );
}

function hapusSiswa(id, nama) {
  if (!confirm('Apakah Anda yakin ingin menghapus data siswa: ' + nama + '?')) return;

  callBackendApi('deleteSiswa', [id], function(resp) {
    if (resp && resp.status === 'success') {
      showToast(resp.message, 'success');
      loadSiswaData();
      refreshDashboard();
    } else {
      showToast(resp ? resp.message : 'Gagal hapus', 'error');
    }
  });
}

function previewQrSiswa(nis, nama, kelas) {
  var modal = document.getElementById('modalQrPreview');
  var canvas = document.getElementById('qrPreviewCanvas');
  document.getElementById('qrPreviewNama').innerText = nama;
  document.getElementById('qrPreviewNis').innerText = 'NIS: ' + nis + ' | ' + kelas;

  canvas.innerHTML = '';
  new QRCode(canvas, {
    text: 'SISWA-' + nis,
    width: 140,
    height: 140,
    colorDark : "#0f172a",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });

  modal.classList.remove('hidden');
}

function closeModalQrPreview() {
  document.getElementById('modalQrPreview').classList.add('hidden');
}

// ==============================================================================
// MODUL DATA KELAS
// ==============================================================================
function loadKelasData() {
  callBackendApi('getKelasList', [], function(resp) {
    if (resp && resp.status === 'success') {
      appState.kelasList = resp.data;
      renderKelasGrid(resp.data);
      populateAllKelasFilters(resp.data);
    }
  });
}

function renderKelasGrid(list) {
  var grid = document.getElementById('kelasListGrid');
  if (!grid) return;

  var html = '';
  list.forEach(function(k) {
    html += 
      '<div class="card-prime card-prime-hover p-5 border-l-4 border-l-blue-900">' +
        '<div class="flex items-center justify-between">' +
          '<h3 class="text-base font-extrabold text-slate-900">' + k.namaKelas + '</h3>' +
          '<span class="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded">Tingkat ' + k.tingkat + '</span>' +
        '</div>' +
        '<p class="text-xs text-slate-500 mt-1">' + (k.jurusan || 'Umum') + '</p>' +
        '<div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">' +
          '<span class="text-slate-600 font-medium">Wali: <strong class="text-slate-800">' + (k.waliKelas || '-') + '</strong></span>' +
          '<button onclick="hapusKelas(\'' + k.id + '\', \'' + k.namaKelas + '\')" class="text-rose-600 hover:underline font-semibold">Hapus</button>' +
        '</div>' +
      '</div>';
  });
  grid.innerHTML = html;
}

function populateAllKelasFilters(list) {
  var filterIds = ['filterSiswaKelas', 'filterCetakKelas', 'laporanFilterKelas', 'naikKelasAsalSelect', 'naikKelasTujuanSelect'];
  filterIds.forEach(function(fId) {
    var el = document.getElementById(fId);
    if (!el) return;
    var currentVal = el.value;
    var defaultText = fId.indexOf('naikKelas') !== -1 ? '-- Pilih Kelas --' : 'Semua Kelas';
    el.innerHTML = '<option value="">' + defaultText + '</option>';
    list.forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k.namaKelas;
      opt.text = k.namaKelas;
      el.appendChild(opt);
    });
    el.value = currentVal;
  });
}

function openModalKelas() {
  document.getElementById('kelasFormId').value = '';
  document.getElementById('kelasFormNama').value = '';
  document.getElementById('kelasFormJurusan').value = '';
  document.getElementById('kelasFormWali').value = '';
  document.getElementById('modalKelas').classList.remove('hidden');
}

function closeModalKelas() {
  document.getElementById('modalKelas').classList.add('hidden');
}

function handleSaveKelas(e) {
  e.preventDefault();
  var btn = document.getElementById('btnSubmitKelas');
  btn.disabled = true;
  btn.innerText = 'Menyimpan...';

  var payload = {
    id: document.getElementById('kelasFormId').value,
    namaKelas: document.getElementById('kelasFormNama').value.trim(),
    jurusan: document.getElementById('kelasFormJurusan').value.trim(),
    tingkat: document.getElementById('kelasFormTingkat').value,
    waliKelas: document.getElementById('kelasFormWali').value.trim()
  };

  callBackendApi(
    'saveKelas',
    [payload],
    function(resp) {
      btn.disabled = false;
      btn.innerText = 'Simpan';
      if (resp && resp.status === 'success') {
        showToast(resp.message, 'success');
        closeModalKelas();
        loadKelasData();
        refreshDashboard();
      } else {
        showToast(resp ? resp.message : 'Gagal simpan kelas', 'error');
      }
    },
    function(err) {
      btn.disabled = false;
      btn.innerText = 'Simpan';
    }
  );
}

function hapusKelas(id, nama) {
  if (!confirm('Apakah Anda yakin ingin menghapus kelas: ' + nama + '?')) return;
  callBackendApi('deleteKelas', [id], function(resp) {
    if (resp && resp.status === 'success') {
      showToast(resp.message, 'success');
      loadKelasData();
    } else {
      showToast(resp ? resp.message : 'Gagal hapus', 'error');
    }
  });
}

// ==============================================================================
// MODUL SEMESTER & TAHUN AJARAN
// ==============================================================================
function loadSemesterData() {
  callBackendApi('getSemesterList', [], function(resp) {
    if (resp && resp.status === 'success') {
      appState.semesterList = resp.data;
      renderSemesterTable(resp.data);
    }
  });
}

function renderSemesterTable(list) {
  var tbody = document.getElementById('semesterTableBody');
  if (!tbody) return;

  var html = '';
  list.forEach(function(s) {
    var isAktif = s.statusAktif === 'Aktif';
    var badgeClass = isAktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500';

    html += 
      '<tr class="hover:bg-slate-50 transition">' +
        '<td class="py-3 px-4 font-mono text-slate-400">' + s.id + '</td>' +
        '<td class="py-3 px-4 font-bold text-slate-900">' + s.tahunAjaran + '</td>' +
        '<td class="py-3 px-4 font-semibold text-slate-800">' + s.semester + '</td>' +
        '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold ' + badgeClass + '">' + s.statusAktif + '</span></td>' +
        '<td class="py-3 px-4 text-slate-500">' + (s.keterangan || '-') + '</td>' +
        '<td class="py-3 px-4 text-right">' +
          (!isAktif ? '<button onclick="aktifkanSemester(\'' + s.id + '\')" class="btn-press bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold px-3 py-1 rounded-md">Jadikan Aktif</button>' : '<span class="text-xs font-bold text-emerald-600">✓ Sedang Aktif</span>') +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

function openModalSemester() {
  document.getElementById('semesterFormId').value = '';
  document.getElementById('semesterFormTahun').value = '';
  document.getElementById('semesterFormKet').value = '';
  document.getElementById('modalSemester').classList.remove('hidden');
}

function closeModalSemester() {
  document.getElementById('modalSemester').classList.add('hidden');
}

function handleSaveSemester(e) {
  e.preventDefault();
  var btn = document.getElementById('btnSubmitSemester');
  btn.disabled = true;

  var payload = {
    id: document.getElementById('semesterFormId').value,
    tahunAjaran: document.getElementById('semesterFormTahun').value.trim(),
    semester: document.getElementById('semesterFormSemester').value,
    statusAktif: document.getElementById('semesterFormAktif').value,
    keterangan: document.getElementById('semesterFormKet').value.trim()
  };

  callBackendApi('saveSemester', [payload], function(resp) {
    btn.disabled = false;
    if (resp && resp.status === 'success') {
      showToast(resp.message, 'success');
      closeModalSemester();
      loadSemesterData();
      refreshDashboard();
    } else {
      showToast(resp ? resp.message : 'Gagal simpan semester', 'error');
    }
  }, function() { btn.disabled = false; });
}

function aktifkanSemester(id) {
  callBackendApi('setSemesterAktif', [id], function(resp) {
    if (resp && resp.status === 'success') {
      showToast(resp.message, 'success');
      loadSemesterData();
      refreshDashboard();
    }
  });
}

// ==============================================================================
// MODUL KENAIKAN KELAS (PROMOSI MASSAL & KELULUSAN)
// ==============================================================================
function populateNaikKelasDropdowns() {
  populateAllKelasFilters(appState.kelasList);
}

function toggleAksiKenaikanUI() {
  var aksi = document.getElementById('naikKelasAksiSelect').value;
  var wrapTujuan = document.getElementById('wrapKelasTujuan');
  if (wrapTujuan) {
    if (aksi === 'naik') {
      wrapTujuan.classList.remove('opacity-40', 'pointer-events-none');
    } else {
      wrapTujuan.classList.add('opacity-40', 'pointer-events-none');
    }
  }
}

function loadSiswaKenaikanKelas() {
  var kelasAsal = document.getElementById('naikKelasAsalSelect').value;
  var tbody = document.getElementById('naikKelasTableBody');
  var countEl = document.getElementById('selectedSiswaCount');

  if (!kelasAsal) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400">Silakan pilih kelas asal terlebih dahulu.</td></tr>';
    countEl.innerText = '0 siswa dipilih';
    return;
  }

  var filtered = appState.siswaList.filter(function(s) {
    return s.kelas === kelasAsal && s.status === 'Aktif';
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400">Tidak ada siswa aktif di kelas ' + kelasAsal + '.</td></tr>';
    countEl.innerText = '0 siswa dipilih';
    return;
  }

  var html = '';
  filtered.forEach(function(s) {
    html += 
      '<tr class="hover:bg-slate-50 transition">' +
        '<td class="py-3 px-4">' +
          '<input type="checkbox" name="siswaNaikCheck" value="' + s.id + '" checked onchange="updateSelectedKenaikanCount()" class="rounded text-amber-500 focus:ring-amber-500">' +
        '</td>' +
        '<td class="py-3 px-4 font-mono font-bold text-slate-800">' + s.nis + '</td>' +
        '<td class="py-3 px-4 font-bold text-slate-900">' + s.nama + '</td>' +
        '<td class="py-3 px-4">' + s.kelas + '</td>' +
        '<td class="py-3 px-4">' + (s.jk === 'L' ? 'Laki-laki' : 'Perempuan') + '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
  updateSelectedKenaikanCount();
}

function toggleCheckAllNaikKelas(master) {
  var checks = document.querySelectorAll('input[name="siswaNaikCheck"]');
  checks.forEach(function(c) {
    c.checked = master.checked;
  });
  updateSelectedKenaikanCount();
}

function updateSelectedKenaikanCount() {
  var selected = document.querySelectorAll('input[name="siswaNaikCheck"]:checked');
  var countEl = document.getElementById('selectedSiswaCount');
  if (countEl) countEl.innerText = selected.length + ' siswa dipilih';
}

function eksekusiKenaikanKelas() {
  var aksi = document.getElementById('naikKelasAksiSelect').value;
  var kelasAsal = document.getElementById('naikKelasAsalSelect').value;
  var kelasTujuan = document.getElementById('naikKelasTujuanSelect').value;

  var checkedBoxes = document.querySelectorAll('input[name="siswaNaikCheck"]:checked');
  var siswaIds = [];
  checkedBoxes.forEach(function(c) { siswaIds.push(c.value); });

  if (siswaIds.length === 0) {
    showToast('Pilih minimal satu siswa yang akan diproses!', 'warning');
    return;
  }

  if (aksi === 'naik' && !kelasTujuan) {
    showToast('Silakan tentukan kelas tujuan promosi!', 'warning');
    return;
  }

  var konfirmasiMsg = 'Proses ' + siswaIds.length + ' siswa dari ' + kelasAsal + ' untuk ' + (aksi === 'naik' ? 'NAIK ke ' + kelasTujuan : (aksi === 'lulus' ? 'dinyatakan LULUS' : 'TINGGAL di kelas')) + '?';
  if (!confirm(konfirmasiMsg)) return;

  var btn = document.getElementById('btnSubmitKenaikan');
  btn.disabled = true;
  btn.innerText = 'Memproses...';

  var payload = {
    aksi: aksi,
    kelasAsal: kelasAsal,
    kelasTujuan: kelasTujuan,
    siswaIds: siswaIds
  };

  callBackendApi(
    'prosesKenaikanKelas',
    [payload],
    function(resp) {
      btn.disabled = false;
      btn.innerText = 'Proses Kenaikan Kelas Sekarang';
      if (resp && resp.status === 'success') {
        showToast(resp.message, 'success');
        loadSiswaData();
        loadSiswaKenaikanKelas();
        refreshDashboard();
      } else {
        showToast(resp ? resp.message : 'Gagal proses', 'error');
      }
    },
    function(err) {
      btn.disabled = false;
      btn.innerText = 'Proses Kenaikan Kelas Sekarang';
    }
  );
}

// ==============================================================================
// CETAK KARTU SISWA BER-QR (STANDAR ID CARD CR80: 85.6mm x 53.98mm)
// ==============================================================================
function populateCetakKelasFilter() {
  populateAllKelasFilters(appState.kelasList);
}

function renderKartuBatch() {
  var filterKelas = document.getElementById('filterCetakKelas').value.toLowerCase();
  var container = document.getElementById('printSheetContainer');
  if (!container) return;

  var list = appState.siswaList.filter(function(s) {
    return (!filterKelas || (s.kelas || '').toLowerCase() === filterKelas) && s.status === 'Aktif';
  });

  if (list.length === 0) {
    container.innerHTML = '<p class="col-span-3 text-center py-12 text-slate-400 text-xs">Tidak ada siswa aktif untuk dicetak kartu.</p>';
    return;
  }

  container.innerHTML = '';

  list.forEach(function(s, idx) {
    var cardDiv = document.createElement('div');
    cardDiv.className = 'id-card-wrap shadow-md flex flex-col justify-between';

    var qrId = 'batch-qr-' + idx;

    cardDiv.innerHTML = 
      '<!-- Header Kartu -->' +
      '<div class="id-card-header px-3 py-1.5 flex items-center justify-between">' +
        '<div class="flex items-center space-x-1.5">' +
          '<div class="w-5 h-5 rounded bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">SP</div>' +
          '<div>' +
            '<h4 class="text-[9px] font-black uppercase tracking-tight leading-none">SMK BINA BANGSA</h4>' +
            '<p class="text-[7px] text-blue-200 leading-tight">KARTU TANDA PELAJAR</p>' +
          '</div>' +
        '</div>' +
        '<span class="text-[7px] text-amber-300 font-bold font-mono">CR80</span>' +
      '</div>' +

      '<!-- Body Kartu: Foto, Identitas, & QR -->' +
      '<div class="p-2.5 flex items-center justify-between space-x-2 relative flex-1">' +
        '<!-- Foto -->' +
        '<div class="w-14 h-16 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 font-extrabold text-xs shrink-0 overflow-hidden shadow-inner">' +
          (s.foto ? '<img src="' + s.foto + '" class="w-full h-full object-cover">' : (s.nama ? s.nama.charAt(0) : 'S')) +
        '</div>' +

        '<!-- Data Siswa -->' +
        '<div class="flex-1 overflow-hidden leading-snug text-left">' +
          '<p class="text-[11px] font-extrabold text-slate-900 truncate leading-tight">' + s.nama + '</p>' +
          '<div class="mt-1 text-[8px] text-slate-600 space-y-0.5">' +
            '<p><span class="w-8 inline-block text-slate-400">NIS</span>: <strong class="text-slate-800 font-mono">' + s.nis + '</strong></p>' +
            '<p><span class="w-8 inline-block text-slate-400">Kelas</span>: <strong class="text-slate-800">' + s.kelas + '</strong></p>' +
            '<p><span class="w-8 inline-block text-slate-400">Gender</span>: ' + (s.jk === 'L' ? 'Laki-laki' : 'Perempuan') + '</p>' +
          '</div>' +
        '</div>' +

        '<!-- QR Code -->' +
        '<div class="shrink-0 flex flex-col items-center">' +
          '<div id="' + qrId + '" class="p-0.5 bg-white border border-slate-300 rounded shadow-sm"></div>' +
          '<span class="text-[6px] font-mono text-slate-400 mt-0.5">SCAN ME</span>' +
        '</div>' +

        '<div class="id-card-pattern"></div>' +
      '</div>' +

      '<!-- Footer Kartu -->' +
      '<div class="px-3 py-1 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-500">' +
        '<span>Berlaku Selama Menjadi Siswa</span>' +
        '<span class="font-bold text-slate-700">Kepala Sekolah</span>' +
      '</div>';

    container.appendChild(cardDiv);

    setTimeout(function() {
      var targetQr = document.getElementById(qrId);
      if (targetQr) {
        new QRCode(targetQr, {
          text: 'SISWA-' + s.nis,
          width: 50,
          height: 50,
          colorDark: "#172554",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }, 50);
  });
}

// ==============================================================================
// REKAP & LAPORAN PRESENSI
// ==============================================================================
function populateLaporanKelasFilter() {
  populateAllKelasFilters(appState.kelasList);
}

function loadLaporanPresensi() {
  var tanggal = document.getElementById('laporanFilterTanggal').value;
  var kelas = document.getElementById('laporanFilterKelas').value;
  var status = document.getElementById('laporanFilterStatus').value;

  var tbody = document.getElementById('laporanTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-slate-400">Memuat laporan...</td></tr>';

  callBackendApi('getPresensiReport', [tanggal, kelas, status], function(resp) {
    if (resp && resp.status === 'success') {
      renderLaporanTable(resp.data);
    }
  });
}

function renderLaporanTable(list) {
  var tbody = document.getElementById('laporanTableBody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400">Tidak ada data presensi yang sesuai filter.</td></tr>';
    return;
  }

  var html = '';
  list.forEach(function(r) {
    var statusClass = r.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
    html += 
      '<tr class="hover:bg-slate-50 transition">' +
        '<td class="py-3 px-4 font-mono text-slate-600">' + r.tanggal + '</td>' +
        '<td class="py-3 px-4 font-mono font-bold text-slate-800">' + r.nis + '</td>' +
        '<td class="py-3 px-4 font-bold text-slate-900">' + r.nama + '</td>' +
        '<td class="py-3 px-4">' + r.kelas + '</td>' +
        '<td class="py-3 px-4 font-mono text-slate-700">' + (r.jamMasuk || '-') + '</td>' +
        '<td class="py-3 px-4 font-mono text-slate-700">' + (r.jamPulang || '-') + '</td>' +
        '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold ' + statusClass + '">' + r.status + '</span></td>' +
        '<td class="py-3 px-4 text-slate-500">' + (r.keterangan || '-') + '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

function exportLaporanCsv() {
  var table = document.querySelector('#view-laporan table');
  if (!table) return;

  var csv = [];
  var rows = table.querySelectorAll('tr');
  for (var i = 0; i < rows.length; i++) {
    var row = [], cols = rows[i].querySelectorAll('td, th');
    for (var j = 0; j < cols.length; j++) {
      row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
    }
    csv.push(row.join(','));
  }

  var csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
  var downloadLink = document.createElement('a');
  downloadLink.download = 'Laporan_Presensi_SchoolPrime_' + (new Date().toISOString().slice(0,10)) + '.csv';
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// ==============================================================================
// MODUL NOTICE BOARD (PENGUMUMAN)
// ==============================================================================
function loadPengumumanData() {
  callBackendApi('getPengumumanList', [], function(resp) {
    if (resp && resp.status === 'success') {
      appState.pengumumanList = resp.data;
      renderPengumumanTable(resp.data);
    }
  });
}

function renderPengumumanTable(list) {
  var tbody = document.getElementById('pengumumanTableBody');
  if (!tbody) return;

  var html = '';
  list.forEach(function(item) {
    html += 
      '<tr class="hover:bg-slate-50 transition">' +
        '<td class="py-3 px-4 font-mono text-slate-400">' + item.id + '</td>' +
        '<td class="py-3 px-4 font-bold text-slate-900">' + item.judul + '</td>' +
        '<td class="py-3 px-4 text-slate-600">' + item.tanggalAgenda + '</td>' +
        '<td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">' + (item.kategori || 'Umum') + '</span></td>' +
        '<td class="py-3 px-4 text-slate-600 capitalize">' + item.warna + '</td>' +
        '<td class="py-3 px-4 text-right">' +
          '<button onclick="hapusPengumuman(\'' + item.id + '\')" class="text-rose-600 hover:underline font-semibold">Hapus</button>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;
}

function openModalPengumuman() {
  document.getElementById('pengumumanFormId').value = '';
  document.getElementById('pengumumanFormJudul').value = '';
  document.getElementById('pengumumanFormTanggal').value = new Date().toISOString().slice(0, 10);
  document.getElementById('pengumumanFormKategori').value = 'Trip';
  document.getElementById('modalPengumuman').classList.remove('hidden');
}

function closeModalPengumuman() {
  document.getElementById('modalPengumuman').classList.add('hidden');
}

function handleSavePengumuman(e) {
  e.preventDefault();
  var btn = document.getElementById('btnSubmitPengumuman');
  btn.disabled = true;

  var payload = {
    id: document.getElementById('pengumumanFormId').value,
    judul: document.getElementById('pengumumanFormJudul').value.trim(),
    tanggalAgenda: document.getElementById('pengumumanFormTanggal').value,
    kategori: document.getElementById('pengumumanFormKategori').value.trim(),
    warna: document.getElementById('pengumumanFormWarna').value
  };

  callBackendApi('savePengumuman', [payload], function(resp) {
    btn.disabled = false;
    if (resp && resp.status === 'success') {
      showToast(resp.message, 'success');
      closeModalPengumuman();
      loadPengumumanData();
      refreshDashboard();
    } else {
      showToast(resp ? resp.message : 'Gagal simpan', 'error');
    }
  }, function() { btn.disabled = false; });
}

function hapusPengumuman(id) {
  if (!confirm('Hapus agenda pengumuman ini?')) return;
  callBackendApi('deletePengumuman', [id], function(resp) {
    if (resp && resp.status === 'success') {
      showToast(resp.message, 'success');
      loadPengumumanData();
      refreshDashboard();
    }
  });
}

// ==============================================================================
// MODUL PENGATURAN JAM & SEKOLAH
// ==============================================================================
function loadPengaturanForm() {
  callBackendApi('getPengaturan', [], function(resp) {
    if (resp && resp.status === 'success') {
      applyPengaturanToForm(resp.data);
    }
  });
}

function applyPengaturanToForm(p) {
  if (!p) return;
  if (document.getElementById('setNamaSekolah')) document.getElementById('setNamaSekolah').value = p.NamaSekolah || '';
  if (document.getElementById('setAlamatSekolah')) document.getElementById('setAlamatSekolah').value = p.AlamatSekolah || '';
  if (document.getElementById('setNamaKepsek')) document.getElementById('setNamaKepsek').value = p.NamaKepsek || '';
  if (document.getElementById('setJamMasukMulai')) document.getElementById('setJamMasukMulai').value = p.JamMasukMulai || '06:00';
  if (document.getElementById('setJamMasukBatas')) document.getElementById('setJamMasukBatas').value = p.JamMasukBatas || '07:15';
  if (document.getElementById('setJamPulangMulai')) document.getElementById('setJamPulangMulai').value = p.JamPulangMulai || '14:00';
}

function handleSavePengaturan(e) {
  e.preventDefault();
  var btn = document.getElementById('btnSavePengaturan');
  btn.disabled = true;
  btn.innerText = 'Menyimpan...';

  var payload = {
    NamaSekolah: document.getElementById('setNamaSekolah').value.trim(),
    AlamatSekolah: document.getElementById('setAlamatSekolah').value.trim(),
    NamaKepsek: document.getElementById('setNamaKepsek').value.trim(),
    JamMasukMulai: document.getElementById('setJamMasukMulai').value,
    JamMasukBatas: document.getElementById('setJamMasukBatas').value,
    JamPulangMulai: document.getElementById('setJamPulangMulai').value
  };

  callBackendApi(
    'savePengaturan',
    [payload],
    function(resp) {
      btn.disabled = false;
      btn.innerText = 'Simpan Perubahan';
      if (resp && resp.status === 'success') {
        showToast(resp.message, 'success');
        refreshDashboard();
      } else {
        showToast(resp ? resp.message : 'Gagal simpan', 'error');
      }
    },
    function(err) {
      btn.disabled = false;
      btn.innerText = 'Simpan Perubahan';
    }
  );
}

// Utility: String Escaping Anti-Crash
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
