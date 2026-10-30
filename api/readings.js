import { put, list } from '@vercel/blob';

// Newest-first ordering trick: blob listings come back alphabetically,
// so we name files with (BIG_NUMBER - timestamp). Newest sorts first.
const BIG = 9999999999999;
const keyFor = (ts) => String(BIG - ts).padStart(13, '0');

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') return await handlePost(req, res);
    if (req.method === 'GET') return await handleGet(req, res);
    return res.status(405).json({ error: 'Use GET or POST' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

async function handlePost(req, res) {
  // Endpoint is open by default. Set PLANT_API_KEY in Vercel to lock it down.
  const required = process.env.PLANT_API_KEY;
  if (required && req.headers['x-api-key'] !== required) {
    return res.status(401).json({ error: 'Bad or missing x-api-key' });
  }

  let fields = {};
  let image = null;

  if (Buffer.isBuffer(req.body)) {
    // Raw JPEG body (Content-Type: application/octet-stream), values in query string
    fields = req.query;
    image = req.body.length ? req.body : null;
  } else if (req.body && typeof req.body === 'object') {
    // JSON body, optional base64 "image" field
    fields = req.body;
    if (fields.image) image = Buffer.from(fields.image, 'base64');
  } else {
    fields = req.query;
  }

  const ts = Date.now();
  let imageUrl = null;

  if (image && image.length > 0) {
    const blob = await put(`images/${ts}.jpg`, image, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
    });
    imageUrl = blob.url;
  }

  const reading = {
    ts,
    temperature: num(fields.temperature ?? fields.temp),
    humidity: num(fields.humidity),
    soil_moisture: num(fields.soil_moisture ?? fields.soil),
    light: num(fields.light),
    image: imageUrl,
  };

  await put(`readings/${keyFor(ts)}.json`, JSON.stringify(reading), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return res.status(201).json({ ok: true, reading });
}

async function handleGet(req, res) {
  const limit = Math.min(Number(req.query.limit) || 48, 200);
  const { blobs } = await list({ prefix: 'readings/', limit });

  const readings = (
    await Promise.all(
      blobs.map((b) =>
        fetch(b.url, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => null)
      )
    )
  ).filter(Boolean);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(readings); // newest first
}
