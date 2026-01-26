import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json(
      { error: 'Missing required parameter: playerId' },
      { status: 400 }
    );
  }

  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    // First, fetch the player's name to confirm existence
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
