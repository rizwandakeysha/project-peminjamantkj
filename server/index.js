const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const barangRoutes = require('./routes/barangRoutes');
const peminjamanRoutes = require('./routes/peminjamanRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ========== ULTRA PERMISSIVE CORS (UNTUK TESTING) ==========
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Tambahan CORS middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (untuk foto yang diupload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'TKJ Peminjaman API Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Test endpoint untuk cek CORS
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    headers: req.headers
  });
});

// API Routes
app.use('/api/barang', barangRoutes);
app.use('/api/peminjaman', peminjamanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: ULTRA PERMISSIVE MODE (for testing)`);
  
  const dbInfo = process.env.DATABASE_URL 
    ? `postgres://${process.env.DATABASE_URL.split('@')[1]}` 
    : `${process.env.DB_NAME}@${process.env.DB_HOST}`;
  console.log(`🗄️  Database: ${dbInfo}`);
});

module.exports = app;