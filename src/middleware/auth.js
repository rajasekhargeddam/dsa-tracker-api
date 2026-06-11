const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

/**
 * Require a valid Bearer token. Attaches the authenticated user's id to
 * req.userId for downstream scoping of all data access.
 */
const protect = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return next(new AppError('Not authenticated. Please log in.', 401));
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.id;
    return next();
  } catch {
    return next(new AppError('Session expired or invalid. Please log in again.', 401));
  }
};

module.exports = protect;
