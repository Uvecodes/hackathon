const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Security Middleware
// ============================================

// Helmet: disabled for now
// app.use(helmet({ ... }));

// CORS: Allow all origins (open for now — tighten before production hardening)
app.use(cors({
  origin: (_origin, cb) => cb(null, true),
  credentials: true,
}));

// Rate limiting: Prevent brute force attacks (skip /api/config - required for initial load)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.path === '/api/config',
});
app.use(limiter);

// ============================================
// Body Parsing Middleware
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================
// Request Logging Middleware
// ============================================

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Health Check
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// Firebase Client Config (values from .env)
// ============================================

app.get('/api/config', (req, res) => {
  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    },
  });
});

// ============================================
// API Routes
// ============================================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/wellness', require('./routes/wellness'));
app.use('/api/safety', require('./routes/safety'));
app.use('/api/cry-detection', require('./routes/cry-detection'));
app.use('/api/chatbot', require('./routes/chatbot'));

// ============================================
// Serve Frontend Static Files
// ============================================

app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================
// 404 Handler
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// ============================================
// Global Error Handler
// ============================================

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
  });
});

// ============================================
// Server Startup
// ============================================

// Only bind to a port when the file is run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Maternal Wellness Backend running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ CORS enabled for: all origins`);
  });
}

module.exports = app;
