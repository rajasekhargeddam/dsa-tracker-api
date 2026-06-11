const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name must be under 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    age: {
      type: Number,
      min: [10, 'Age must be at least 10'],
      max: [120, 'Age must be realistic'],
      default: null,
    },
    about: {
      type: String,
      trim: true,
      maxlength: [500, 'About must be under 500 characters'],
      default: '',
    },
    role: {
      type: String,
      enum: {
        values: ['Student', 'Working Professional', 'Other'],
        message: '{VALUE} is not a valid role',
      },
      default: 'Student',
    },
    organization: {
      type: String,
      trim: true,
      maxlength: [100, 'Organization must be under 100 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash the password whenever it is set or changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
