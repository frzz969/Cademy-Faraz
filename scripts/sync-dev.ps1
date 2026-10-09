# Ambil versi terbaru dari flashdisk ke workspace C: (jalankan sebelum ngoding)
robocopy "E:\folder projek vs code\cademy" "C:\Users\Atmint\cademy" /E /XD node_modules .next .turbo /NFL /NDL /NJH /NJS
Write-Host "OK - workspace C: sudah sinkron dari flashdisk"
