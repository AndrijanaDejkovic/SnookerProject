#!/bin/bash
# Test the leaderboard API

echo "🧪 Testing Leaderboard API..."
echo ""

# Test 1: Get top 10 players
echo "1️⃣ Testing: GET /api/redis/leaderboard?limit=10"
curl -s "http://localhost:3000/api/redis/leaderboard?limit=10" | head -c 500
echo ""
echo ""

# Test 2: Refresh cache
echo "2️⃣ Testing: POST /api/redis/leaderboard (refresh cache)"
curl -s -X POST "http://localhost:3000/api/redis/leaderboard" \
  -H "Content-Type: application/json" \
  -d '{"action":"refresh_all"}' | head -c 300
echo ""
echo ""

# Test 3: Get top 5
echo "3️⃣ Testing: GET /api/redis/leaderboard?limit=5"
curl -s "http://localhost:3000/api/redis/leaderboard?limit=5" | head -c 500
echo ""
