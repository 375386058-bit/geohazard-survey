const { neon } = require('@neondatabase/serverless');

let rawUrl = process.env.DATABASE_URL;

// Sanitize: strip channel_binding param which the driver doesn't understand
if (rawUrl) {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete('channel_binding');
    rawUrl = u.toString();
  } catch (_) {
    // If URL parsing fails, keep rawUrl as-is
  }
}

const DATABASE_URL = rawUrl;

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  if (!DATABASE_URL) throw new Error('DATABASE_URL not configured');
  const sql = neon(DATABASE_URL);
  await sql(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sql(`CREATE INDEX IF NOT EXISTS idx_sites_updated_at ON sites (updated_at DESC)`);
  tableReady = true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  try {
    await ensureTable();
    const sql = neon(DATABASE_URL);

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM sites ORDER BY updated_at DESC`;
      const sites = rows.map(r => ({
        id: r.id,
        name: r.name,
        data: r.data,
        createdAt: new Date(r.created_at).getTime(),
        updatedAt: new Date(r.updated_at).getTime()
      }));
      return res.status(200).json(sites);
    }

    if (req.method === 'POST') {
      const { id, name, data } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: 'id and name are required' });
      }
      await sql`
        INSERT INTO sites (id, name, data, updated_at)
        VALUES (${id}, ${name}, ${JSON.stringify(data || {})}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          data = EXCLUDED.data,
          updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      await sql`DELETE FROM sites WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
