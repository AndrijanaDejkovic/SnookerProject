import neo4j, { Driver } from 'neo4j-driver';

const globalForNeo4j = global as unknown as { neo4j: Driver };

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';
const database = process.env.NEO4J_DATABASE || 'neo4j';

console.log('🔌 Initializing Neo4j connection...');
console.log('URI:', uri);
console.log('Database:', database);

export const neo4jDriver =
  globalForNeo4j.neo4j || 
  neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
    connectionTimeout: 30 * 1000, // 30 seconds
  });

if (process.env.NODE_ENV !== 'production') globalForNeo4j.neo4j = neo4jDriver;

// Test connection on startup
neo4jDriver.verifyConnectivity()
  .then(() => console.log('✅ Neo4j connected successfully!'))
  .catch(err => console.error('❌ Neo4j connection failed:', err.message));

export { database };