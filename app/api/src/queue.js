import { createClient } from 'redis';
import amqp from 'amqplib';

export const QUEUE = 'registration_emails';

async function retry(fn, label, tries = 15) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (err) {
      if (i >= tries) throw err;
      console.log(`${label} not ready (${i}/${tries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

export async function connectCache() {
  const client = createClient({
    url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
  });
  client.on('error', (e) => console.error('redis error:', e.message));
  await retry(() => client.connect(), 'redis');
  return client;
}

export async function connectQueue() {
  const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}:5672`;
  const channel = await retry(async () => (await amqp.connect(url)).createChannel(), 'rabbitmq');
  await channel.assertQueue(QUEUE, { durable: true });
  return channel;
}
