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
    // First, try to find the player
    const findResult = await session.run(
      `
      MATCH (p:Player {id: $id})
      RETURN p.id as id, p.name as name, p.nationality as country,
             p.dateOfBirth as dateOfBirth, p.professionalSince as professionalSince
      `,
      { id, playerId: id }
    );

    let player;
    if (findResult.records.length > 0) {
      player = findResult.records[0].toObject();
      console.log('Found existing player:', player);
      
      // Convert Neo4j temporal objects to strings
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
    } else {
      console.log('Player not found, creating new player with id:', id);
      // Player not found, create a new one with default values
      const createResult = await session.run(
        `
        CREATE (p:Player {
          id: $id,
          name: $id,
          nationality: 'Unknown',
          dateOfBirth: null,
          professionalSince: null
        })
        RETURN p.id as id, p.name as name, p.nationality as country,
               p.dateOfBirth as dateOfBirth, p.professionalSince as professionalSince
        `,
        { id, playerId: id }
      );
      player = createResult.records[0].toObject();
      console.log('Created new player:', player);
      
      // Convert Neo4j temporal objects to strings for newly created player too
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
    }

    // Now, get the rank from Redis cache
    const globalCacheKey = 'leaderboard:global:all';
    let rank = null;
    try {
      const cachedData = await redis.get(globalCacheKey);
      if (cachedData) {
        const leaderboard: Array<{
          playerId: string;
          ranking: number;
        }> = JSON.parse(cachedData);
        const playerEntry = leaderboard.find(p => p.playerId === id);
        if (playerEntry) {
          rank = playerEntry.ranking;
        }
      }
    } catch (redisError) {
      console.warn('Failed to fetch rank from cache:', redisError);
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
