# Run frontend, backend, and supporting services in one command.
# Usage: powershell -ExecutionPolicy Bypass -File ./dev.ps1

$ErrorActionPreference = "Stop"

Write-Host "Starting infra (Postgres, Neo4j, Redis) via docker compose..." -ForegroundColor Cyan
docker compose up -d postgres neo4j redis

$backendCmd = "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
$frontendCmd = "npm run dev -- --hostname 0.0.0.0 --port 3000"

Write-Host "Starting backend (uvicorn) in new window..." -ForegroundColor Cyan
$backend = Start-Process -FilePath "powershell" -ArgumentList "-NoLogo", "-NoProfile", "-Command", "Set-Location `"$(Join-Path $PSScriptRoot 'backend')`"; $backendCmd" -PassThru

Write-Host "Starting frontend (Next.js) in new window..." -ForegroundColor Cyan
$frontend = Start-Process -FilePath "powershell" -ArgumentList "-NoLogo", "-NoProfile", "-Command", "Set-Location `"$(Join-Path $PSScriptRoot 'frontend')`"; $frontendCmd" -PassThru

Write-Host "Backend PID: $($backend.Id)" -ForegroundColor Green
Write-Host "Frontend PID: $($frontend.Id)" -ForegroundColor Green
Write-Host "Services: docker compose (postgres, neo4j, redis)" -ForegroundColor Green

Write-Host "Open http://localhost:3000 for frontend, http://localhost:8000/docs for API." -ForegroundColor Yellow
