@echo off
echo ====================================================================
echo  School Prime - Auto Deploy ke Google Apps Script via Clasp
echo ====================================================================
echo.

REM Cek apakah .clasp.json sudah ada
if not exist .clasp.json (
    echo [INFO PENTING] File konfigurasi .clasp.json belum terhubung.
    echo.
    echo 1. Pastikan Google Apps Script API sudah diaktifkan di akun Anda:
    echo    https://script.google.com/home/usersettings
    echo.
    echo 2. Login akun Google Anda di terminal (hanya 1 kali):
    echo    npx @google/clasp login
    echo.
    echo 3. Hubungkan ke Script projek Anda:
    echo    npx @google/clasp clone <SCRIPT_ID_ANDA>
    echo.
    echo Setelah langkah di atas selesai, jalankan file deploy.bat ini kembali!
    echo ====================================================================
    pause
    exit /b
)

echo [1/2] Mengunggah seluruh kode (code.gs, setup.gs, html, css, js)...
call npx @google/clasp push --force
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [GAGAL] Push kode gagal. Pastikan sudah login via: npx @google/clasp login
    pause
    exit /b
)

echo.
echo [2/2] Menerapkan versi terbaru Web App...
call npx @google/clasp deploy --description "Auto Deploy %date% %time%"

echo.
echo ====================================================================
echo  SUKSES! Seluruh kode telah otomatis ter-deploy ke Google Apps Script!
echo ====================================================================
pause
