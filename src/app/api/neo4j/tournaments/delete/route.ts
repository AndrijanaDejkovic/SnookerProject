import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournamentId');

  if (!tournamentId) {
    return NextResponse.json(
      { error: 'Missing required parameter: tournamentId' },
      { status: 400 }
    );
  }

  const session = neo4jDriver.session({ database });

  try {
    // Fetch the tournament name first so we can return it after deletion
    const check = await session.run(
      `MATCH (t:Tournament {id: $tournamentId}) RETURN t.name as tournamentName LIMIT 1`,
      { tournamentId }
    );

    if (check.records.length === 0) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const tournamentName = check.records[0].get('tournamentName');

    // Now delete the tournament node
    await session.run(
      `MATCH (t:Tournament {id: $tournamentId}) DETACH DELETE t`,
      { tournamentId }
    );

    return NextResponse.json({
      success: true,
      message: `Tournament ${tournamentName} deleted successfully`,
      tournamentId: tournamentId
    });

  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
