const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const userProblemRoutes = require('./routes/userProblemRoutes');
const revisionRoutes = require('./routes/revisionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const protect = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// Secure HTTP headers.
app.use(helmet());

// Restrict CORS to the configured frontend origin(s) when provided; otherwise
// allow all (useful for local development). Set CORS_ORIGIN in production.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';
app.use(cors({ origin: corsOrigin }));

// Cap request body size to avoid large-payload abuse.
app.use(express.json({ limit: '1mb' }));

// Throttle auth attempts to slow down brute-force / credential-stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please wait a few minutes and try again.',
  },
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DSA Tracker API is running',
  });
});

app.use('/api/auth', authLimiter, authRoutes);

// Everything below requires a valid token and is scoped to the user.
app.use('/api/catalog', protect, catalogRoutes);
app.use('/api/my-problems', protect, userProblemRoutes);
app.use('/api/revisions', protect, revisionRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

app.use(errorHandler);

module.exports = app;
