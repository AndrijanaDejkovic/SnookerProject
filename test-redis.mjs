// Test Redis connection
import { redis } from './src/lib/redis.js';

async function testRedis() {
  try {
    console.log('🧪 Testing Redis connection...');
    
    // Test set/get
    await redis.set('test:key', 'Hello Redis!');
    const result = await redis.get('test:key');
    
    console.log('✅ Redis test successful!');
    console.log('📝 Set: test:key = "Hello Redis!"');
    console.log('📖 Get: test:key =', result);
    
    // Clean up
    await redis.del('test:key');
    console.log('🧹 Cleaned up test key');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    
    // Check environment variables
    console.log('\n🔧 Environment check:');
    console.log('REDIS_HOST:', process.env.REDIS_HOST);
    console.log('REDIS_PORT:', process.env.REDIS_PORT);
    console.log('REDIS_USERNAME:', process.env.REDIS_USERNAME);
    console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '***hidden***' : 'NOT SET');
    console.log('REDIS_URL:', process.env.REDIS_URL ? '***hidden***' : 'NOT SET');
  }
}

testRedis();
