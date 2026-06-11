const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');

const PROFILE_FIELDS = ['name', 'age', 'about', 'role', 'organization'];

/**
 * Strip sensitive fields before sending a user to the client.
 */
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.__v;
  return obj;
};

/**
 * Register a new account. Requires a valid invite code.
 */
const registerUser = async ({
  name,
  email,
  password,
  inviteCode,
  age,
  about,
  role,
  organization,
}) => {
  const expectedCode = process.env.INVITE_CODE;
  if (!expectedCode) {
    throw new AppError('Registration is not configured. Contact the admin.', 503);
  }
  if (!inviteCode || inviteCode.trim() !== expectedCode) {
    throw new AppError('Invalid invite code.', 403);
  }

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required.', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    age: age ?? null,
    about: about ?? '',
    role: role ?? 'Student',
    organization: organization ?? '',
  });

  const token = signToken({ id: user._id });
  return { user: sanitizeUser(user), token };
};

/**
 * Authenticate by email + password.
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const match = await user.comparePassword(password);
  if (!match) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = signToken({ id: user._id });
  return { user: sanitizeUser(user), token };
};

/**
 * Get the current user's profile.
 */
const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return sanitizeUser(user);
};

/**
 * Update editable profile fields.
 */
const updateProfile = async (id, updates) => {
  const filtered = {};
  PROFILE_FIELDS.forEach((field) => {
    if (updates[field] !== undefined) {
      filtered[field] = updates[field];
    }
  });

  const user = await User.findByIdAndUpdate(id, filtered, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return sanitizeUser(user);
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
};
