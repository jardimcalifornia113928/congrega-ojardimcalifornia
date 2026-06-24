$logFile = "C:\apps\Jardim-calfornia\server-log.txt"
Set-Location "C:\apps\Jardim-calfornia"
npm run dev -- -p 3000 *>&1 | Out-File -FilePath $logFile -Encoding UTF8 -Append
