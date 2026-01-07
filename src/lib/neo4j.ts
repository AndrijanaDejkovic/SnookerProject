import neo4j, { Driver } from 'neo4j-driver';

const globalForNeo4j = global as unknown as { neo4j: Driver };

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

export const neo4jDriver =
  globalForNeo4j.neo4j || neo4j.driver(uri, neo4j.auth.basic(user, password));

if (process.env.NODE_ENV !== 'production') globalForNeo4j.neo4j = neo4jDriver;