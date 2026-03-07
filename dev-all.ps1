$ErrorActionPreference = "Stop"

Write-Host "=== JETKIZ DEV ALL ==="
Write-Host ("PWD: " + (Get-Location).Path)
Write-Host "Step 1/2: Kill ports 3000 and 3001..."

# Убиваем оба порта
npx --yes kill-port 3000 3001

Write-Host "Step 2/2: Start API(3000) and Admin(3001)..."

# ВАЖНО: Admin (Next.js) по умолчанию стартует на 3000, поэтому фиксируем 3001
npx --yes concurrently -k -n "API,ADMIN" -c "green,blue" `
  "cd /d D:\Projects\jetkiz-backend\api && set PORT=3000 && npm run start:dev" `
  "cd /d D:\Projects\jetkiz-backend\admin && npm run dev -- -p 3001"
