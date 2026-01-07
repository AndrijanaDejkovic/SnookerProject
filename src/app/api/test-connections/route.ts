import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import neo4j from 'neo4j-driver';

export async function GET() {
  const results = {
    redis: { status: 'down', error: null as string | null },
    neo4j: { status: 'down', error: null as string | null },
  };

  // Test Redis connection
  try {
    console.log('Testing Redis connection...');
    console.log('Redis Host:', process.env.REDIS_HOST);
    console.log('Redis Port:', process.env.REDIS_PORT);
    console.log('Redis Username:', process.env.REDIS_USERNAME);
    
    const redisClient = createClient({
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      }
    });

    await redisClient.connect();
    const ping = await redisClient.ping();
    if (ping === 'PONG') {
      results.redis.status = 'up';
      console.log('Redis connection successful');
    }
    await redisClient.quit();
  } catch (error) {
    results.redis.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('Redis connection failed:', error);
  }

  // Test Neo4j connection
  try {
    console.log('Testing Neo4j connection...');
    console.log('Neo4j URI:', process.env.NEO4J_URI);
    console.log('Neo4j Username:', process.env.NEO4J_USERNAME);
    
    const driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
      // No additional config needed for neo4j+s:// URIs
    );
    
    const session = driver.session({
      database: process.env.NEO4J_DATABASE || 'neo4j'
    });
    const result = await session.run('RETURN 1 AS result');
    const value = result.records[0].get('result');
    if (value === 1) {
      results.neo4j.status = 'up';
      console.log('Neo4j connection successful');
    }
    await session.close();
    await driver.close();
  } catch (error) {
    results.neo4j.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('Neo4j connection failed:', error);
  }

  return NextResponse.json(results);
}
