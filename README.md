# MEDIA COMPRESSOR PWA

PWA local-first untuk kompres foto/video, menyimpan hasil di IndexedDB, lalu mengunggah hasil ke Google Drive melalui Google Apps Script.

## Struktur GitHub

- `index.html` — UI PWA
- `style.css` — UI modern/responsive
- `app.js` — kompresi, IndexedDB, queue upload
- `sw.js` — Service Worker
- `manifest.json` — konfigurasi PWA
- `icon-192.png` / `icon-512.png` — ikon
- `Code.gs` — backend Google Apps Script
- `README.md` — panduan

## Google Apps Script

`Code.gs` sudah dikonfigurasi dengan:

- Drive Folder ID: `1zzXDGq_EAcirddYTPwZOz-QkKC75Ydx7`
- Sheet ID: `1WrP4akQg13sNHebyhZ0kxuxXgYDKJcT7-_90LSzboQQ`

Di Google Sheet: **Ekstensi → Apps Script**, tempel `Code.gs`, simpan, lalu deploy sebagai **Web app**.

Frontend sudah memiliki default GAS URL:

`https://script.google.com/macros/s/AKfycbzEls3l9OVnW5rs0iSq9Y73n-zdpnxAs0LfwHLauZg2MZxWtdlL-xnotcCxiuFpnCqwsA/exec`

URL tersebut juga dapat diubah dari **Pengaturan → Google Apps Script → GAS Web App URL**.

## Google Sheet

Backend otomatis membuat sheet `FILES` jika belum ada. Metadata dasar:
`ID, TIMESTAMP, ORIGINAL_NAME, OUTPUT_NAME, TYPE, ORIGINAL_SIZE, COMPRESSED_SIZE, SAVINGS, DRIVE_FILE_ID, DRIVE_URL, STATUS`

## GitHub Pages

Upload seluruh isi folder ini ke **root repository** (bukan ZIP sebagai satu file), lalu:
**Settings → Pages → Deploy from branch → main → / (root)**.

## Cara kerja

1. Pilih foto/video.
2. Kompres di browser.
3. Hasil disimpan ke IndexedDB terlebih dahulu.
4. Jika online dan Auto Upload aktif, hasil dikirim ke GAS.
5. Jika upload gagal/offline, status tetap `PENDING`.
6. Saat online kembali, Auto Retry mencoba upload lagi.

## Catatan video

Kompresi video menggunakan API native browser (`MediaRecorder` + Canvas). Output dapat berupa WebM sesuai dukungan browser; konversi H.264/MP4 yang konsisten membutuhkan encoder tambahan seperti WebAssembly/FFmpeg dan tidak dipaksakan agar aplikasi tidak crash.

## PWA

Service Worker mencache shell aplikasi. Jika melakukan perubahan besar pada asset, naikkan versi cache di `sw.js`.

## Keamanan

Jangan menaruh OAuth secret, service-account private key, atau API secret di frontend. `Code.gs` adalah backend dan akses Drive dilakukan dari Apps Script.

## Pengujian yang disarankan

Tes JPG/PNG, portrait/landscape, MP4, 1080p/4K, 30/60 FPS, offline/online, refresh, install PWA, upload Drive, metadata Sheets, dan penghapusan lokal.


## File Lokal & Google Drive

Menu **File Saya** sekarang memiliki dua sumber:
- **File Lokal**: membaca hasil kompres yang tersimpan di IndexedDB tanpa perlu internet.
- **Baca Folder Lokal**: pada Chrome/Edge, pengguna dapat memilih folder dan aplikasi membaca daftar foto/video di folder tersebut. Browser tetap meminta izin folder karena halaman web tidak boleh membaca seluruh disk secara diam-diam.
- **Google Drive**: mencari file langsung dari folder Drive yang dikonfigurasi melalui GAS. Pencarian menggunakan parameter `q`.

Catatan: file lokal yang dipilih melalui folder picker hanya dibaca untuk daftar/penelusuran; file tidak otomatis disalin ke IndexedDB atau Drive sampai pengguna memilih proses berikutnya.


## Kompres dari File Lokal

Selain memilih file lewat tombol **Pilih media**, Anda sekarang bisa:
1. Buka **File Saya → File Lokal**.
2. Klik **📁 Baca Folder Lokal**.
3. Pilih folder yang berisi foto/video.
4. Cari file lokal.
5. Klik **Kompres** pada file yang dipilih.
6. Aplikasi memasukkan file tersebut ke engine kompres yang sama.
7. Hasil masuk ke IndexedDB dan dapat di-download atau di-upload ke Drive.
8. Anda juga bisa **drag & drop** file foto/video langsung ke area kompres.

Dengan demikian alurnya:
`File Lokal → Kompres → IndexedDB → Queue → Google Drive + Sheets`.


## Mode Cepat

Preset default sekarang diarahkan ke **🚀 Fast** untuk mempercepat proses di perangkat.

- Foto Fast: maksimal 1280px, kualitas 80%.
- Foto Balanced: maksimal 1920px, kualitas 85%.
- Foto High Quality: maksimal 2560px, kualitas 90%.
- Video Fast: maksimal 720p, bitrate sekitar 4 Mbps.
- Video Social: maksimal 1080p, sekitar 6 Mbps.
- Video Balanced: maksimal 1080p, sekitar 8 Mbps.
- Video High Quality: maksimal 1440p, sekitar 12 Mbps.

Aplikasi menampilkan estimasi ukuran hasil sebelum kompres. Preset tetap dapat diubah di layar kompresi atau Pengaturan.
