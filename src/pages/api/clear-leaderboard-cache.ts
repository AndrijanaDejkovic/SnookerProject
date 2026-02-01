import { NextApiRequest, NextApiResponse } from 'next';
import { redis } from '@/lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Delete the leaderboard cache
    const result = await redis.del('leaderboard:global:all');
    
    if (result > 0) {
      console.log('✅ Leaderboard cache manually invalidated');
      return res.json({ 
        success: true, 
        message: 'Leaderboard cache cleared successfully',
        keysDeleted: result
      });
    } else {
      return res.json({ 
        success: true, 
        message: 'Leaderboard cache was already empty',
        keysDeleted: 0
      });
    }
  } catch (error) {
    console.error('❌ Failed to clear leaderboard cache:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
