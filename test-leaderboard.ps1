# Test the leaderboard API (Windows PowerShell)

Write-Host "🧪 Testing Leaderboard API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Get top 10 players
Write-Host "1️⃣ Testing: GET /api/redis/leaderboard?limit=10" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/redis/leaderboard?limit=10" -Method Get
  Write-Host "✅ Success!" -ForegroundColor Green
  Write-Host "Count: $($response.count)"
  Write-Host "Cached: $($response.cached)"
  if ($response.data.Count -gt 0) {
    Write-Host "Top player: $($response.data[0].playerName) - Rank: $($response.data[0].ranking)"
  }
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Refresh cache
Write-Host "2️⃣ Testing: POST /api/redis/leaderboard (refresh cache)" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/redis/leaderboard" `
    -Method Post `
    -Body '{"action":"refresh_all"}' `
    -ContentType "application/json"
  Write-Host "✅ Success!" -ForegroundColor Green
  Write-Host "Message: $($response.message)"
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Get top 5
Write-Host "3️⃣ Testing: GET /api/redis/leaderboard?limit=5" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/redis/leaderboard?limit=5" -Method Get
  Write-Host "✅ Success!" -ForegroundColor Green
  Write-Host "Count: $($response.count)"
  $response.data | ForEach-Object {
    Write-Host "  $($_.ranking). $($_.playerName) - Won: $($_.tournamentsWon) tournaments"
  }
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✨ Tests Complete!" -ForegroundColor Cyan
