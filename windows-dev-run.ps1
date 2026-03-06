param(
  [switch]$SkipInstall,
  [switch]$UseNpmCmd
)

$ErrorActionPreference = 'Stop'

Write-Host "[Bruderland] Kontrola pracovního adresáře..." -ForegroundColor Cyan
if (-not (Test-Path "package.json")) {
  throw "V aktuální složce chybí package.json. Spusťte skript ve kořeni lovable/Vite projektu."
}

# Temporary policy only for current process to avoid npm.ps1 policy issues.
try {
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
} catch {
  Write-Warning "Nepodařilo se nastavit Process ExecutionPolicy Bypass. Pokračuji dál..."
}

$npmBin = if ($UseNpmCmd) { "npm.cmd" } else { "npm" }

if (-not $SkipInstall) {
  Write-Host "[Bruderland] Instalace závislostí ($npmBin install)..." -ForegroundColor Cyan
  & $npmBin install
}

Write-Host "[Bruderland] Spouštím vývojový server ($npmBin run dev)..." -ForegroundColor Green
& $npmBin run dev
