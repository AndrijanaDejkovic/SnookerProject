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
    console.log('Fetching all matches from Neo4j...');
    
    const result = await session.run(`
      MATCH (m:Match)
      OPTIONAL MATCH (m)<-[:COMPETED]-(p1:Player)
      OPTIONAL MATCH (m)<-[:COMPETED]-(p2:Player)
      OPTIONAL MATCH (m)-[:PLAYED_IN]->(t:Tournament)
      WHERE p1 <> p2
      WITH m, t, collect(DISTINCT p1) + collect(DISTINCT p2) as players
      WHERE size(players) >= 2
      WITH m, t, players[0] as player1, players[1] as player2
      RETURN m {
        .*,
        player1Id: player1.id,
        player1Name: player1.name,
        player2Id: player2.id,
        player2Name: player2.name,
        tournamentName: t.name,
        tournamentId: t.id,
        date: toString(m.date),
        displayName: player1.name + ' vs ' + player2.name + 
                    CASE WHEN t.name IS NOT NULL THEN ' (' + t.name + ')' ELSE '' END +
                    CASE WHEN m.round IS NOT NULL THEN ' - ' + m.round ELSE '' END
      } as match
      ORDER BY m.date DESC
    `);

    const matches = result.records.map(record => record.get('match'));
    
    console.log(`Found ${matches.length} matches`);
    
    return NextResponse.json({
      success: true,
      matches,
      count: matches.length
    });
    
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch matches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
