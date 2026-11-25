@echo off
echo ====================================================================
echo  School Prime - Auto Deploy ke Google Apps Script via Clasp
echo ====================================================================
echo.

if not exist .clasp.json goto :NO_CLASP

echo [1/2] Mengunggah seluruh kode (code.gs, setup.gs, html, css, js)...
call npx @google/clasp push --force
if %ERRORLEVEL% NEQ 0 goto :PUSH_FAILED

echo.
echo [2/2] Menerapkan versi terbaru Web App...
call npx @google/clasp deploy --description "Auto Deploy School Prime"

echo.
echo ====================================================================
echo  SUKSES! Seluruh kode telah otomatis ter-deploy ke Google Apps Script!
echo ====================================================================
goto :END

:PUSH_FAILED
echo.
echo [GAGAL] Push kode gagal. Pastikan sudah login via: npx @google/clasp login
goto :END

:NO_CLASP
echo [INFO PENTING] File konfigurasi .clasp.json belum terhubung.
echo.
echo 1. Pastikan Google Apps Script API sudah diaktifkan di akun Anda:
echo    https://script.google.com/home/usersettings
echo.
echo 2. Login akun Google Anda di terminal (hanya 1 kali):
echo    npx @google/clasp login
echo.
echo 3. Hubungkan ke Script projek Anda:
echo    npx @google/clasp clone 14-5uqoL4hXItHHaKdaWaXcQ7bVTScf9PQh6LHMygoefwV7MyP61HM8N6
echo.
echo Setelah langkah di atas selesai, jalankan file deploy.bat ini kembali!
echo ====================================================================

:END
pause
