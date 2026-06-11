const authService = require('../services/authService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.registerUser(req.body);

  res.status(201).json({
    success: true,
    data: { user, token },
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);

  res.status(200).json({
    success: true,
    data: { user, token },
  });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.userId);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * PATCH /api/auth/me
 */
const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.userId, req.body);

  res.status(200).json({
    success: true,
    data: user,
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
};
