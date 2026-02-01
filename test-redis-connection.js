const { createClient } = require('redis');
require('dotenv').config();

async function testRedisConnection() {
  console.log('🧪 Testing Redis Cloud connection...');
  
  const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT)
    }
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err.message);
  });

  try {
    await client.connect();
    console.log('✅ Connected to Redis Cloud!');
    console.log('🌐 Host:', process.env.REDIS_HOST);
    console.log('🔌 Port:', process.env.REDIS_PORT);
    
    // Test basic operations
    await client.set('test:connection', 'success');
    const result = await client.get('test:connection');
    console.log('📝 Test write/read:', result);
    
    await client.del('test:connection');
    console.log('🧹 Cleanup complete');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔧 Debug info:');
    console.log('Username:', process.env.REDIS_USERNAME);
    console.log('Password set:', process.env.REDIS_PASSWORD ? 'YES' : 'NO');
    console.log('Host:', process.env.REDIS_HOST);
    console.log('Port:', process.env.REDIS_PORT);
  } finally {
    if (client.isOpen) {
      await client.disconnect();
    }
  }
}

testRedisConnection();
