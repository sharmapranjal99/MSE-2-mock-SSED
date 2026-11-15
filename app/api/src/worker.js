// Same codebase and image as the API, different entrypoint: node src/worker.js
import nodemailer from 'nodemailer';
import { connectQueue, QUEUE } from './queue.js';

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 1025, secure: false,
});

const channel = await connectQueue();
channel.prefetch(1);
console.log('worker waiting for jobs');

channel.consume(QUEUE, async (msg) => {
  if (!msg) return;
  const job = JSON.parse(msg.content.toString());
  try {
    await mailer.sendMail({
      from: 'tickets@campushub.local', to: job.email,
      subject: `You are registered: ${job.title}`,
      text: `Hi ${job.name}, your spot at ${job.title} (${job.venue}) is confirmed.`,
    });
    channel.ack(msg);
    console.log('email sent to', job.email);
  } catch (err) {
    console.error('email failed:', err.message);
    setTimeout(() => channel.nack(msg, false, true), 3000);
  }
});
