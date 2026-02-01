import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';
import { redis } from '@/lib/redis';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = neo4jDriver.session({ database });

  try {
  
    const findResult = await session.run(
      `
      MATCH (p:Player {id: $id})
      RETURN p.id as id, p.name as name, p.nationality as country,
             p.dateOfBirth as dateOfBirth, p.professionalSince as professionalSince
      `,
      { id, playerId: id }
    );

    // Check if player exists
    if (findResult.records.length === 0) {
      console.log('Player not found:', id);
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const player = findResult.records[0].toObject();
    console.log('Found existing player:', player);
    
    // Convert Neo4j Date objects to strings
    if (player.dateOfBirth) {
      if (typeof player.dateOfBirth === 'object' && player.dateOfBirth.year !== undefined) {
        // Neo4j Date object
        const { year, month, day } = player.dateOfBirth;
        player.dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (player.dateOfBirth instanceof Date) {
        // JavaScript Date object
        player.dateOfBirth = player.dateOfBirth.toISOString().split('T')[0];
      }
    }
    
    // Convert professionalSince if it's a temporal object
    if (player.professionalSince) {
      if (typeof player.professionalSince === 'object' && player.professionalSince.year !== undefined) {
        // Neo4j Date object
        const { year, month, day } = player.professionalSince;
        player.professionalSince = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (player.professionalSince instanceof Date) {
        // JavaScript Date object
        player.professionalSince = player.professionalSince.toISOString().split('T')[0];
      }
    }

    // Now, get the rank from Redis cache or fetch fresh leaderboard
    const globalCacheKey = 'leaderboard:global:all';
    let rank = null;
    try {
      const cachedData = await redis.get(globalCacheKey);
      if (cachedData) {
        const leaderboard: Array<{
          playerId: string;
          ranking: number;
        }> = JSON.parse(cachedData);
        
        console.log(`🔍 Searching for player ${id} in cached leaderboard with ${leaderboard.length} players`);
        
        const playerEntry = leaderboard.find(p => p.playerId === id);
        if (playerEntry) {
          rank = playerEntry.ranking;
          console.log(`✅ Found rank ${rank} for player ${id} in cache`);
        } else {
          console.log(`⚠️ Player ${id} not found in cached leaderboard. Cache may be stale.`);
        }
      } else {
        console.log('⚠️ No leaderboard cache found. Fetching fresh leaderboard...');
        
        // Fetch fresh leaderboard data
        try {
          const leaderboardSession = neo4jDriver.session({ database });
          const leaderboardQuery = `
            MATCH (p:Player {id: $playerId})
            OPTIONAL MATCH (p)<-[:WON_BY]-(m:Match {round: 'Final', status: 'COMPLETED'})-[:PLAYED_IN]->(t:Tournament)
            WHERE t.endDate >= date() - duration({days: 365}) OR t.endDate IS NULL
            
            WITH p, count(DISTINCT t) AS tournamentsWon
            
            // Get all players with their tournament wins to calculate rank
            MATCH (allPlayers:Player)
            OPTIONAL MATCH (allPlayers)<-[:WON_BY]-(m2:Match {round: 'Final', status: 'COMPLETED'})-[:PLAYED_IN]->(t2:Tournament)
            WHERE t2.endDate >= date() - duration({days: 365}) OR t2.endDate IS NULL
            
            WITH p, tournamentsWon, allPlayers, count(DISTINCT t2) AS allPlayerTournamentsWon
            ORDER BY allPlayerTournamentsWon DESC
            
            WITH p, tournamentsWon, collect({player: allPlayers, wins: allPlayerTournamentsWon}) AS rankedPlayers
            
            UNWIND range(0, size(rankedPlayers)-1) AS idx
            WITH p, tournamentsWon, rankedPlayers[idx].player AS rankedPlayer, idx + 1 AS playerRank
            WHERE rankedPlayer.id = p.id
            
            RETURN playerRank AS rank
          `;
          
          const rankResult = await leaderboardSession.run(leaderboardQuery, { playerId: id });
          await leaderboardSession.close();
          
          if (rankResult.records.length > 0) {
            const rankValue = rankResult.records[0].get('rank');
            rank = rankValue?.toNumber ? rankValue.toNumber() : rankValue;
            console.log(`✅ Calculated fresh rank ${rank} for player ${id}`);
          } else {
            console.log(`⚠️ Could not calculate rank for player ${id}`);
          }
        } catch (leaderboardError) {
          console.error('Error calculating fresh rank:', leaderboardError);
        }
      }
    } catch (redisError) {
      console.error('❌ Failed to fetch rank:', redisError);
      // Continue without rank
    }

    // Return player data with rank
    console.log('Returning player data:', { ...player, rank });
    return NextResponse.json({
      ...player,
      rank
    });

  } catch (error) {
    console.error('Error fetching/creating player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
