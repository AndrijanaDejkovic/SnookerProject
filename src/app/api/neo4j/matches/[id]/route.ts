import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const matchId = params.id;
  const session = neo4jDriver.session({ database });

  try {
    const query = `
      MATCH (m:Match {id: $matchId})
      OPTIONAL MATCH (p:Player)-[:COMPETED]->(m)
      OPTIONAL MATCH (m)-[:PLAYED_IN]->(t:Tournament)
      RETURN m, collect(DISTINCT {id: p.id, name: p.name}) as playerData, t
      LIMIT 1
    `;

    const result = await session.run(query, { matchId });
    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const rec = result.records[0];
    const mNode = rec.get('m');
    const tNode = rec.get('t');
    const players = rec.get('playerData') || [];

    const mProps = (mNode && mNode.properties) ? mNode.properties : {};
    const tProps = (tNode && tNode.properties) ? tNode.properties : null;

    // Convert possible Neo4j DateTime to string
    const startTimeRaw = mProps.startTime;
    const startTime = startTimeRaw && typeof startTimeRaw.toString === 'function' ? startTimeRaw.toString() : startTimeRaw;

    const matchObj: any = {
      id: mProps.id || matchId,
      matchNumber: mProps.matchNumber,
      round: mProps.round,
      bestOf: mProps.bestOf,
      status: mProps.status,
      startTime: startTime || null,
      endTime: mProps.endTime && typeof mProps.endTime.toString === 'function' ? mProps.endTime.toString() : mProps.endTime,
      venue: mProps.venue,
      tableNumber: mProps.tableNumber,
      winner: mProps.winner,
      player1Id: players[0]?.id || undefined,
      player2Id: players[1]?.id || undefined,
      player1Name: players[0]?.name || 'Unknown',
      player2Name: players[1]?.name || 'Unknown',
      players: players.length >=2 ? `${players[0]?.name || 'Unknown'} vs ${players[1]?.name || 'Unknown'}` : 'Unknown vs Unknown',
      tournamentId: tProps?.id,
      tournamentName: tProps?.name || undefined
    };

    return NextResponse.json({ success: true, data: matchObj }, { status: 200 });
  } catch (error) {
    console.error('Error fetching match details:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await session.close();
  }
}
