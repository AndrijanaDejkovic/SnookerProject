import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { playerId, name, nationality, ranking } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing required parameter: playerId' },
        { status: 400 }
      );
    }

    const session = neo4jDriver.session({ database });

    try {
      // Build the SET clause dynamically based on what fields are provided
      const setFields = [];
      const params: any = { playerId };

      if (name) {
        setFields.push('p.name = $name');
        params.name = name;
      }
      if (nationality) {
        setFields.push('p.nationality = $nationality');
        params.nationality = nationality;
      }
      if (ranking !== undefined) {
        setFields.push('p.ranking = $ranking');
        params.ranking = ranking;
      }

      if (setFields.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update provided' },
          { status: 400 }
        );
      }

      const query = `
        MATCH (p:Player {id: $playerId})
        SET ${setFields.join(', ')}
        RETURN p.id as id, p.name as name, p.nationality as nationality, p.ranking as ranking
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }

      const player = result.records[0];
      return NextResponse.json({
        success: true,
        message: 'Player updated successfully',
        player: {
          id: player.get('id'),
          name: player.get('name'),
          nationality: player.get('nationality'),
          ranking: player.get('ranking')
        }
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
