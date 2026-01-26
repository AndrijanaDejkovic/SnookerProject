import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = neo4jDriver.session({ database });

  try {
    // Debug query to see raw data structure
    const debugResult = await session.run(
      `
      MATCH (m:Match)-[:PLAYED_IN]->(t:Tournament {id: $id})
      OPTIONAL MATCH (p:Player)-[:COMPETED]->(m)
      RETURN 
        m.id as matchId,
        m.status as status,
        collect(DISTINCT p.name) as players,
        count(p) as playerCount
      ORDER BY m.id
      `,
      { id }
    );

    const debugData = debugResult.records.map(record => ({
      matchId: record.get('matchId'),
      status: record.get('status'),
      players: record.get('players'),
      playerCount: record.get('playerCount')?.toNumber?.() ?? 0,
    }));

    return NextResponse.json({
      success: true,
      tournamentId: id,
      totalMatchRecords: debugData.length,
      matches: debugData
    });

  } catch (error) {
    console.error('Error debugging tournament:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to debug tournament',
        details: error instanceof Error ? error.stack : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
