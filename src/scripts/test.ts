import 'dotenv/config';
import { redisClient } from '../lib/redis';
import { neo4jDriver } from '../lib/neo4j';

async function testConnections() {
  try {
    // Test Redis connection
    console.log('Testing Redis connection...');
    const ping = await redisClient.ping();
    console.log(`Redis connection successful: ${ping}`);

    // Test Neo4j connection
    console.log('Testing Neo4j connection...');
    const session = neo4jDriver.session();
    const result = await session.run('RETURN 1 AS result');
    console.log(`Neo4j connection successful: ${result.records[0].get('result')}`);
    await session.close();
  } catch (error) {
    console.error('Error testing connections:', error);
  } finally {
    // Close connections
    await redisClient.quit();
    await neo4jDriver.close();
  }
}

testConnections();