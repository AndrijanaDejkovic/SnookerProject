import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// GET: Get live match data from Redis
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (!matchId) {
    return NextResponse.json(
      { error: 'Missing matchId parameter' },
      { status: 400 }
    );
  }

  try {
    // Get match data from Redis
    const matchKey = `live:match:${matchId}`;
    const matchData = await redis.hGetAll(matchKey);

    if (!matchData || Object.keys(matchData).length === 0) {
      return NextResponse.json(
        { error: 'Match not found or not live' },
        { status: 404 }
      );
    }

    // Get current frame data if exists
    const currentFrameNumber = matchData.lastFrameNumber || matchData.currentFrame || '1';
    const frameKey = `live:match:${matchId}:frame:${currentFrameNumber}`;
    const frameData = await redis.hGetAll(frameKey);

    return NextResponse.json({
      success: true,
      data: {
        match: {
          matchId: matchData.matchId,
          status: matchData.status,
          bestOf: parseInt(matchData.bestOf || '7'),
          startTime: matchData.startTime,
          player1: {
            id: matchData.player1Id,
            name: matchData.player1Name,
            framesWon: parseInt(matchData.winnerFrames || '0')
          },
          player2: {
            id: matchData.player2Id,
            name: matchData.player2Name,
            framesWon: parseInt(matchData.loserFrames || '0')
          }
        },
        currentFrame: frameData ? {
          frameNumber: parseInt(frameData.frameNumber || '0'),
          status: frameData.status,
          player1Score: parseInt(frameData.player1Score || '0'),
          player2Score: parseInt(frameData.player2Score || '0')
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching live match data:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check Redis connection'
      },
      { status: 500 }
    );
  }
}
