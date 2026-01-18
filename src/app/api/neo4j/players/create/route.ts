import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function GET() {
  const session = neo4jDriver.session({ database });

  try {
    // Fetch all players
    const result = await session.run(`
      MATCH (p:Player)
      RETURN p.id as id, p.name as name, p.nationality as country
      ORDER BY p.name
      LIMIT 100
    `);

    const players = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      country: record.get('country'),
    }));

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

export async function POST(request: Request) {
  const session = neo4jDriver.session({ database });

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
