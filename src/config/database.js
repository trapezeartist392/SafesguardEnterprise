const { Pool } = require('pg');
let pool;

const connectDB = async () => {
  pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'safeguardsiq_enterprise',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => console.error('PG pool error:', err));
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('✅ PostgreSQL connected (safeguardsiq_enterprise)');
  return pool;
};

const getDB = () => {
  if (!pool) throw new Error('Database not initialised — call connectDB() first');
  return pool;
};

const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { connectDB, getDB, withTransaction };
