import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (!matchId) {
    return NextResponse.json(
      { error: 'Missing required parameter: matchId' },
      { status: 400 }
    );
  }

  const session = neo4jDriver.session({ database });

  try {
    // Confirm existence first
    const exists = await session.run(
      `MATCH (m:Match {id: $matchId}) RETURN m.id as id LIMIT 1`,
      { matchId }
    );

    if (exists.records.length === 0) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Delete the match
    await session.run(
      `MATCH (m:Match {id: $matchId}) DETACH DELETE m`,
      { matchId }
    );

    return NextResponse.json({
      success: true,
      message: `Match ${matchId} deleted successfully`,
      matchId: matchId
    });

  } catch (error) {
    console.error('Error deleting match:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
