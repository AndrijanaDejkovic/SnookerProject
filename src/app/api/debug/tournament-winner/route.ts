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
    console.log('Debugging tournament winner issue...');
    
    // Check all matches with round=Final
    const finalMatches = await session.run(`
      MATCH (m:Match) 
      WHERE m.round = 'Final'
      OPTIONAL MATCH (m)-[:PLAYED_IN]->(t:Tournament)
      OPTIONAL MATCH (winner:Player {id: m.winner})
      RETURN m {
        .*,
        tournamentName: t.name,
        tournamentId: t.id,
        winnerName: winner.name
      } as match
    `);

    // Check all tournaments and their status
    const tournaments = await session.run(`
      MATCH (t:Tournament)
      OPTIONAL MATCH (winner:Player {id: t.winner})
      RETURN t {
        .*,
        winnerName: winner.name
      } as tournament
    `);

    // Check PARTICIPATED_IN relationships
    const participated = await session.run(`
      MATCH (p:Player)-[r:PARTICIPATED_IN]->(t:Tournament)
      RETURN p.name as playerName, t.name as tournamentName, r.finalPosition as position, r.prize as prize
    `);

    return NextResponse.json({
      success: true,
      finalMatches: finalMatches.records.map(r => r.get('match')),
      tournaments: tournaments.records.map(r => r.get('tournament')),
      participated: participated.records.map(r => ({
        playerName: r.get('playerName'),
        tournamentName: r.get('tournamentName'),
        position: r.get('position'),
        prize: r.get('prize')
      }))
    });
    
  } catch (error) {
    console.error('Error debugging:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to debug',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
