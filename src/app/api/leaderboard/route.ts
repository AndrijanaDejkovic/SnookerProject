import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { createClient } from 'redis';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Connect to Redis
redis.on('error', (err) => console.log('Redis Client Error', err));
if (!redis.isOpen) {
  redis.connect();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const forceRefresh = searchParams.get('refresh') === 'true';

  const cacheKey = playerId ? `leaderboard:player:${playerId}` : `leaderboard:global:${limit}`;
  const cacheTTL = 300; // 5 minutes

  try {
    // Check Redis cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return NextResponse.json({
          success: true,
          cached: true,
          data: JSON.parse(cachedData)
        });
      }
    }

    // Calculate leaderboard from Neo4j
    const session = driver.session({
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    let query: string;
    let params: any;

    if (playerId) {
      // Individual player ranking
      query = `
        // Get player's stats in last 365 days
        MATCH (p:Player {id: $playerId})
        MATCH (p)-[participated:PARTICIPATED_IN]->(t:Tournament)
        WHERE t.endDate >= date() - duration({days: 365})
        WITH p, 
             count(CASE WHEN participated.finalPosition = 1 THEN 1 END) AS tournamentsWon,
             sum(participated.prize) AS totalPrize,
             count(t) AS tournamentsPlayed,
             sum(participated.matchesWon) AS totalMatches,
             sum(participated.framesWon) AS totalFrames
        
        // Calculate global ranking
        MATCH (allPlayers:Player)
        MATCH (allPlayers)-[allParticipated:PARTICIPATED_IN]->(allT:Tournament)
        WHERE allT.endDate >= date() - duration({days: 365})
        WITH p, tournamentsWon, totalPrize, tournamentsPlayed, totalMatches, totalFrames,
             allPlayers,
             count(CASE WHEN allParticipated.finalPosition = 1 THEN 1 END) AS otherTournamentsWon,
             sum(allParticipated.prize) AS otherTotalPrize
        WITH p, tournamentsWon, totalPrize, tournamentsPlayed, totalMatches, totalFrames,
             allPlayers, otherTournamentsWon, otherTotalPrize,
             CASE 
               WHEN otherTournamentsWon > tournamentsWon THEN 1
               WHEN otherTournamentsWon = tournamentsWon AND otherTotalPrize > totalPrize THEN 1
               ELSE 0
             END AS playersBetter
        WITH p, tournamentsWon, totalPrize, tournamentsPlayed, totalMatches, totalFrames,
             sum(playersBetter) + 1 AS ranking
        
        RETURN p.id AS playerId,
               p.name AS playerName,
               p.nationality AS nationality,
               ranking,
               tournamentsWon,
               totalPrize,
               tournamentsPlayed,
               totalMatches,
               totalFrames
      `;
      params = { playerId };
    } else {
      // Global leaderboard
      query = `
        // Calculate rankings for all players based on last 365 days
        MATCH (p:Player)
        OPTIONAL MATCH (p)-[participated:PARTICIPATED_IN]->(t:Tournament)
        WHERE t.endDate >= date() - duration({days: 365})
        WITH p,
             count(CASE WHEN participated.finalPosition = 1 THEN 1 END) AS tournamentsWon,
             sum(participated.prize) AS totalPrize,
             count(t) AS tournamentsPlayed,
             sum(participated.matchesWon) AS totalMatches,
             sum(participated.framesWon) AS totalFrames
        
        // Rank players: first by tournaments won, then by prize money
        ORDER BY tournamentsWon DESC, totalPrize DESC, p.name ASC
        
        WITH collect({
          playerId: p.id,
          playerName: p.name,
          nationality: p.nationality,
          tournamentsWon: coalesce(tournamentsWon, 0),
          totalPrize: coalesce(totalPrize, 0),
          tournamentsPlayed: coalesce(tournamentsPlayed, 0),
          totalMatches: coalesce(totalMatches, 0),
          totalFrames: coalesce(totalFrames, 0)
        }) AS rankedPlayers
        
        UNWIND range(0, size(rankedPlayers)-1) AS index
        WITH rankedPlayers[index] AS player, index + 1 AS ranking
        
        RETURN player.playerId AS playerId,
               player.playerName AS playerName,
               player.nationality AS nationality,
               ranking,
               player.tournamentsWon AS tournamentsWon,
               player.totalPrize AS totalPrize,
               player.tournamentsPlayed AS tournamentsPlayed,
               player.totalMatches AS totalMatches,
               player.totalFrames AS totalFrames
        ORDER BY ranking ASC
        LIMIT $limit
      `;
      params = { limit };
    }

    const result = await session.run(query, params);
    await session.close();

    const leaderboardData = result.records.map(record => ({
      playerId: record.get('playerId'),
      playerName: record.get('playerName'),
      nationality: record.get('nationality'),
      ranking: record.get('ranking').toNumber ? record.get('ranking').toNumber() : record.get('ranking'),
      tournamentsWon: record.get('tournamentsWon').toNumber ? record.get('tournamentsWon').toNumber() : record.get('tournamentsWon'),
      totalPrize: record.get('totalPrize').toNumber ? record.get('totalPrize').toNumber() : record.get('totalPrize'),
      tournamentsPlayed: record.get('tournamentsPlayed').toNumber ? record.get('tournamentsPlayed').toNumber() : record.get('tournamentsPlayed'),
      totalMatches: record.get('totalMatches').toNumber ? record.get('totalMatches').toNumber() : record.get('totalMatches'),
      totalFrames: record.get('totalFrames').toNumber ? record.get('totalFrames').toNumber() : record.get('totalFrames')
    }));

    // Cache the result in Redis
    await redis.setEx(cacheKey, cacheTTL, JSON.stringify(leaderboardData));

    // Also update the global leaderboard cache if this was a player-specific request
    if (playerId && leaderboardData.length > 0) {
      // Store individual player ranking in a separate cache
      const playerRankingKey = `player:ranking:${playerId}`;
      await redis.setEx(playerRankingKey, cacheTTL, JSON.stringify(leaderboardData[0]));
    }

    return NextResponse.json({
      success: true,
      cached: false,
      count: leaderboardData.length,
      data: leaderboardData,
      metadata: {
        calculatedAt: new Date().toISOString(),
        basedOnLast365Days: true,
        rankingCriteria: ['tournaments_won_desc', 'total_prize_desc', 'name_asc']
      }
    });

  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check your Neo4j and Redis connections'
      },
      { status: 500 }
    );
  }
}

// POST endpoint to refresh specific player's ranking (useful after tournament completion)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, action } = body;

    if (action === 'refresh' && playerId) {
      // Clear cache for specific player
      const playerCacheKey = `leaderboard:player:${playerId}`;
      const playerRankingKey = `player:ranking:${playerId}`;
      
      await redis.del(playerCacheKey);
      await redis.del(playerRankingKey);
      
      // Clear global leaderboard cache
      const globalKeys = await redis.keys('leaderboard:global:*');
      if (globalKeys.length > 0) {
        await redis.del(globalKeys);
      }

      return NextResponse.json({
        success: true,
        message: `Leaderboard cache refreshed for player ${playerId}`,
        clearedKeys: [playerCacheKey, playerRankingKey, ...globalKeys]
      });
    }

    if (action === 'refresh_all') {
      // Clear all leaderboard caches
      const allKeys = await redis.keys('leaderboard:*');
      const playerKeys = await redis.keys('player:ranking:*');
      const allCacheKeys = [...allKeys, ...playerKeys];
      
      if (allCacheKeys.length > 0) {
        await redis.del(allCacheKeys);
      }

      return NextResponse.json({
        success: true,
        message: 'All leaderboard caches cleared',
        clearedKeys: allCacheKeys
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "refresh" with playerId or "refresh_all"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error refreshing leaderboard cache:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
