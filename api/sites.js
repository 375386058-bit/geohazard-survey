const { Pool } = require('@neondatabase/serverless');

const rawUrl = process.env.DATABASE_URL;

// Parse connection URL manually to bypass neon() URL format validation
function parseDbUrl(url) {
  if (!url) return null;
  // Strip channel_binding param if present
  let clean = url;
  if (clean.includes('channel_binding')) {
    const u = new URL(clean);
    u.searchParams.delete('channel_binding');
    clean = u.toString();
  }
  const u = new URL(clean);
  return {
    host: u.hostname,
    port: parseInt(u.port || '5432'),
    database: u.pathname.slice(1),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  };
}

const dbConfig = parseDbUrl(rawUrl);

let tableReady = false;

async function ensureTable(pool) {
  if (tableReady) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sites_updated_at ON sites (updated_at DESC)`);
    tableReady = true;
  } finally {
    client.release();
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!dbConfig) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  let pool;
  try {
    pool = new Pool(dbConfig);
    await ensureTable(pool);

    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM sites ORDER BY updated_at DESC');
      const sites = result.rows.map(r => ({
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
      await pool.query(
        `INSERT INTO sites (id, name, data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [id, name, JSON.stringify(data || {})]
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      await pool.query('DELETE FROM sites WHERE id = $1', [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (pool) {
      try { await pool.end(); } catch (_) {}
    }
  }
};
