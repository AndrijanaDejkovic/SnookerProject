import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { frameId, breakPoints, winner } = body;

    if (!frameId) {
      return NextResponse.json(
        { error: 'Missing required parameter: frameId' },
        { status: 400 }
      );
    }

    const session = neo4jDriver.session({ database });

    try {
      const setFields = [];
      const params: any = { frameId };

      if (breakPoints !== undefined) {
        setFields.push('f.breakPoints = $breakPoints');
        params.breakPoints = breakPoints;
      }
      if (winner) {
        setFields.push('f.winner = $winner');
        params.winner = winner;
      }

      if (setFields.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update provided' },
          { status: 400 }
        );
      }

      const query = `
        MATCH (f:Frame {id: $frameId})
        SET ${setFields.join(', ')}
        RETURN f.id as id, f.breakPoints as breakPoints, f.winner as winner
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: 'Frame not found' },
          { status: 404 }
        );
      }

      const frame = result.records[0];
      return NextResponse.json({
        success: true,
        message: 'Frame updated successfully',
        frame: {
          id: frame.get('id'),
          breakPoints: frame.get('breakPoints'),
          winner: frame.get('winner')
        }
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error updating frame:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
