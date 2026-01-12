import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const player1Id = searchParams.get('player1Id');
  const player2Id = searchParams.get('player2Id');

  if (!player1Id || !player2Id) {
    return NextResponse.json(
      { 
        error: 'Missing required parameters: player1Id, player2Id',
    
      },
      { status: 400 }
    );
  }

  if (player1Id === player2Id) {
    return NextResponse.json(
      { error: 'Cannot compare player with themselves. Please provide different player IDs.' },
      { status: 400 }
    );
  }

  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    // First verify both players exist
    const playersCheck = await session.run(
      `MATCH (p1:Player {id: $player1Id}), (p2:Player {id: $player2Id}) 
       RETURN p1.name as player1Name, p2.name as player2Name`,
      { player1Id, player2Id }
    );

    if (playersCheck.records.length === 0) {
      return NextResponse.json(
        { error: 'One or both players not found' },
        { status: 404 }
      );
    }

    const player1Name = playersCheck.records[0].get('player1Name');
    const player2Name = playersCheck.records[0].get('player2Name');

    // Main head-to-head query
    const query = `
      MATCH (p1:Player {id: $player1Id}), (p2:Player {id: $player2Id})
      
      // Find all matches between these two players
      OPTIONAL MATCH (p1)-[:COMPETED]->(m:Match)<-[:COMPETED]-(p2)
      
      // Get all frames in these head-to-head matches ONLY
      OPTIONAL MATCH (m)-[:CONTAINS_FRAME]->(f:Frame)
      WHERE m IS NOT NULL
      
      // Get tournament wins (last 365 days)
      OPTIONAL MATCH (p1)-[part1:PARTICIPATED_IN]->(t1:Tournament)
      WHERE part1.finalPosition = 1 AND t1.endDate >= date() - duration({days: 365})
      OPTIONAL MATCH (p2)-[part2:PARTICIPATED_IN]->(t2:Tournament)
      WHERE part2.finalPosition = 1 AND t2.endDate >= date() - duration({days: 365})
      
      WITH p1, p2, collect(DISTINCT m) AS allMatches,
           collect(DISTINCT f) AS allFrames,
           collect(DISTINCT t1) AS p1Tournaments,
           collect(DISTINCT t2) AS p2Tournaments
      
      // Count frames won by each player in head-to-head matches ONLY
      WITH p1, p2, allMatches, allFrames, p1Tournaments, p2Tournaments,
           [f IN allFrames WHERE (p1)-[:WON_FRAME]->(f)] AS p1WonFrames,
           [f IN allFrames WHERE (p2)-[:WON_FRAME]->(f)] AS p2WonFrames,
           [m IN allMatches WHERE m.winner = p1.id] AS p1MatchWins,
           [m IN allMatches WHERE m.winner = p2.id] AS p2MatchWins,
           [m IN allMatches WHERE m.winner IS NOT NULL] AS completedMatches
      
      RETURN 
        // Player basic info
        p1.id AS player1Id,
        p1.name AS player1Name,
        p1.nationality AS player1Nationality,
        p2.id AS player2Id,
        p2.name AS player2Name,
        p2.nationality AS player2Nationality,
        
        // Head-to-head match statistics
        size(allMatches) AS totalMatches,
        size(completedMatches) AS completedMatches,
        size(p1MatchWins) AS player1MatchWins,
        size(p2MatchWins) AS player2MatchWins,
        
        // Frame statistics in head-to-head matches ONLY
        size(p1WonFrames) AS player1FrameWins,
        size(p2WonFrames) AS player2FrameWins,
        
        // Tournament wins (last 365 days)
        size([t IN p1Tournaments WHERE t IS NOT NULL]) AS player1TournamentWins,
        size([t IN p2Tournaments WHERE t IS NOT NULL]) AS player2TournamentWins
    `;

    const result = await session.run(query, { player1Id, player2Id });

    if (result.records.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          player1: { id: player1Id, name: player1Name },
          player2: { id: player2Id, name: player2Name },
          message: 'No head-to-head data found between these players'
        }
      });
    }

    const record = result.records[0];
    
    // Calculate win rates - safely convert Neo4j Integer objects to numbers
    const totalCompletedMatches = record.get('completedMatches')?.toNumber?.() ?? 0;
    const player1MatchWins = record.get('player1MatchWins')?.toNumber?.() ?? 0;
    const player2MatchWins = record.get('player2MatchWins')?.toNumber?.() ?? 0;
    const player1FrameWins = record.get('player1FrameWins')?.toNumber?.() ?? 0;
    const player2FrameWins = record.get('player2FrameWins')?.toNumber?.() ?? 0;
    
    const player1MatchWinRate = totalCompletedMatches > 0 ? (player1MatchWins / totalCompletedMatches * 100) : 0;
    const player2MatchWinRate = totalCompletedMatches > 0 ? (player2MatchWins / totalCompletedMatches * 100) : 0;
    
    const totalFrames = player1FrameWins + player2FrameWins;
    const player1FrameWinRate = totalFrames > 0 ? (player1FrameWins / totalFrames * 100) : 0;
    const player2FrameWinRate = totalFrames > 0 ? (player2FrameWins / totalFrames * 100) : 0;

    const headToHeadData = {
      players: {
        player1: {
          id: record.get('player1Id'),
          name: record.get('player1Name'),
          nationality: record.get('player1Nationality')
        },
        player2: {
          id: record.get('player2Id'),
          name: record.get('player2Name'),
          nationality: record.get('player2Nationality')
        }
      },
      headToHeadRecord: {
        totalMatches: record.get('totalMatches')?.toNumber?.() ?? 0,
        completedMatches: totalCompletedMatches,
        player1: {
          matchWins: player1MatchWins,
          matchWinRate: Math.round(player1MatchWinRate * 100) / 100,
          frameWins: player1FrameWins,
          frameWinRate: Math.round(player1FrameWinRate * 100) / 100,
          tournamentWins365: record.get('player1TournamentWins')?.toNumber?.() ?? 0
        },
        player2: {
          matchWins: player2MatchWins,
          matchWinRate: Math.round(player2MatchWinRate * 100) / 100,
          frameWins: player2FrameWins,
          frameWinRate: Math.round(player2FrameWinRate * 100) / 100,
          tournamentWins365: record.get('player2TournamentWins')?.toNumber?.() ?? 0
        }
      },
      summary: {
        matchesLeader: player1MatchWins > player2MatchWins ? record.get('player1Name') : 
                     player2MatchWins > player1MatchWins ? record.get('player2Name') : 'Tied',
        framesLeader: player1FrameWins > player2FrameWins ? record.get('player1Name') : 
                     player2FrameWins > player1FrameWins ? record.get('player2Name') : 'Tied',
        recentFormLeader: (record.get('player1TournamentWins')?.toNumber?.() ?? 0) > (record.get('player2TournamentWins')?.toNumber?.() ?? 0) ? 
                         record.get('player1Name') : 
                         (record.get('player2TournamentWins')?.toNumber?.() ?? 0) > (record.get('player1TournamentWins')?.toNumber?.() ?? 0) ? 
                         record.get('player2Name') : 'Tied'
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        recentFormPeriod: 'Last 365 days'
      }
    };

    return NextResponse.json({
      success: true,
      data: headToHeadData
    });

  } catch (error) {
    console.error('Error calculating head-to-head:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check your Neo4j connection and player IDs'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
