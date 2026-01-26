import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = neo4jDriver.session({ database });

  try {
    // First, get tournament details
    const tournamentResult = await session.run(
      `
      MATCH (t:Tournament {id: $id})
      RETURN 
        t.id as id,
        t.name as name,
        t.year as year,
        t.startDate as startDate,
        t.endDate as endDate,
        t.location as location,
        t.prizePool as prizePool
      `,
      { id }
    );

    if (tournamentResult.records.length === 0) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const tournamentRecord = tournamentResult.records[0];
    const tournament = {
      id: tournamentRecord.get('id'),
      name: tournamentRecord.get('name'),
      year: tournamentRecord.get('year')?.toNumber?.() ?? 0,
      startDate: tournamentRecord.get('startDate')?.toString() || null,
      endDate: tournamentRecord.get('endDate')?.toString() || null,
      location: tournamentRecord.get('location'),
      prizePool: tournamentRecord.get('prizePool')?.toNumber?.() ?? 0,
    };

    // Get all matches for this tournament - simplified to avoid duplicates
    const matchesResult = await session.run(
      `
      MATCH (m:Match)-[:PLAYED_IN]->(t:Tournament {id: $id})
      WITH m
      OPTIONAL MATCH (p1:Player)-[:COMPETED]->(m)<-[:COMPETED]-(p2:Player)
      WHERE p1.id < p2.id
      WITH m, p1, p2
      OPTIONAL MATCH (m)-[:CONTAINS_FRAME]->(f:Frame)
      WITH m, p1, p2, collect(f) as frames
      RETURN DISTINCT
        m.id as id,
        m.bestOf as bestOf,
        m.winner as winnerId,
        m.status as status,
        p1.id as player1Id,
        p1.name as player1Name,
        p2.id as player2Id,
        p2.name as player2Name,
        size([f IN frames WHERE (p1)-[:WON_FRAME]->(f)]) as p1FrameWins,
        size([f IN frames WHERE (p2)-[:WON_FRAME]->(f)]) as p2FrameWins,
        size(frames) as totalFrames
      ORDER BY m.id
      `,
      { id }
    );

    const matches = matchesResult.records.map(record => ({
      id: record.get('id'),
      bestOf: record.get('bestOf')?.toNumber?.() ?? 0,
      winnerId: record.get('winnerId'),
      status: record.get('status'),
      player1: {
        id: record.get('player1Id'),
        name: record.get('player1Name'),
      },
      player2: {
        id: record.get('player2Id'),
        name: record.get('player2Name'),
      },
      frames: {
        player1: record.get('p1FrameWins')?.toNumber?.() ?? 0,
        player2: record.get('p2FrameWins')?.toNumber?.() ?? 0,
        total: record.get('totalFrames')?.toNumber?.() ?? 0,
      },
    }));

    console.log('Fetched tournament matches:', { tournament, matches });

    return NextResponse.json({
      success: true,
      data: {
        tournament,
        matches,
      }
    });

  } catch (error) {
    console.error('Error fetching tournament matches:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch tournament matches',
        details: error instanceof Error ? error.stack : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
