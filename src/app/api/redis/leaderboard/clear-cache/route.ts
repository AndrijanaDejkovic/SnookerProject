import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

/**
 * POST /api/redis/leaderboard/clear-cache
 * Clears the global leaderboard cache
 * Used for testing or manual cache invalidation
 */
export async function POST(request: Request) {
  try {
    const globalCacheKey = 'leaderboard:global:all';
    const result = await redis.del(globalCacheKey);
    
    console.log(`✅ Leaderboard cache cleared (deleted ${result} key(s))`);
    
    return NextResponse.json({
      success: true,
      message: 'Leaderboard cache cleared successfully',
      deletedKeys: result,
      cacheKey: globalCacheKey
    });
  } catch (error) {
    console.error('Error clearing leaderboard cache:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check Redis connection'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/redis/leaderboard/clear-cache
 * Returns cache status information
 */
export async function GET(request: Request) {
  try {
    const globalCacheKey = 'leaderboard:global:all';
    const cachedData = await redis.get(globalCacheKey);
    const ttl = await redis.ttl(globalCacheKey);
    
    return NextResponse.json({
      success: true,
      cacheStatus: {
        cacheKey: globalCacheKey,
        exists: !!cachedData,
        ttl: ttl === -2 ? 'Key does not exist' : ttl === -1 ? 'No expiration' : `${ttl} seconds`,
        dataSize: cachedData ? JSON.parse(cachedData).length : 0
      },
      message: 'To clear cache, send POST request to this endpoint'
    });
  } catch (error) {
    console.error('Error checking leaderboard cache status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check Redis connection'
      },
      { status: 500 }
    );
  }
}
