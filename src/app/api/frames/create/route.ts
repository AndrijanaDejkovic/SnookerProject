import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export async function POST(request: NextRequest) {
  const session = driver.session();
  
  try {
    const body = await request.json();
    console.log('Creating frame with data:', body);
    
    const {
      matchId,
      frameNumber,
      winnerId,
      player1Score = 0,
      player2Score = 0,
      breakScore = 0,
      duration = 0
    } = body;

    // Validate required fields
    if (!matchId || !frameNumber) {
      return NextResponse.json(
        { success: false, error: 'Match ID and frame number are required' },
        { status: 400 }
      );
    }

    // Check if frame already exists for this match and frame number
    const existingFrame = await session.run(
      `MATCH (f:Frame)-[:PART_OF]->(m:Match)
       WHERE id(m) = $matchId AND f.frameNumber = $frameNumber
       RETURN f`,
      { matchId: parseInt(matchId), frameNumber: parseInt(frameNumber) }
    );

    if (existingFrame.records.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Frame with this number already exists for this match' },
        { status: 400 }
      );
    }

    // Create the frame
    const result = await session.run(`
      MATCH (m:Match) WHERE id(m) = $matchId
      CREATE (f:Frame {
        frameNumber: $frameNumber,
        player1Score: $player1Score,
        player2Score: $player2Score,
        breakScore: $breakScore,
        duration: $duration,
        createdAt: datetime()
      })
      CREATE (f)-[:PART_OF]->(m)
      ${winnerId ? `
      WITH f
      MATCH (winner:Player) WHERE id(winner) = $winnerId
      CREATE (f)-[:WON_BY]->(winner)
      ` : ''}
      RETURN f {
        .*, 
        id: toString(id(f))
      } as frame
    `, {
      matchId: parseInt(matchId),
      frameNumber: parseInt(frameNumber),
      player1Score: parseInt(player1Score),
      player2Score: parseInt(player2Score),
      breakScore: parseInt(breakScore),
      duration: parseInt(duration),
      winnerId: winnerId ? parseInt(winnerId) : null
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create frame' },
        { status: 500 }
      );
    }

    const frame = result.records[0].get('frame');
    console.log('Created frame:', frame);
    
    return NextResponse.json({
      success: true,
      frame,
      message: 'Frame created successfully'
    });
    
  } catch (error) {
    console.error('Error creating frame:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create frame',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
