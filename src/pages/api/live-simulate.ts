import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/lib/websocket';
import neo4j from 'neo4j-driver';
import { redis } from '@/lib/redis';
import { Server as SocketIOServer } from 'socket.io';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

// Store active simulations
const activeSimulations = new Map<string, NodeJS.Timeout>();

// Generate random score
const generatePointScore = () => Math.floor(Math.random() * 30) + 1;

// Simulate frame progression
async function simulateFrame(
  io: SocketIOServer,
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
    await redis.expire(frameKey, 3600);

    const minWinScore = 60;

    const scoreInterval = setInterval(async () => {
      const frameData = await redis.hGetAll(frameKey);
      if (!frameData || !frameData.player1Score) {
        clearInterval(scoreInterval);
        return;
      }

      let player1Score = parseInt(frameData.player1Score);
      let player2Score = parseInt(frameData.player2Score);

      const scoringPlayer = Math.random() > 0.5 ? 1 : 2;
      const points = generatePointScore();

      if (scoringPlayer === 1) {
        player1Score += points;
      } else {
        player2Score += points;
      }

      await redis.hSet(frameKey, {
        player1Score: player1Score.toString(),
        player2Score: player2Score.toString()
      });

      // Broadcast score update
      console.log(`📊 Broadcasting score update to room ${matchId}`);
      io.to(matchId).emit('score-update', {
        matchId,
        frameNumber,
        player1: { id: player1Id, name: player1Name, score: player1Score },
        player2: { id: player2Id, name: player2Name, score: player2Score },
        timestamp: new Date().toISOString()
      });

      const frameComplete =
        player1Score >= minWinScore && player1Score > player2Score + 20 ||
        player2Score >= minWinScore && player2Score > player1Score + 20 ||
        player1Score + player2Score >= 100;

      if (frameComplete) {
        clearInterval(scoreInterval);
        await redis.hSet(frameKey, { status: 'COMPLETED' });

        const winnerId = player1Score > player2Score ? player1Id : player2Id;
        const loserId = player1Score > player2Score ? player2Id : player1Id;
        const winnerScore = Math.max(player1Score, player2Score);
        const loserScore = Math.min(player1Score, player2Score);

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

        try {
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

          const matchKey = `live:match:${matchId}`;
          await redis.hSet(matchKey, {
            lastFrameNumber: frameNumber.toString(),
            winnerFrames: winnerFrames.toString(),
            loserFrames: loserFrames.toString(),
            status: matchWinner ? 'COMPLETED' : 'LIVE'
          });

          // Broadcast frame completion
          console.log(`🎯 Broadcasting frame completion to room ${matchId}`);
          io.to(matchId).emit('frame-update', {
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

          if (matchWinner) {
            await redis.hSet(matchKey, { status: 'COMPLETED', winner: matchWinner });
            await redis.expire(matchKey, 86400);

            console.log(`🏆 Broadcasting match completion to room ${matchId}`);
            io.to(matchId).emit('match-update', {
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

            const simId = activeSimulations.get(matchId);
            if (simId) {
              clearTimeout(simId);
              activeSimulations.delete(matchId);
            }

            await redis.sRem('live:matches:active', matchId);
            await session.close();
          } else {
            await session.close();
            setTimeout(() => {
              simulateFrame(io, matchId, player1Id, player2Id, player1Name, player2Name, frameNumber + 1, bestOf);
            }, 5000);
          }
        } catch (error) {
          console.error('Error saving frame to database:', error);
          await session.close();
        }
      }
    }, 3000);

  } catch (error) {
    console.error('Error simulating frame:', error);
    await redis.del(`live:match:${matchId}:frame:${frameNumber}`);
    await session.close();
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method === 'POST') {
    const session = driver.session({
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });

    try {
      const { player1Id, player2Id, tournamentId, bestOf } = req.body;

      if (!player1Id || !player2Id) {
        return res.status(400).json({
          error: 'Missing required fields: player1Id, player2Id'
        });
      }

      // Check if Socket.IO is initialized
      if (!res.socket.server.io) {
        console.error('❌ Socket.IO server not initialized!');
        return res.status(500).json({
          error: 'WebSocket server not initialized. Please refresh the page.'
        });
      }

      const io = res.socket.server.io;
      console.log('✅ Socket.IO server available for broadcasting');

      const playersCheck = await session.run(
        'MATCH (p1:Player {id: $player1Id}), (p2:Player {id: $player2Id}) RETURN p1.name as player1Name, p2.name as player2Name',
        { player1Id, player2Id }
      );

      if (playersCheck.records.length === 0) {
        return res.status(404).json({
          error: 'One or both players not found'
        });
      }

      const player1Name = playersCheck.records[0].get('player1Name');
      const player2Name = playersCheck.records[0].get('player2Name');

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
      await redis.expire(matchKey, 3600);

      await redis.sAdd('live:matches:active', matchId);

      // Broadcast match started
      console.log(`🎬 Broadcasting match start to room ${matchId}`);
      io.to(matchId).emit('match-update', {
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

      // Start simulation after 1 second
      const simulationTimeout = setTimeout(() => {
        console.log(`▶️ Starting frame simulation for match ${matchId}`);
        simulateFrame(io, matchId, player1Id, player2Id, player1Name, player2Name, 1, bestOf || 7);
      }, 1000);

      activeSimulations.set(matchId, simulationTimeout);

      return res.status(201).json({
        success: true,
        message: 'Live match simulation started',
        data: {
          matchId,
          player1: { id: player1Id, name: player1Name },
          player2: { id: player2Id, name: player2Name },
          bestOf: bestOf || 7,
          status: 'LIVE'
        }
      });

    } catch (error) {
      console.error('Error starting live match:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      await session.close();
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
