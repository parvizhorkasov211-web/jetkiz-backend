$ErrorActionPreference = "Stop"

Write-Host "Killing port 3000..." -ForegroundColor Yellow
npx --yes kill-port 3000 | Out-Null

Write-Host "Starting API (NestJS)..." -ForegroundColor Green
npm run start:dev
