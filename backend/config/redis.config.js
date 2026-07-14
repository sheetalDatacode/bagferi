import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === 'production';

let client;
let connectRedis = async () => {};

if (redisUrl) {
  client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis reconnect failed after 10 attempts');
          return new Error('Redis reconnection failed');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });
  client.on('error', (err) => console.error('Redis Client Error:', err));
  client.on('reconnecting', () => console.log('Redis Client Reconnecting...'));
  connectRedis = async () => {
    try {
      if (!client.isOpen) {
        await client.connect();
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      if (isProduction) {
      }
    }
  };
} else {
  client = {
    isReady: false,
    isOpen: false,
    connect: async () => {},
    on: () => {},
  };
}

export { connectRedis };
export default client;
