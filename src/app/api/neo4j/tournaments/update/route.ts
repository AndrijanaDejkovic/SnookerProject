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
    const { tournamentId, name, location, startDate, endDate, prizePool } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tournamentId' },
        { status: 400 }
      );
    }

    const session = driver.session({
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    try {
      const setFields = [];
      const params: any = { tournamentId };

      if (name) {
        setFields.push('t.name = $name');
        params.name = name;
      }
      if (location) {
        setFields.push('t.location = $location');
        params.location = location;
      }
      if (startDate) {
        setFields.push('t.startDate = $startDate');
        params.startDate = startDate;
      }
      if (endDate) {
        setFields.push('t.endDate = $endDate');
        params.endDate = endDate;
      }
      if (prizePool !== undefined) {
        setFields.push('t.prizePool = $prizePool');
        params.prizePool = prizePool;
      }

      if (setFields.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update provided' },
          { status: 400 }
        );
      }

      const query = `
        MATCH (t:Tournament {id: $tournamentId})
        SET ${setFields.join(', ')}
        RETURN t.id as id, t.name as name, t.location as location, t.startDate as startDate, t.endDate as endDate, t.prizePool as prizePool
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: 'Tournament not found' },
          { status: 404 }
        );
      }

      const tournament = result.records[0];
      return NextResponse.json({
        success: true,
        message: 'Tournament updated successfully',
        tournament: {
          id: tournament.get('id'),
          name: tournament.get('name'),
          location: tournament.get('location'),
          startDate: tournament.get('startDate'),
          endDate: tournament.get('endDate'),
          prizePool: tournament.get('prizePool')
        }
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
