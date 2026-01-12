import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { broadcastMatchUpdate, broadcastFrameUpdate, broadcastScoreUpdate } from '@/lib/websocket';
import { redis } from '@/lib/redis';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

// Store active simulations (interval IDs only, state in Redis)
const activeSimulations = new Map<string, NodeJS.Timeout>();

// Simulate a point scored in snooker (0-147)
const generatePointScore = () => Math.floor(Math.random() * 30) + 1;

// Simulate frame progression
async function simulateFrame(
  matchId: string, 
  player1Id: string, 
  player2Id: string,
  player1Name: string,
  player2Name: string,
  frameNumber: number,
  bestOf: number
) {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    // Initialize frame state in Redis
    const frameKey = `live:match:${matchId}:frame:${frameNumber}`;
    await redis.hSet(frameKey, {
      matchId,
      frameNumber: frameNumber.toString(),
      player1Id,
      player2Id,
      player1Name,
      player2Name,
      player1Score: '0',
      player2Score: '0',
      status: 'LIVE'
    });
    await redis.expire(frameKey, 3600); // 1 hour TTL

    const minWinScore = 60; // Minimum to potentially win

    // Simulate scoring every 3 seconds
    const scoreInterval = setInterval(async () => {
      // Get current scores from Redis
      const frameData = await redis.hGetAll(frameKey);
      if (!frameData || !frameData.player1Score) {
        clearInterval(scoreInterval);
        return;
      }

      let player1Score = parseInt(frameData.player1Score);
      let player2Score = parseInt(frameData.player2Score);

      // Random player scores
      const scoringPlayer = Math.random() > 0.5 ? 1 : 2;
      const points = generatePointScore();

      if (scoringPlayer === 1) {
        player1Score += points;
      } else {
        player2Score += points;
      }

      // Update scores in Redis
      await redis.hSet(frameKey, {
        player1Score: player1Score.toString(),
        player2Score: player2Score.toString()
      });

      // Broadcast score update
      broadcastScoreUpdate(matchId, {
        matchId,
        frameNumber,
        player1: { id: player1Id, name: player1Name, score: player1Score },
        player2: { id: player2Id, name: player2Name, score: player2Score },
        timestamp: new Date().toISOString()
      });

      // Check if frame is complete (one player reaches winning score OR both exceed minimum)
      const frameComplete = 
        player1Score >= minWinScore && player1Score > player2Score + 20 ||
        player2Score >= minWinScore && player2Score > player1Score + 20 ||
        player1Score + player2Score >= 100;

      if (frameComplete) {
        clearInterval(scoreInterval);

        // Mark frame as completed in Redis
        await redis.hSet(frameKey, { status: 'COMPLETED' });

        // Determine winner
        const winnerId = player1Score > player2Score ? player1Id : player2Id;
        const loserId = player1Score > player2Score ? player2Id : player1Id;
        const winnerScore = Math.max(player1Score, player2Score);
        const loserScore = Math.min(player1Score, player2Score);

        // Save frame to database
        const frameQuery = `
          MATCH (m:Match {id: $matchId})
          MATCH (winner:Player {id: $winnerId})
          MATCH (loser:Player {id: $loserId})
          CREATE (f:Frame {
            id: randomUUID(),
            frameNumber: $frameNumber,
            winnerScore: $winnerScore,
            loserScore: $loserScore,
            duration: duration('PT5M00S'),
            highestBreak: $highestBreak,
            status: 'COMPLETED'
          })
          CREATE (m)-[:CONTAINS_FRAME]->(f)
          CREATE (winner)-[:WON_FRAME {
            score: $winnerScore,
            highestBreak: $highestBreak,
            duration: duration('PT5M00S')
          }]->(f)
          CREATE (loser)-[:LOST_FRAME {
            score: $loserScore,
            duration: duration('PT5M00S')
          }]->(f)
          MERGE (winner)-[cw:COMPETED]->(m)
            ON CREATE SET cw.framesWon = 0, cw.framesLost = 0
          MERGE (loser)-[cl:COMPETED]->(m)
            ON CREATE SET cl.framesWon = 0, cl.framesLost = 0
          SET cw.framesWon = coalesce(cw.framesWon,0) + 1,
              cl.framesLost = coalesce(cl.framesLost,0) + 1
          WITH m, f, winner, loser, cw, cl, ceil(m.bestOf/2.0) AS framesToWin
          FOREACH ( _ IN CASE WHEN cw.framesWon >= framesToWin THEN [1] ELSE [] END |
            SET m.winner = winner.id, m.winnerName = winner.name, m.status = 'COMPLETED'
            MERGE (m)-[:WON_BY]->(winner)
            SET cw.won = true, cl.won = false
          )
          RETURN f, cw.framesWon AS winnerFrames, cl.framesWon AS loserFrames, m.winner AS matchWinner, m.status AS matchStatus
        `;

        const result = await session.run(frameQuery, {
          matchId,
          winnerId,
          loserId,
          frameNumber,
          winnerScore,
          loserScore,
          highestBreak: Math.max(player1Score, player2Score)
        });

        const record = result.records[0];
        const winnerFrames = record.get('winnerFrames')?.toNumber?.() ?? 0;
        const loserFrames = record.get('loserFrames')?.toNumber?.() ?? 0;
        const matchWinner = record.get('matchWinner');

        // Update match state in Redis
        const matchKey = `live:match:${matchId}`;
        await redis.hSet(matchKey, {
          lastFrameNumber: frameNumber.toString(),
          winnerFrames: winnerFrames.toString(),
          loserFrames: loserFrames.toString(),
          status: matchWinner ? 'COMPLETED' : 'LIVE'
        });

        // Broadcast frame completion
        broadcastFrameUpdate(matchId, {
          matchId,
          frameNumber,
          status: 'COMPLETED',
          winner: {
            id: winnerId,
            name: winnerId === player1Id ? player1Name : player2Name,
            score: winnerScore,
            framesWon: winnerFrames
          },
          loser: {
            id: loserId,
            name: loserId === player1Id ? player1Name : player2Name,
            score: loserScore,
            framesWon: loserFrames
          },
          timestamp: new Date().toISOString()
        });

        // Check if match is complete
        if (matchWinner) {
          // Mark match as completed in Redis
          await redis.hSet(matchKey, { status: 'COMPLETED', winner: matchWinner });
          await redis.expire(matchKey, 86400); // Keep completed matches for 24 hours

          broadcastMatchUpdate(matchId, {
            matchId,
            status: 'COMPLETED',
            winner: {
              id: matchWinner,
              name: matchWinner === player1Id ? player1Name : player2Name,
              framesWon: winnerFrames
            },
            message: `Match completed! ${matchWinner === player1Id ? player1Name : player2Name} wins ${winnerFrames}-${loserFrames}`,
            timestamp: new Date().toISOString()
          });

          // Stop simulation and clean up
          const simId = activeSimulations.get(matchId);
          if (simId) {
            clearTimeout(simId);
            activeSimulations.delete(matchId);
          }

          // Remove match from active list in Redis
          await redis.sRem('live:matches:active', matchId);
        } else {
          // Start next frame after 5 seconds
          setTimeout(() => {
            simulateFrame(matchId, player1Id, player2Id, player1Name, player2Name, frameNumber + 1, bestOf);
          }, 5000);
        }
      }
    }, 3000); // Score update every 3 seconds

  } catch (error) {
    console.error('Error simulating frame:', error);
    
    // Clean up on error
    await redis.del(`live:match:${matchId}:frame:${frameNumber}`);
  } finally {
    await session.close();
  }
}

// POST: Start live match simulation
export async function POST(request: Request) {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    const body = await request.json();
    const { player1Id, player2Id, tournamentId, bestOf } = body;

    if (!player1Id || !player2Id) {
      return NextResponse.json(
        { error: 'Missing required fields: player1Id, player2Id' },
        { status: 400 }
      );
    }

    // Verify players exist
    const playersCheck = await session.run(
      'MATCH (p1:Player {id: $player1Id}), (p2:Player {id: $player2Id}) RETURN p1.name as player1Name, p2.name as player2Name',
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

    // Create match
    const matchQuery = `
      MATCH (p1:Player {id: $player1Id})
      MATCH (p2:Player {id: $player2Id})
      ${tournamentId ? 'MATCH (t:Tournament {id: $tournamentId})' : ''}
      CREATE (m:Match {
        id: randomUUID(),
        date: datetime(),
        bestOf: $bestOf,
        status: 'LIVE',
        round: 'Live Match'
      })
      CREATE (p1)-[:COMPETED {framesWon: 0, framesLost: 0}]->(m)
      CREATE (p2)-[:COMPETED {framesWon: 0, framesLost: 0}]->(m)
      ${tournamentId ? 'CREATE (m)-[:PART_OF]->(t)' : ''}
      RETURN m.id as matchId
    `;

    const result = await session.run(matchQuery, {
      player1Id,
      player2Id,
      tournamentId,
      bestOf: bestOf || 7
    });

    const matchId = result.records[0].get('matchId');

    // Store match state in Redis
    const matchKey = `live:match:${matchId}`;
    await redis.hSet(matchKey, {
      matchId,
      player1Id,
      player2Id,
      player1Name,
      player2Name,
      bestOf: (bestOf || 7).toString(),
      status: 'LIVE',
      currentFrame: '0',
      startTime: new Date().toISOString()
    });
    await redis.expire(matchKey, 3600); // 1 hour TTL

    // Add to active matches set
    await redis.sAdd('live:matches:active', matchId);

    // Broadcast match started
    broadcastMatchUpdate(matchId, {
      matchId,
      status: 'LIVE',
      players: {
        player1: { id: player1Id, name: player1Name, framesWon: 0 },
        player2: { id: player2Id, name: player2Name, framesWon: 0 }
      },
      bestOf: bestOf || 7,
      message: `Live match started: ${player1Name} vs ${player2Name}`,
      timestamp: new Date().toISOString()
    });

    // Start simulation after 3 seconds
    const simulationTimeout = setTimeout(() => {
      simulateFrame(matchId, player1Id, player2Id, player1Name, player2Name, 1, bestOf || 7);
    }, 3000);

    activeSimulations.set(matchId, simulationTimeout);

    return NextResponse.json({
      success: true,
      message: 'Live match simulation started',
      data: {
        matchId,
        player1: { id: player1Id, name: player1Name },
        player2: { id: player2Id, name: player2Name },
        bestOf: bestOf || 7,
        status: 'LIVE'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error starting live match:', error);
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

// GET: Get active simulations
export async function GET() {
  try {
    // Get all active match IDs from Redis
    const activeMatchIds = await redis.sMembers('live:matches:active');
    
    // Get details for each active match
    const matchDetails = await Promise.all(
      activeMatchIds.map(async (matchId) => {
        const matchData = await redis.hGetAll(`live:match:${matchId}`);
        return matchData ? { matchId, ...matchData } : null;
      })
    );

    return NextResponse.json({
      success: true,
      activeMatches: matchDetails.filter(m => m !== null),
      count: activeMatchIds.length
    });
  } catch (error) {
    console.error('Error fetching active simulations:', error);
    return NextResponse.json({
      success: true,
      activeSimulations: Array.from(activeSimulations.keys()),
      count: activeSimulations.size
    });
  }
}

// DELETE: Stop simulation
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (!matchId) {
    return NextResponse.json(
      { error: 'Missing matchId parameter' },
      { status: 400 }
    );
  }

  const simId = activeSimulations.get(matchId);
  if (simId) {
    clearTimeout(simId);
    activeSimulations.delete(matchId);

    // Update Redis state
    await redis.hSet(`live:match:${matchId}`, { status: 'STOPPED' });
    await redis.sRem('live:matches:active', matchId);

    broadcastMatchUpdate(matchId, {
      matchId,
      status: 'STOPPED',
      message: 'Match simulation stopped',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Simulation stopped for match ${matchId}`
    });
  }

  return NextResponse.json(
    { error: 'No active simulation found for this match' },
    { status: 404 }
  );
}
