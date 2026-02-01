import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json(
      { error: 'Missing required parameter: playerId' },
      { status: 400 }
    );
  }

  const session = neo4jDriver.session({ database });

  try { 
    const fetchResult = await session.run(
      `MATCH (p:Player {id: $playerId}) RETURN p.name as playerName LIMIT 1`,
      { playerId }
    );

    if (fetchResult.records.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const playerName = fetchResult.records[0].get('playerName');

    // Now safely delete the player
    await session.run(
      `MATCH (p:Player {id: $playerId}) DETACH DELETE p`,
      { playerId }
    );

    return NextResponse.json({
      success: true,
      message: `Player ${playerName} deleted successfully`,
      playerId: playerId
    });

  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
