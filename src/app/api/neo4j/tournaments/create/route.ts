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
    database: process.env.NEO4J_DATABASE
  });

  try {
    const body = await request.json();
    const { 
      name, 
      type, 
      startDate, 
      endDate, 
      venue, 
      city, 
      country, 
      prizePool, 
      status, 
      maxRounds 
    } = body;

    // Validate required fields
    if (!name || !type || !startDate || !endDate || !venue) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: name, type, startDate, endDate, venue',
        },
        { status: 400 }
      );
    }

    const query = `
      CREATE (t:Tournament {
        id: randomUUID(),
        name: $name,
        type: $type,
        startDate: date($startDate),
        endDate: date($endDate),
        venue: $venue,
        city: $city,
        country: $country,
        prizePool: $prizePool,
        status: $status,
        maxRounds: $maxRounds,
        createdAt: datetime()
      })
      RETURN t
    `;

    const result = await session.run(query, {
      name,
      type,
      startDate,
      endDate,
      venue,
      city: city || '',
      country: country || '',
      prizePool: prizePool || 0,
      status: status || 'UPCOMING',
      maxRounds: maxRounds || 1
    });

    if (result.records.length > 0) {
      const tournament = result.records[0].get('t').properties;
      return NextResponse.json(
        {
          success: true,
          message: `Tournament "${name}" created successfully`,
          data: tournament
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating tournament:', error);
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

// GET endpoint to list all tournaments
export async function GET() {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    const query = `
      MATCH (t:Tournament)
      OPTIONAL MATCH (p:Player)-[:PARTICIPATED_IN]->(t)
      RETURN t.id as id,
             t.name as name,
             t.type as type,
             t.startDate as startDate,
             t.endDate as endDate,
             t.venue as venue,
             t.status as status,
             t.prizePool as prizePool,
             COUNT(p) as totalParticipants
      ORDER BY t.startDate DESC
    `;

    const result = await session.run(query);

    const tournaments = result.records.map(record => record.toObject());

    return NextResponse.json(
      {
        success: true,
        count: tournaments.length,
        data: tournaments
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
