const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');
const commentRoutes = require('./routes/commentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize app
const app = express();

// Proxy configuration: Do not blindly trust all proxies.
// In dev: defaults to false (prevents IP spoofing).
// In production: explicitly configured via TRUST_PROXY (e.g. 1, 2, or CIDR).
const rawTrustProxy = process.env.TRUST_PROXY;
let trustProxySetting = false;
if (rawTrustProxy === 'true') trustProxySetting = true;
else if (rawTrustProxy === 'false') trustProxySetting = false;
else if (rawTrustProxy && !isNaN(rawTrustProxy)) trustProxySetting = parseInt(rawTrustProxy, 10);
else if (rawTrustProxy) trustProxySetting = rawTrustProxy;
else if (process.env.NODE_ENV === 'production') {
  console.warn('[Security Notice] TRUST_PROXY is not set in production. Defaulting to false (no proxy trusted). Set TRUST_PROXY=1 if running behind an edge proxy.');
}
app.set('trust proxy', trustProxySetting);

// Connect to MongoDB Database
connectDB();

// Fail safely in production if critical secrets are missing
const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.JWT_SECRET) {
  console.error('\n❌ FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production mode.');
  process.exit(1);
}

// CORS origin configuration
// In production: only explicitly configured frontend origins in CLIENT_URL (no localhost).
// In development: includes local development Vite servers.
const allowedOrigins = isProd
  ? (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim().replace(/\/+$/, '')) : [])
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', process.env.CLIENT_URL]
      .filter(Boolean)
      .map((s) => s.trim().replace(/\/+$/, ''));

if (isProd && allowedOrigins.length === 0) {
  console.warn('[Security Notice] CLIENT_URL is not set in production. Browser requests will be blocked by CORS.');
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  })
);

// Body and cookie parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Modern Defensive Security Headers & CSP (Report-Only by default)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  // HSTS: strictly in production when connection is HTTPS
  if (isProd && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy
  const apiConnectSources = ["'self'", 'https://res.cloudinary.com', 'https://accounts.google.com'];
  if (!isProd) {
    apiConnectSources.push('http://localhost:5000', 'http://localhost:5173', 'ws://localhost:5173');
  }

  const cspDirectives = [
    "default-src 'self'",
    isProd
      ? "script-src 'self' https://accounts.google.com"
      : "script-src 'self' 'unsafe-inline' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://lh3.googleusercontent.com",
    "media-src 'self' blob: data: https://commondatastorage.googleapis.com https://res.cloudinary.com",
    `connect-src ${apiConnectSources.join(' ')}`,
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');

  const cspHeaderName = process.env.CSP_ENFORCE === 'true'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';

  res.setHeader(cspHeaderName, cspDirectives);
  next();
});

// State-Changing CSRF Origin Verification for Cookie-Authenticated Requests
app.use((req, res, next) => {
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const hasCookieAuth = Boolean(req.cookies && req.cookies.token);

  if (isStateChanging && hasCookieAuth) {
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
      try {
        const originHost = new URL(origin).origin;
        if (!allowedOrigins.includes(originHost)) {
          return res.status(403).json({
            success: false,
            message: 'Cross-Site Request Forgery validation failed: Unauthorized origin.',
          });
        }
      } catch (e) {
        return res.status(403).json({
          success: false,
          message: 'Malformed request origin header.',
        });
      }
    }
  }
  next();
});

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve static uploaded media files with byte-range streaming support and nosniff protection
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Communication Practice Platform API is running smoothly.',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', adminRoutes);

// In Production: Serve compiled client build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    // If request is targeted at /api, let error handlers catch it
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

// Configure extended timeouts for large video uploads (up to 30 minutes for multi-gigabyte files)
server.timeout = 30 * 60 * 1000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
if (typeof server.requestTimeout !== 'undefined') {
  server.requestTimeout = 30 * 60 * 1000;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.message);
  // Keep server alive in dev
});

// Graceful shutdown handling for containerized / cloud environments (Render, Docker, Kubernetes)
if (process.env.NODE_ENV !== 'test') {
  const gracefulShutdown = (signal) => {
    console.log(`\n[Server] Received ${signal}. Gracefully terminating server...`);
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      const mongoose = require('mongoose');
      mongoose.connection.close(false).then(() => {
        console.log('[Database] MongoDB connection closed.');
        process.exit(0);
      }).catch(() => process.exit(0));
    });

    setTimeout(() => {
      console.error('[Server] Forced exit after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

app.server = server;
module.exports = app;
