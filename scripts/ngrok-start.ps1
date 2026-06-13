# Expone PDV con ngrok (un solo tunel al frontend :3000)
# El API (:4000) se accede via proxy en Next.js (/api/*)
# Uso: .\scripts\ngrok-start.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$config = Join-Path $root "ngrok.yml"
$configExample = Join-Path $root "ngrok.yml.example"

if (-not (Test-Path $config)) {
  Copy-Item $configExample $config
  Write-Host "Creado ngrok.yml - edita TU_NGROK_AUTHTOKEN y vuelve a ejecutar." -ForegroundColor Yellow
  Write-Host "Token en: https://dashboard.ngrok.com/get-started/your-authtoken"
  exit 1
}

if ((Get-Content $config -Raw) -match "TU_NGROK_AUTHTOKEN") {
  Write-Host "Edita ngrok.yml y pon tu authtoken de ngrok." -ForegroundColor Yellow
  exit 1
}

Write-Host "Comprueba que backend (:4000) y frontend (:3000) esten corriendo." -ForegroundColor Cyan
Write-Host "Iniciando tunel ngrok (solo frontend)..." -ForegroundColor Cyan

Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Start-Process -FilePath "ngrok" -ArgumentList "start","pdv-web","--config",$config -WindowStyle Normal

Start-Sleep -Seconds 4

try {
  $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels"
} catch {
  Write-Host "No se pudo leer la API de ngrok (puerto 4040)." -ForegroundColor Red
  exit 1
}

$webUrl = ($tunnels.tunnels | Where-Object { $_.name -eq "pdv-web" }).public_url

if (-not $webUrl) {
  $webUrl = ($tunnels.tunnels | Select-Object -First 1).public_url
}

if (-not $webUrl) {
  Write-Host "No se encontro el tunel pdv-web." -ForegroundColor Red
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

Write-Host ""
Write-Host "=== PDV publicado con ngrok ===" -ForegroundColor Green
Write-Host "Abre esta URL en el navegador o celular:" -ForegroundColor White
Write-Host "  $webUrl/login"
Write-Host ""
Write-Host "IMPORTANTE ngrok (plan gratis):" -ForegroundColor Yellow
Write-Host "1. Pulsa el boton azul 'Visit Site' en la advertencia de ngrok." -ForegroundColor Yellow
Write-Host "2. Si la app no carga, usa Cloudflare en su lugar:" -ForegroundColor Yellow
Write-Host "     .\scripts\cloudflare-start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Archivos .env actualizados." -ForegroundColor Yellow
Write-Host "REINICIA backend y frontend (Ctrl+C y npm run dev)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Panel ngrok: http://127.0.0.1:4040"
Write-Host 'Login: admin@pdv.local / admin123'
