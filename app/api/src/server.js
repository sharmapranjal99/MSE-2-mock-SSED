import express from 'express';
import multer from 'multer';
import { pool, minio, BUCKET } from './clients.js';
import { connectCache, connectQueue, QUEUE } from './queue.js';

const redis = await connectCache();
const channel = await connectQueue();

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); await redis.ping(); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

app.get('/api/events', async (_req, res) => {
  const cached = await redis.get('events');
  if (cached) { res.set('X-Cache', 'HIT'); return res.type('json').send(cached); }
  const { rows } = await pool.query(`
    SELECT e.*, count(r.id)::int AS registrations
    FROM events e LEFT JOIN registrations r ON r.event_id = e.id
    GROUP BY e.id ORDER BY e.starts_at`);
  await redis.set('events', JSON.stringify(rows), { EX: 30 });
  res.set('X-Cache', 'MISS');
  res.json(rows);
});

app.post('/api/events/:id/register', async (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  const ev = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
  if (!ev.rows[0]) return res.status(404).json({ error: 'event not found' });
  await pool.query('INSERT INTO registrations (event_id, name, email) VALUES ($1, $2, $3)', [req.params.id, name, email]);
  await redis.del('events');
  // The confirmation email is sent by the worker, not by the API.
  channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify({
    name, email, title: ev.rows[0].title, venue: ev.rows[0].venue,
  })), { persistent: true });
  res.status(202).json({ ok: true });
});

app.post('/api/events/:id/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image file is required' });
  const safe = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `events/${req.params.id}-${Date.now()}-${safe}`;
  await minio.putObject(BUCKET, key, req.file.buffer, req.file.size, { 'Content-Type': req.file.mimetype });
  const url = `/storage/${key}`;
  await pool.query('UPDATE events SET image_url = $1 WHERE id = $2', [url, req.params.id]);
  await redis.del('events');
  res.status(201).json({ url });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`api listening on ${port}`));
