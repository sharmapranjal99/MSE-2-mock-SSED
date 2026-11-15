// Runs before the server starts: creates tables, seeds events, prepares the MinIO bucket.
import { pool, minio, BUCKET } from './clients.js';

await pool.query(`
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, venue TEXT,
    starts_at TIMESTAMPTZ, image_url TEXT
  );
  CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY, event_id INT REFERENCES events(id),
    name TEXT NOT NULL, email TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
  );
`);

const { rows } = await pool.query('SELECT count(*)::int AS n FROM events');
if (rows[0].n === 0) {
  await pool.query(`
    INSERT INTO events (title, venue, starts_at) VALUES
      ('Hack Night', 'Lab 3', now() + interval '7 days'),
      ('Career Fair', 'Main Hall', now() + interval '14 days'),
      ('Robotics Demo Day', 'Auditorium', now() + interval '21 days')
  `);
}

if (!(await minio.bucketExists(BUCKET))) await minio.makeBucket(BUCKET);
await minio.setBucketPolicy(BUCKET, JSON.stringify({
  Version: '2012-10-17',
  Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${BUCKET}/*`] }],
}));

await pool.end();
console.log('migration and seed complete');
