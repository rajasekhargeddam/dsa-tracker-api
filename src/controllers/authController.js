const authService = require("../services/authService");
const asyncHandler = require("../middleware/asyncHandler");

/**
 * POST /api/auth/register
 */

const sendTokenResponse = (res, user, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    success: true,
    data: { user },
  });
};

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.registerUser(req.body);

  sendTokenResponse(res, user, token);
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);

  sendTokenResponse(res, user, token);
});

/*
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires: new Date(0), // Set the cookie to expire immediately
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
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
  logout,
  getMe,
  updateMe,
};
