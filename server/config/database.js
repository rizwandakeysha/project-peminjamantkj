const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');
const tls = require('tls');
require('dotenv').config();

// Configuration for Supabase with IP-based connection and proper SSL handling
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false, // Required for IP-based connections with SNI
    // Add SNI (Server Name Indication) for SSL/TLS
    servername: 'aws-1-ap-southeast-2.pooler.supabase.com',
  },
  // Pool settings - keeping connections alive
  max: 5,
  min: 1,
  idleTimeoutMillis: 25000,
  connectionTimeoutMillis: 30000,
  statement_timeout: 30000,
  application_name: 'tkj_peminjaman',
};

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
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Troubleshooting: Check DATABASE_URL and network connectivity');
  } else {
    console.log('✅ PostgreSQL database connected successfully');
  }
});

module.exports = pool;
