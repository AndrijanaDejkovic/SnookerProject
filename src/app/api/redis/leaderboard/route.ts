import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';
import { redis } from '@/lib/redis';

export async function GET(request: Request) {
  const session = neo4jDriver.session({ database });
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const limit = parseInt(searchParams.get('limit') || '50');

  const globalCacheKey = 'leaderboard:global:all';
  const cacheTTL = 300; // 5 minutes

  try {
    let globalLeaderboard: Array<{
      playerId: string;
      playerName: string;
      nationality: string;
      ranking: number;
      tournamentsWon: number;
      totalPrize: number;
      tournamentsPlayed: number;
      totalMatches: number;
      totalFrames: number;
    }> = [];

    // Check if we have cached global leaderboard
    const cachedData = await redis.get(globalCacheKey);
    if (cachedData) {
      globalLeaderboard = JSON.parse(cachedData);
      
      if (playerId) {
        // Find specific player in cached data
        const playerData = globalLeaderboard.find(player => player.playerId === playerId);
        if (playerData) {
          return NextResponse.json({
            success: true,
            cached: true,
            data: [playerData]
          });
        } else {
          return NextResponse.json({
            success: true,
            cached: true,
            data: [],
            message: `Player ${playerId} not found in current rankings`
          });
        }
      } else {
        // Return limited global leaderboard from cache
        const limitedData = globalLeaderboard.slice(0, limit);
        return NextResponse.json({
          success: true,
          cached: true,
          count: limitedData.length,
          data: limitedData
        });
      }
    }

    // Calculate fresh leaderboard from Neo4j (always get ALL players)
    // reuse existing session (do not redeclare `session`)

    const query = `
      // Calculate rankings for all players based on tournaments they won (Final matches)
      MATCH (p:Player)
      
      // Find all tournaments won by this player (Final matches with player as winner)
      OPTIONAL MATCH (p)<-[:WON_BY]-(m:Match {round: 'Final', status: 'COMPLETED'})-[:PLAYED_IN]->(t:Tournament)
      WHERE t.endDate >= date() - duration({days: 365}) OR t.endDate IS NULL
      
      WITH p,
           count(DISTINCT t) AS tournamentsWon,
           sum(coalesce(t.prizePool, 1000)) AS totalPrize,
           collect(DISTINCT t.id) AS wonTournamentIds
      
      // Get tournament participation count
      WITH p, tournamentsWon, totalPrize, wonTournamentIds
      OPTIONAL MATCH (p)-[:COMPETED]->(m2:Match)-[:PLAYED_IN]->(t2:Tournament)
      WHERE t2.endDate >= date() - duration({days: 365}) OR t2.endDate IS NULL
      
      WITH p, tournamentsWon, totalPrize, wonTournamentIds,
           count(DISTINCT t2) AS tournamentsPlayed,
           count(DISTINCT m2) AS totalMatches
      
      // Get frames won
      WITH p, tournamentsWon, totalPrize, wonTournamentIds, tournamentsPlayed, totalMatches
      OPTIONAL MATCH (p)-[:WON_FRAME]->(f:Frame)
      
      WITH p, tournamentsWon, totalPrize, wonTournamentIds, tournamentsPlayed, totalMatches,
           count(DISTINCT f) AS totalFrames
      
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
    `;

    const result = await session.run(query);
    await session.close();

    globalLeaderboard = result.records.map(record => ({
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

    // Cache the complete global leaderboard
    await redis.setEx(globalCacheKey, cacheTTL, JSON.stringify(globalLeaderboard));

    // Return the requested data
    if (playerId) {
      // Find specific player
      const playerData = globalLeaderboard.find(player => player.playerId === playerId);
      if (playerData) {
        return NextResponse.json({
          success: true,
          cached: false,
          data: [playerData],
          metadata: {
            calculatedAt: new Date().toISOString(),
            basedOnLast365Days: true,
            rankingCriteria: ['tournaments_won_desc', 'total_prize_desc', 'name_asc']
          }
        });
      } else {
        return NextResponse.json({
          success: true,
          cached: false,
          data: [],
          message: `Player ${playerId} not found in current rankings`,
          metadata: {
            calculatedAt: new Date().toISOString(),
            basedOnLast365Days: true
          }
        });
      }
    } else {
      // Return limited global leaderboard
      const limitedData = globalLeaderboard.slice(0, limit);
      return NextResponse.json({
        success: true,
        cached: false,
        count: limitedData.length,
        totalPlayers: globalLeaderboard.length,
        data: limitedData,
        metadata: {
          calculatedAt: new Date().toISOString(),
          basedOnLast365Days: true,
          rankingCriteria: ['tournaments_won_desc', 'total_prize_desc', 'name_asc']
        }
      });
    }

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
    const { action } = body;

    if (action === 'refresh_all') {
      // Clear the single global leaderboard cache
      const globalCacheKey = 'leaderboard:global:all';
      await redis.del(globalCacheKey);

      return NextResponse.json({
        success: true,
        message: 'Global leaderboard cache cleared',
        clearedKeys: [globalCacheKey]
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "refresh_all" to clear leaderboard cache' },
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
