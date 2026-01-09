import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export async function POST(request: Request) {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    const body = await request.json();
    const { 
      matchNumber,
      tournamentId,
      round, 
      bestOf,
      status,
      startTime,
      endTime,
      venue,
      tableNumber,
      winner
    } = body;

    // Validate required fields
    if (!tournamentId || !round || !bestOf) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: tournamentId, round, bestOf',
        },
        { status: 400 }
      );
    }

    // First, verify tournament exists
    const tournamentCheck = await session.run(
      'MATCH (t:Tournament {id: $tournamentId}) RETURN t',
      { tournamentId }
    );

    if (tournamentCheck.records.length === 0) {
      return NextResponse.json(
        { error: `Tournament with id "${tournamentId}" not found` },
        { status: 404 }
      );
    }

    const query = `
      MATCH (t:Tournament {id: $tournamentId})
      CREATE (m:Match {
        id: randomUUID(),
        matchNumber: $matchNumber,
        round: $round,
        bestOf: $bestOf,
        status: $status,
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        venue: $venue,
        tableNumber: $tableNumber,
        winner: $winner
      })
      CREATE (m)-[:PLAYED_IN]->(t)
      RETURN m
    `;

    const result = await session.run(query, {
      matchNumber: matchNumber || 0,
      tournamentId,
      round,
      bestOf,
      status: status || 'SCHEDULED',
      startTime: startTime || '2024-01-01T00:00:00Z',
      endTime: endTime || '2024-01-01T00:00:00Z',
      venue: venue || '',
      tableNumber: tableNumber || 0,
      winner: winner || null
    });

    if (result.records.length > 0) {
      const match = result.records[0].get('m').properties;
      return NextResponse.json(
        {
          success: true,
          message: `Match "${match.id}" created successfully`,
          data: match
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check your Neo4j connection and request body format'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

// GET endpoint to list all matches
export async function GET() {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    const query = `
      MATCH (m:Match)-[:PLAYED_IN]->(t:Tournament)
      RETURN m.id as id,
             m.matchNumber as matchNumber,
             m.round as round,
             m.bestOf as bestOf,
             m.status as status,
             m.startTime as startTime,
             m.endTime as endTime,
             m.venue as venue,
             t.name as tournament,
             m.winner as winner
      ORDER BY m.startTime DESC
    `;

    const result = await session.run(query);

    const matches = result.records.map(record => record.toObject());

    return NextResponse.json(
      {
        success: true,
        count: matches.length,
        data: matches
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
