const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const validator = require('validator');

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

  // 1) General presence checks
  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required.', 400);
  }

  // 2) validator validation
  const cleanEmail = email.trim();
  if (!validator.isEmail(cleanEmail)) {
    throw new AppError('Please provide a valid email.', 400);
  }

  if (!validator.isLength(password, { min: 6 })) {
    throw new AppError('Password must be at least 6 characters.', 400);
  }

  const cleanName = name.trim();
  if (cleanName.length === 0 || !validator.isLength(cleanName, { max: 60 })) {
    throw new AppError('Name must be under 60 characters and cannot be empty.', 400);
  }

  if (age !== undefined && age !== null && age !== '') {
    if (!validator.isInt(String(age), { min: 10, max: 120 })) {
      throw new AppError('Age must be an integer between 10 and 120.', 400);
    }
  }

  const allowedRoles = ['Student', 'Working Professional', 'Other'];
  if (role && !allowedRoles.includes(role)) {
    throw new AppError('Invalid role.', 400);
  }

  if (organization && !validator.isLength(organization, { max: 100 })) {
    throw new AppError('Organization must be under 100 characters.', 400);
  }

  if (about && !validator.isLength(about, { max: 500 })) {
    throw new AppError('About section must be under 500 characters.', 400);
  }

  const existing = await User.findOne({ email: cleanEmail.toLowerCase() });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password,
    age: age !== undefined && age !== null && age !== '' ? Number(age) : null,
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

  const cleanEmail = email.trim();
  if (!validator.isEmail(cleanEmail)) {
    throw new AppError('Please provide a valid email.', 400);
  }

  const user = await User.findOne({ email: cleanEmail.toLowerCase() }).select(
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
  
  // Validate updates using validator
  if (updates.name !== undefined) {
    const cleanName = updates.name.trim();
    if (cleanName.length === 0 || !validator.isLength(cleanName, { max: 60 })) {
      throw new AppError('Name must be under 60 characters and cannot be empty.', 400);
    }
    filtered.name = cleanName;
  }

  if (updates.age !== undefined && updates.age !== null && updates.age !== '') {
    if (!validator.isInt(String(updates.age), { min: 10, max: 120 })) {
      throw new AppError('Age must be an integer between 10 and 120.', 400);
    }
    filtered.age = Number(updates.age);
  } else if (updates.age === null || updates.age === '') {
    filtered.age = null;
  }

  if (updates.about !== undefined) {
    if (!validator.isLength(updates.about, { max: 500 })) {
      throw new AppError('About section must be under 500 characters.', 400);
    }
    filtered.about = updates.about;
  }

  const allowedRoles = ['Student', 'Working Professional', 'Other'];
  if (updates.role !== undefined) {
    if (!allowedRoles.includes(updates.role)) {
      throw new AppError('Invalid role.', 400);
    }
    filtered.role = updates.role;
  }

  if (updates.organization !== undefined) {
    if (!validator.isLength(updates.organization, { max: 100 })) {
      throw new AppError('Organization must be under 100 characters.', 400);
    }
    filtered.organization = updates.organization;
  }

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
