const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');
require('dotenv').config();
const net = require('net');

function safeParseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    return new URL(databaseUrl);
  } catch {
    return null;
  }
}

function isSupabasePoolerHost(hostname) {
  return typeof hostname === 'string' && hostname.endsWith('.pooler.supabase.com');
}

function buildPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  const url = safeParseDatabaseUrl(databaseUrl);
  const hostname = url?.hostname;
  const urlPort = url?.port ? Number(url.port) : undefined;

  const forcedPort = process.env.SUPABASE_POOLER_PORT
    ? Number(process.env.SUPABASE_POOLER_PORT)
    : undefined;

  // Supabase pooler commonly uses 6543 (transaction mode).
  // If pooler host is used with 5432, fix it.
  const derivedPort = isSupabasePoolerHost(hostname)
    ? (forcedPort ?? (urlPort === 5432 || !urlPort ? 6543 : urlPort))
    : urlPort;

  const sslDisabled = (process.env.PGSSLMODE || '').toLowerCase() === 'disable';
  const isIpHost = net.isIP(hostname || '') !== 0;
  const ssl = sslDisabled
    ? false
    : {
        rejectUnauthorized: false,
        ...(hostname && !isIpHost ? { servername: hostname } : {}),
      };

  return {
    connectionString: databaseUrl,
    ...(derivedPort ? { port: derivedPort } : {}),
    ssl,
    keepAlive: true,
    max: Number(process.env.PGPOOL_MAX || 5),
    min: Number(process.env.PGPOOL_MIN || 1),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 25000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 15000),
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 30000),
    application_name: process.env.PGAPPNAME || 'tkj_peminjaman',
  };
}

const poolConfig = buildPoolConfig();

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors without crashing
pool.on('error', (err, client) => {
  console.error('⚠️  Pool error:', err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('✅ Pool closed');
  process.exit(0);
});

// Test connection on startup
console.log('🔗 Attempting database connection...');
if (process.env.DATABASE_URL) {
  const url = safeParseDatabaseUrl(process.env.DATABASE_URL);
  const host = url?.hostname;
  const port = poolConfig.port || url?.port || '(default)';
  if (isSupabasePoolerHost(host) && Number(url?.port) === 5432 && !process.env.SUPABASE_POOLER_PORT) {
    console.warn('⚠️  Detected Supabase pooler host with port 5432; forcing 6543 (transaction mode).');
    console.warn('   Set SUPABASE_POOLER_PORT to override if needed.');
  }
  console.log(`🧩 DB Host: ${host || '(unknown)'}:${port}`);
  console.log(`🔐 SSL: ${poolConfig.ssl ? 'enabled' : 'disabled'}`);
}
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Troubleshooting: Check DATABASE_URL and network connectivity');
  } else {
    console.log('✅ PostgreSQL database connected successfully');
  }
});

module.exports = pool;
