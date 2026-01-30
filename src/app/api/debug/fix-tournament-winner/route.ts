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
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });
  
  try {
    const body = await request.json();
    const { matchId, tournamentId, winnerId } = body;
    
    console.log('Manual tournament winner update:', { matchId, tournamentId, winnerId });
    
    // Update tournament winner and create PARTICIPATED_IN relationship
    const updateQuery = `
      MATCH (t:Tournament {id: $tournamentId})
      MATCH (winner:Player {id: $winnerId})
      SET t.winner = $winnerId, t.status = 'COMPLETED'
      
      // Create or update PARTICIPATED_IN relationship for the winner
      MERGE (winner)-[p:PARTICIPATED_IN]->(t)
      ON CREATE SET 
        p.finalPosition = 1,
        p.prize = coalesce(t.prizePool, 1000),
        p.matchesWon = 1,
        p.framesWon = 1
      ON MATCH SET 
        p.finalPosition = 1,
        p.prize = coalesce(t.prizePool, 1000)
      
      RETURN t.name as tournamentName, winner.name as winnerName, t.id as tournamentId, p.prize as prize
    `;

    const result = await session.run(updateQuery, { tournamentId, winnerId });
    
    if (result.records.length > 0) {
      const record = result.records[0];
      const tournamentName = record.get('tournamentName');
      const winnerName = record.get('winnerName');
      const prize = record.get('prize');
      
      console.log(`Tournament winner updated: ${winnerName} won ${tournamentName} with prize ${prize}`);
      
      return NextResponse.json({
        success: true,
        message: `Tournament winner updated: ${winnerName} won ${tournamentName}`,
        tournament: tournamentName,
        winner: winnerName,
        prize: prize
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update tournament winner - no records returned'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error manually updating tournament winner:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update tournament winner',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
