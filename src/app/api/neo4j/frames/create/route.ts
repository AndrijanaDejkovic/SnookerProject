import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function POST(request: Request) {
  const session = neo4jDriver.session({ database });

  try {
    const body = await request.json();
    const { 
      matchId,
      winnerId,
      loserId,
      frameNumber,
      winnerScore,
      loserScore,
      duration,
      highestBreak,
      status
    } = body;

    // Validate required fields
    if (!matchId || !winnerId || !loserId || !frameNumber || winnerScore === undefined || loserScore === undefined) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: matchId, winnerId, loserId, frameNumber, winnerScore, loserScore',
        },
        { status: 400 }
      );
    }

    // First, verify match exists
    const matchCheck = await session.run(
      'MATCH (m:Match {id: $matchId}) RETURN m',
      { matchId }
    );

    if (matchCheck.records.length === 0) {
      return NextResponse.json(
        { error: `Match with id "${matchId}" not found` },
        { status: 404 }
      );
    }

    // Verify players exist
    const playersCheck = await session.run(
      'MATCH (w:Player {id: $winnerId}), (l:Player {id: $loserId}) RETURN w, l',
      { winnerId, loserId }
    );

    if (playersCheck.records.length === 0) {
      return NextResponse.json(
        { error: `One or both players not found: winnerId "${winnerId}", loserId "${loserId}"` },
        { status: 404 }
      );
    }

    const query = `
      MATCH (m:Match {id: $matchId})
      MATCH (winner:Player {id: $winnerId})
      MATCH (loser:Player {id: $loserId})
      CREATE (f:Frame {
        id: randomUUID(),
        frameNumber: $frameNumber,
        winnerScore: $winnerScore,
        loserScore: $loserScore,
        duration: duration($duration),
        highestBreak: $highestBreak,
        status: $status
      })
      CREATE (m)-[:CONTAINS_FRAME]->(f)
      CREATE (winner)-[:WON_FRAME {
        score: $winnerScore,
        highestBreak: $highestBreak,
        duration: duration($duration)
      }]->(f)
      CREATE (loser)-[:LOST_FRAME {
        score: $loserScore,
        duration: duration($duration)
      }]->(f)
      MERGE (winner)-[cw:COMPETED]->(m)
        ON CREATE SET cw.framesWon = 0, cw.framesLost = 0
      MERGE (loser)-[cl:COMPETED]->(m)
        ON CREATE SET cl.framesWon = 0, cl.framesLost = 0
      SET cw.framesWon = coalesce(cw.framesWon,0) + 1,
          cl.framesLost = coalesce(cl.framesLost,0) + 1
      WITH m, f, winner, loser, cw, cl
      WITH m, f, winner, loser, cw, cl, ceil(m.bestOf/2.0) AS framesToWin
      FOREACH ( _ IN CASE WHEN cw.framesWon >= framesToWin THEN [1] ELSE [] END |
        SET m.winner = winner.id, m.winnerName = winner.name, m.status = 'COMPLETED'
        MERGE (m)-[:WON_BY]->(winner)
        SET cw.won = true, cl.won = false
      )
      RETURN f, winner.name AS winnerName, loser.name AS loserName, cw.framesWon AS winnerFrames, cl.framesWon AS loserFrames, m.winner AS matchWinner
    `;

    const result = await session.run(query, {
      matchId,
      winnerId,
      loserId,
      frameNumber,
      winnerScore,
      loserScore,
      duration: duration || 'PT30M00S',
      highestBreak: highestBreak || 0,
      status: status || 'COMPLETED'
    });

    if (result.records.length > 0) {
      const record = result.records[0];
      const frame = record.get('f').properties;
      const winnerName = record.get('winnerName');
      const loserName = record.get('loserName');
      const winnerFrames = record.get('winnerFrames').toNumber ? record.get('winnerFrames').toNumber() : record.get('winnerFrames');
      const loserFrames = record.get('loserFrames').toNumber ? record.get('loserFrames').toNumber() : record.get('loserFrames');
      const matchWinner = record.get('matchWinner');
      
      return NextResponse.json(
        {
          success: true,
          message: `Frame ${frameNumber} created: ${winnerName} (${winnerScore}) beat ${loserName} (${loserScore})`,
          data: {
            frame,
            winner: { id: winnerId, name: winnerName, score: winnerScore, framesWon: winnerFrames },
            loser: { id: loserId, name: loserName, score: loserScore, framesWon: loserFrames },
            matchWinner: matchWinner || null
          }
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create frame' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating frame:', error);
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

// GET endpoint to list all frames
export async function GET() {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    const query = `
      MATCH (m:Match)-[:CONTAINS_FRAME]->(f:Frame)
      RETURN f.id as id,
             f.frameNumber as frameNumber,
             f.winnerScore as winnerScore,
             f.loserScore as loserScore,
             f.duration as duration,
             f.highestBreak as highestBreak,
             f.status as status,
             m.id as matchId
      ORDER BY m.id, f.frameNumber ASC
    `;

    const result = await session.run(query);

    const frames = result.records.map(record => record.toObject());

    return NextResponse.json(
      {
        success: true,
        count: frames.length,
        data: frames
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
