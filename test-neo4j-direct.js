const neo4j = require('neo4j-driver');
require('dotenv').config({ path: '.env.local' });

async function testNeo4jConnection() {
  console.log('Testing Neo4j connection...');
  console.log('URI:', process.env.NEO4J_URI);
  console.log('Username:', process.env.NEO4J_USERNAME);
  console.log('Database:', process.env.NEO4J_DATABASE);
  
  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
    {
      maxConnectionLifetime: 30 * 60 * 1000,
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60 * 1000,
    }
  );

  try {
    console.log('\n1. Verifying connectivity...');
    await driver.verifyConnectivity();
    console.log('✅ Connection verified!');

    console.log('\n2. Testing database query...');
    const session = driver.session({ database: process.env.NEO4J_DATABASE });
    
    try {
      const result = await session.run('RETURN 1 as test');
      console.log('✅ Query successful!', result.records[0].get('test'));
      
      const playerResult = await session.run('MATCH (p:Player) RETURN count(p) as count');
      const playerCount = playerResult.records[0].get('count').toNumber();
      console.log(`✅ Found ${playerCount} players in database`);
      
    } finally {
      await session.close();
    }

    console.log('\n✅ All tests passed! Neo4j is working correctly.');
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Database is paused/stopped in Neo4j Aura');
    console.error('2. Wrong credentials');
    console.error('3. Network/firewall blocking connection');
    console.error('4. Database instance deleted');
  } finally {
    await driver.close();
  }
}

testNeo4jConnection();
