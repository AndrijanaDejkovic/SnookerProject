import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerAId = searchParams.get('playerAId');
  const playerBId = searchParams.get('playerBId');
  const playerCId = searchParams.get('playerCId');

  if (!playerAId || !playerBId || !playerCId) {
    return NextResponse.json(
      { 
        error: 'Missing required parameters: playerAId, playerBId, playerCId',
      },
      { status: 400 }
    );
  }

  if (playerAId === playerBId || playerAId === playerCId || playerBId === playerCId) {
    return NextResponse.json(
      { error: 'All three players must be different' },
      { status: 400 }
    );
  }

  const session = neo4jDriver.session({ database });

  try {
    // First verify all three players exist
    const playersCheck = await session.run(
      `MATCH (pa:Player {id: $playerAId}), (pb:Player {id: $playerBId}), (pc:Player {id: $playerCId})
       RETURN pa.name as playerAName, pb.name as playerBName, pc.name as playerCName`,
      { playerAId, playerBId, playerCId }
    );

    if (playersCheck.records.length === 0) {
      return NextResponse.json(
        { error: 'One or more players not found' },
        { status: 404 }
      );
    }

    const playerAName = playersCheck.records[0].get('playerAName');
    const playerBName = playersCheck.records[0].get('playerBName');
    const playerCName = playersCheck.records[0].get('playerCName');

    // Main triangular comparison query
    const query = `
      MATCH (pa:Player {id: $playerAId}), (pb:Player {id: $playerBId}), (pc:Player {id: $playerCId})
      
      // Find A vs C matches and frames
      OPTIONAL MATCH (pa)-[:COMPETED]->(matchAC:Match)<-[:COMPETED]-(pc)
      WHERE matchAC.winner IS NOT NULL
      
      OPTIONAL MATCH (matchAC)-[:CONTAINS_FRAME]->(frameAC:Frame)
      
      // Find B vs C matches and frames  
      OPTIONAL MATCH (pb)-[:COMPETED]->(matchBC:Match)<-[:COMPETED]-(pc)
      WHERE matchBC.winner IS NOT NULL
      
      OPTIONAL MATCH (matchBC)-[:CONTAINS_FRAME]->(frameBC:Frame)
      
      // Get tournament context
      OPTIONAL MATCH (pa)-[partA:PARTICIPATED_IN]->(tA:Tournament)
      WHERE partA.finalPosition = 1 AND tA.endDate >= date() - duration({days: 365})
      OPTIONAL MATCH (pb)-[partB:PARTICIPATED_IN]->(tB:Tournament)
      WHERE partB.finalPosition = 1 AND tB.endDate >= date() - duration({days: 365})
      OPTIONAL MATCH (pc)-[partC:PARTICIPATED_IN]->(tC:Tournament)
      WHERE partC.finalPosition = 1 AND tC.endDate >= date() - duration({days: 365})
      
      WITH pa, pb, pc,
           collect(DISTINCT matchAC) AS allMatchesAC,
           collect(DISTINCT matchBC) AS allMatchesBC,
           collect(DISTINCT frameAC) AS allFramesAC,
           collect(DISTINCT frameBC) AS allFramesBC,
           collect(DISTINCT tA) AS tournamentsA,
           collect(DISTINCT tB) AS tournamentsB,
           collect(DISTINCT tC) AS tournamentsC
      
      RETURN 
        // Player info
        pa.id AS playerAId, pa.name AS playerAName, pa.nationality AS playerANationality,
        pb.id AS playerBId, pb.name AS playerBName, pb.nationality AS playerBNationality,
        pc.id AS playerCId, pc.name AS playerCName, pc.nationality AS playerCNationality,
        
        // A vs C stats
        size([m IN allMatchesAC WHERE m IS NOT NULL]) AS completedMatchesAC,
        size([m IN allMatchesAC WHERE m.winner = pa.id]) AS aMatchWinsVsC,
        size([m IN allMatchesAC WHERE m.winner = pc.id]) AS cMatchWinsVsA,
        size([f IN allFramesAC WHERE f IS NOT NULL AND (pa)-[:WON_FRAME]->(f)]) AS aFrameWinsVsC,
        size([f IN allFramesAC WHERE f IS NOT NULL AND (pc)-[:WON_FRAME]->(f)]) AS cFrameWinsVsA,
        
        // B vs C stats
        size([m IN allMatchesBC WHERE m IS NOT NULL]) AS completedMatchesBC,
        size([m IN allMatchesBC WHERE m.winner = pb.id]) AS bMatchWinsVsC,
        size([m IN allMatchesBC WHERE m.winner = pc.id]) AS cMatchWinsVsB,
        size([f IN allFramesBC WHERE f IS NOT NULL AND (pb)-[:WON_FRAME]->(f)]) AS bFrameWinsVsC,
        size([f IN allFramesBC WHERE f IS NOT NULL AND (pc)-[:WON_FRAME]->(f)]) AS cFrameWinsVsB,
        
        // Tournament context
        size(tournamentsA) AS aTournamentWins365,
        size(tournamentsB) AS bTournamentWins365,
        size(tournamentsC) AS cTournamentWins365,
        
        // Debug
        [m IN allMatchesAC WHERE m IS NOT NULL | {id: m.id, winner: m.winner, bestOf: m.bestOf}][..2] AS debugMatchesAC,
        [m IN allMatchesBC WHERE m IS NOT NULL | {id: m.id, winner: m.winner, bestOf: m.bestOf}][..2] AS debugMatchesBC
    `;

    const result = await session.run(query, { playerAId, playerBId, playerCId });

    if (result.records.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          playerA: { id: playerAId, name: playerAName },
          playerB: { id: playerBId, name: playerBName },
          playerC: { id: playerCId, name: playerCName },
          message: 'No match data found for triangular comparison'
        }
      });
    }

    const record = result.records[0];
    
    // Safely extract data
    const completedMatchesAC = record.get('completedMatchesAC')?.toNumber?.() ?? 0;
    const aMatchWinsVsC = record.get('aMatchWinsVsC')?.toNumber?.() ?? 0;
    const cMatchWinsVsA = record.get('cMatchWinsVsA')?.toNumber?.() ?? 0;
    const aFrameWinsVsC = record.get('aFrameWinsVsC')?.toNumber?.() ?? 0;
    const cFrameWinsVsA = record.get('cFrameWinsVsA')?.toNumber?.() ?? 0;
    
    const completedMatchesBC = record.get('completedMatchesBC')?.toNumber?.() ?? 0;
    const bMatchWinsVsC = record.get('bMatchWinsVsC')?.toNumber?.() ?? 0;
    const cMatchWinsVsB = record.get('cMatchWinsVsB')?.toNumber?.() ?? 0;
    const bFrameWinsVsC = record.get('bFrameWinsVsC')?.toNumber?.() ?? 0;
    const cFrameWinsVsB = record.get('cFrameWinsVsB')?.toNumber?.() ?? 0;
    
    // Get debug information
    const sampleMatchesAC = record.get('debugMatchesAC') || [];
    const sampleMatchesBC = record.get('debugMatchesBC') || [];
    
    // Calculate win rates with proper validation
    const aMatchWinRateVsC = completedMatchesAC > 0 ? (aMatchWinsVsC / completedMatchesAC * 100) : 0;
    const bMatchWinRateVsC = completedMatchesBC > 0 ? (bMatchWinsVsC / completedMatchesBC * 100) : 0;
    
    const totalFramesAC = aFrameWinsVsC + cFrameWinsVsA;
    const totalFramesBC = bFrameWinsVsC + cFrameWinsVsB;
    const aFrameWinRateVsC = totalFramesAC > 0 ? (aFrameWinsVsC / totalFramesAC * 100) : 0;
    const bFrameWinRateVsC = totalFramesBC > 0 ? (bFrameWinsVsC / totalFramesBC * 100) : 0;

    // Determine who performs better against Player C
    let betterMatchRecord = 'No data';
    let betterFrameRecord = 'No data';
    let moreExperienceVsC = 'No data';
    
    if (completedMatchesAC > 0 || completedMatchesBC > 0) {
      if (completedMatchesAC === 0) {
        betterMatchRecord = record.get('playerBName');
      } else if (completedMatchesBC === 0) {
        betterMatchRecord = record.get('playerAName');
      } else {
        betterMatchRecord = aMatchWinRateVsC > bMatchWinRateVsC ? record.get('playerAName') :
                           bMatchWinRateVsC > aMatchWinRateVsC ? record.get('playerBName') : 'Tied';
      }
      
      moreExperienceVsC = completedMatchesAC > completedMatchesBC ? record.get('playerAName') :
                         completedMatchesBC > completedMatchesAC ? record.get('playerBName') : 'Tied';
    }
    
    if (totalFramesAC > 0 || totalFramesBC > 0) {
      if (totalFramesAC === 0) {
        betterFrameRecord = record.get('playerBName');
      } else if (totalFramesBC === 0) {
        betterFrameRecord = record.get('playerAName');
      } else {
        betterFrameRecord = aFrameWinRateVsC > bFrameWinRateVsC ? record.get('playerAName') :
                           bFrameWinRateVsC > aFrameWinRateVsC ? record.get('playerBName') : 'Tied';
      }
    }

    const triangularData = {
      players: {
        playerA: {
          id: record.get('playerAId'),
          name: record.get('playerAName'),
          nationality: record.get('playerANationality')
        },
        playerB: {
          id: record.get('playerBId'),
          name: record.get('playerBName'),
          nationality: record.get('playerBNationality')
        },
        playerC: {
          id: record.get('playerCId'),
          name: record.get('playerCName'),
          nationality: record.get('playerCNationality')
        }
      },
      headToHeadVsC: {
        playerAVsC: {
          completedMatches: completedMatchesAC,
          matchWins: aMatchWinsVsC,
          matchLosses: cMatchWinsVsA,
          matchWinRate: Math.round(aMatchWinRateVsC * 100) / 100,
          frameWins: aFrameWinsVsC,
          frameLosses: cFrameWinsVsA,
          totalFrames: totalFramesAC,
          frameWinRate: Math.round(aFrameWinRateVsC * 100) / 100,
          tournamentWins365: record.get('aTournamentWins365')?.toNumber?.() ?? 0
        },
        playerBVsC: {
          completedMatches: completedMatchesBC,
          matchWins: bMatchWinsVsC,
          matchLosses: cMatchWinsVsB,
          matchWinRate: Math.round(bMatchWinRateVsC * 100) / 100,
          frameWins: bFrameWinsVsC,
          frameLosses: cFrameWinsVsB,
          totalFrames: totalFramesBC,
          frameWinRate: Math.round(bFrameWinRateVsC * 100) / 100,
          tournamentWins365: record.get('bTournamentWins365')?.toNumber?.() ?? 0
        }
      },
      comparison: {
        betterMatchRecordVsC: betterMatchRecord,
        betterFrameRecordVsC: betterFrameRecord,
        moreExperienceVsC: moreExperienceVsC,
        matchWinRateDifference: Math.round((aMatchWinRateVsC - bMatchWinRateVsC) * 100) / 100,
        frameWinRateDifference: Math.round((aFrameWinRateVsC - bFrameWinRateVsC) * 100) / 100
      },
      debug: {
        sampleMatchesAC: sampleMatchesAC,
        sampleMatchesBC: sampleMatchesBC,
        rawCounts: {
          aMatchWinsVsC,
          cMatchWinsVsA,
          bMatchWinsVsC,
          cMatchWinsVsB,
          aFrameWinsVsC,
          cFrameWinsVsA,
          bFrameWinsVsC,
          cFrameWinsVsB
        }
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        comparisonType: 'triangular_head_to_head',
        description: `How ${record.get('playerAName')} and ${record.get('playerBName')} each perform against ${record.get('playerCName')}`
      }
    };

    return NextResponse.json({
      success: true,
      data: triangularData
    });

  } catch (error) {
    console.error('Error calculating triangular comparison:', error);
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
