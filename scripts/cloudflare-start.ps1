# Expone PDV con Cloudflare Tunnel (sin pantalla de advertencia de ngrok)
# Uso: .\scripts\cloudflare-start.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Find-Cloudflared {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "$env:ProgramFiles\cloudflared\cloudflared.exe",
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
  )

  foreach ($path in $candidates) {
    if (Test-Path $path) { return $path }
  }

  $wingetPackage = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" `
    -Filter "cloudflared.exe" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName

  if ($wingetPackage) { return $wingetPackage }
  return $null
}

$cloudflaredPath = Find-Cloudflared
if (-not $cloudflaredPath) {
  Write-Host "cloudflared no esta instalado." -ForegroundColor Yellow
  Write-Host "Instala con: winget install Cloudflare.cloudflared"
  Write-Host "Cierra y abre PowerShell despues de instalar."
  exit 1
}

Write-Host "Usando cloudflared: $cloudflaredPath" -ForegroundColor DarkGray

Write-Host "Comprueba que backend (:4000) y frontend (:3000) esten corriendo." -ForegroundColor Cyan

Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$logFile = Join-Path $root "cloudflared.log"
if (Test-Path $logFile) { Remove-Item $logFile -Force }

Start-Process -FilePath $cloudflaredPath `
  -ArgumentList "tunnel","--url","http://localhost:3000","--logfile",$logFile `
  -WindowStyle Minimized

Write-Host "Esperando URL publica de Cloudflare..." -ForegroundColor Cyan
$webUrl = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $logFile) {
    $log = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($log -match "(https://[a-z0-9-]+\.trycloudflare\.com)") {
      $webUrl = $matches[1]
      break
    }
  }
}

if (-not $webUrl) {
  Write-Host "No se pudo obtener la URL. Revisa $logFile" -ForegroundColor Red
  exit 1
}

$envFile = Join-Path $root ".env"
$backendEnv = Join-Path $root "backend\.env"

Set-Content -Path $envFile -Value @(
  "NEXT_PUBLIC_API_URL=$webUrl"
  "AUTH_SECRET=IZofufm1LP3eRR1QB-vZmMmQ4lo4IDVX0ELu2pRpvdI"
)

$backendLines = Get-Content $backendEnv
$backendLines = $backendLines | ForEach-Object {
  if ($_ -match "^FRONTEND_URL=") { "FRONTEND_URL=$webUrl" }
  elseif ($_ -match "^API_PUBLIC_URL=") { "API_PUBLIC_URL=$webUrl" }
  else { $_ }
}
Set-Content -Path $backendEnv -Value $backendLines

$urlFile = Join-Path $root "tunnel-url.txt"
Set-Content -Path $urlFile -Value "$webUrl/login"

$lanIp = (
  Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
  Select-Object -First 1 -ExpandProperty IPAddress
)

Write-Host ""
Write-Host "=== PDV publico con Cloudflare ===" -ForegroundColor Green
Write-Host "USA SOLO ESTA URL (las anteriores dejan de funcionar):" -ForegroundColor Yellow
Write-Host "  $webUrl/login" -ForegroundColor White
Write-Host ""
Write-Host "URL guardada en: tunnel-url.txt" -ForegroundColor DarkGray
Write-Host "Si ves error 530, ejecuta este script otra vez." -ForegroundColor DarkGray
Write-Host ""
if ($lanIp) {
  Write-Host "Red local (misma WiFi, sin tunel):" -ForegroundColor White
  Write-Host "  http://${lanIp}:3000/login"
  Write-Host ""
}
Write-Host "Archivos .env actualizados." -ForegroundColor Yellow
Write-Host "REINICIA backend y frontend (Ctrl+C y npm run dev)." -ForegroundColor Yellow
Write-Host "Si usas Cloudflare, next.config.ts ya permite *.trycloudflare.com" -ForegroundColor DarkGray
Write-Host 'Login: admin@pdv.local / admin123'
