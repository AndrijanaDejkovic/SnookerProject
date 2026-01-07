import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'iv8eDQB41WmDaBoDzEygkBxBXVIgnngs',
    socket: {
        host: 'redis-13906.c9.us-east-1-2.ec2.cloud.redislabs.com',
        port: 13906
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

await client.set('foo', 'bar');
const result = await client.get('foo');
console.log(result)  // >>> bar