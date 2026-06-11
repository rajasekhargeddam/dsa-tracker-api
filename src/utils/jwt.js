const jwt = require('jsonwebtoken');

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in the environment');
  }
  return secret;
};

const signToken = (payload) =>
  jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const verifyToken = (token) => jwt.verify(token, getSecret());

module.exports = { signToken, verifyToken };
