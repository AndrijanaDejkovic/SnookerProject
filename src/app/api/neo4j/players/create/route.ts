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
    const { name, nationality, dateOfBirth, professionalSince } = body;

    // Validate required fields
    if (!name || !nationality || !dateOfBirth) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: name, nationality, dateOfBirth',
        },
        { status: 400 }
      );
    }

    const query = `
      CREATE (p:Player {
        id: randomUUID(),
        name: $name,
        nationality: $nationality,
        dateOfBirth: date($dateOfBirth),
        professionalSince: date($professionalSince),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN p
    `;

    const result = await session.run(query, {
      name,
      nationality,
      dateOfBirth,
      professionalSince: professionalSince || '2000-01-01'
    });

    if (result.records.length > 0) {
      const player = result.records[0].get('p').properties;
      return NextResponse.json(
        {
          success: true,
          message: `Player "${name}" created successfully`,
          data: player
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating player:', error);
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

// GET endpoint to list all players
export async function GET() {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    const query = `
      MATCH (p:Player)
      RETURN p.id as id,
             p.name as name,
             p.nationality as nationality,
             p.dateOfBirth as dateOfBirth,
             p.professionalSince as professionalSince,
             p.createdAt as createdAt
      ORDER BY p.name ASC
    `;

    const result = await session.run(query);

    const players = result.records.map(record => record.toObject());

    return NextResponse.json(
      {
        success: true,
        count: players.length,
        data: players
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
