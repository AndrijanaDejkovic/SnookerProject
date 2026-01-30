import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export async function GET() {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });
  
  try {
    // Check for any PARTICIPATED_IN relationships
    const participatedQuery = `
      MATCH (p:Player)-[r:PARTICIPATED_IN]->(t:Tournament)
      RETURN p.name as playerName, t.name as tournamentName, 
             r.finalPosition as position, r.prize as prize, r.createdAt as createdAt
      ORDER BY r.createdAt DESC
    `;
    
    // Check all tournaments and their winners
    const tournamentsQuery = `
      MATCH (t:Tournament)
      OPTIONAL MATCH (winner:Player {id: t.winner})
      RETURN t.name as tournamentName, t.winner as winnerId, winner.name as winnerName, t.status as status
    `;
    
    // Check all Final matches
    const finalMatchesQuery = `
      MATCH (m:Match)
      WHERE m.round = 'Final' AND m.status = 'COMPLETED'
      OPTIONAL MATCH (m)-[:PLAYED_IN]->(t:Tournament)
      OPTIONAL MATCH (winner:Player {id: m.winner})
      RETURN m.id as matchId, m.winner as winnerId, winner.name as winnerName,
             t.id as tournamentId, t.name as tournamentName
    `;

    const [participatedResult, tournamentsResult, finalMatchesResult] = await Promise.all([
      session.run(participatedQuery),
      session.run(tournamentsQuery),
      session.run(finalMatchesQuery)
    ]);

    return NextResponse.json({
      success: true,
      participatedRelationships: participatedResult.records.map(r => ({
        playerName: r.get('playerName'),
        tournamentName: r.get('tournamentName'),
        position: r.get('position'),
        prize: r.get('prize'),
        createdAt: r.get('createdAt')
      })),
      tournaments: tournamentsResult.records.map(r => ({
        tournamentName: r.get('tournamentName'),
        winnerId: r.get('winnerId'),
        winnerName: r.get('winnerName'),
        status: r.get('status')
      })),
      completedFinalMatches: finalMatchesResult.records.map(r => ({
        matchId: r.get('matchId'),
        winnerId: r.get('winnerId'),
        winnerName: r.get('winnerName'),
        tournamentId: r.get('tournamentId'),
        tournamentName: r.get('tournamentName')
      }))
    });
    
  } catch (error) {
    console.error('Error checking relationships:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check relationships',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

export async function POST(request: Request) {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });
  
  try {
    const body = await request.json();
    const { winnerId, tournamentId } = body;
    
    console.log('Manually creating PARTICIPATED_IN relationship:', { winnerId, tournamentId });
    
    // Create the PARTICIPATED_IN relationship manually
    const createQuery = `
      MATCH (p:Player {id: $winnerId})
      MATCH (t:Tournament {id: $tournamentId})
      MERGE (p)-[r:PARTICIPATED_IN]->(t)
      ON CREATE SET 
        r.finalPosition = 1,
        r.prize = coalesce(t.prizePool, 1000),
        r.matchesWon = 1,
        r.framesWon = 1,
        r.createdAt = datetime()
      ON MATCH SET 
        r.finalPosition = 1,
        r.prize = coalesce(t.prizePool, 1000),
        r.updatedAt = datetime()
      
      // Also update tournament winner
      SET t.winner = $winnerId, t.status = 'COMPLETED'
      
      RETURN p.name as playerName, t.name as tournamentName, r.prize as prize
    `;
    
    const result = await session.run(createQuery, { winnerId, tournamentId });
    
    if (result.records.length > 0) {
      const record = result.records[0];
      return NextResponse.json({
        success: true,
        message: 'PARTICIPATED_IN relationship created successfully',
        playerName: record.get('playerName'),
        tournamentName: record.get('tournamentName'),
        prize: record.get('prize')
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create relationship - no records returned'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
