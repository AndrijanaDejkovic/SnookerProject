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
  const session = driver.session();
  
  try {
    console.log('Fetching all frames from Neo4j...');
    
    const result = await session.run(`
      MATCH (f:Frame)<-[:CONTAINS_FRAME]-(m:Match)
      OPTIONAL MATCH (winner:Player)-[:WON_FRAME]->(f)
      OPTIONAL MATCH (loser:Player)-[:LOST_FRAME]->(f)
      OPTIONAL MATCH (m)<-[:COMPETED]-(p1:Player)
      OPTIONAL MATCH (m)<-[:COMPETED]-(p2:Player)
      OPTIONAL MATCH (m)-[:PART_OF_TOURNAMENT]->(t:Tournament)
      WHERE p1 <> p2
      WITH f, m, winner, loser, t,
           CASE WHEN winner = p1 THEN p1 ELSE p2 END AS player1,
           CASE WHEN winner = p1 THEN p2 ELSE p1 END AS player2
      RETURN f {
        .*, 
        id: f.id,
        winnerName: winner.name,
        winnerId: winner.id,
        loserName: loser.name,
        loserId: loser.id,
        matchId: m.id,
        matchInfo: player1.name + ' vs ' + player2.name + 
                  CASE WHEN t.name IS NOT NULL THEN ' (' + t.name + ')' ELSE '' END,
        tournamentName: t.name,
        tournamentId: t.id,
        player1Name: player1.name,
        player2Name: player2.name,
        player1Id: player1.id,
        player2Id: player2.id
      } as frame
      ORDER BY f.frameNumber ASC
    `);

    const frames = result.records.map(record => record.get('frame'));
    
    console.log(`Found ${frames.length} frames`);
    
    return NextResponse.json({
      success: true,
      frames,
      count: frames.length
    });
    
  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch frames',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
