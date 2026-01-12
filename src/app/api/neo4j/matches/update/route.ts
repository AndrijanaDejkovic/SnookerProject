import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { matchId, winner, bestOf, status } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Missing required parameter: matchId' },
        { status: 400 }
      );
    }

    const session = driver.session({
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    try {
      const setFields = [];
      const params: any = { matchId };

      if (winner) {
        setFields.push('m.winner = $winner');
        params.winner = winner;
      }
      if (bestOf !== undefined) {
        setFields.push('m.bestOf = $bestOf');
        params.bestOf = bestOf;
      }
      if (status) {
        setFields.push('m.status = $status');
        params.status = status;
      }

      if (setFields.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update provided' },
          { status: 400 }
        );
      }

      const query = `
        MATCH (m:Match {id: $matchId})
        SET ${setFields.join(', ')}
        RETURN m.id as id, m.winner as winner, m.bestOf as bestOf, m.status as status
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: 'Match not found' },
          { status: 404 }
        );
      }

      const match = result.records[0];
      return NextResponse.json({
        success: true,
        message: 'Match updated successfully',
        match: {
          id: match.get('id'),
          winner: match.get('winner'),
          bestOf: match.get('bestOf'),
          status: match.get('status')
        }
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
