const express = require('express');
const { register, login, logout, getMe, updateMe } = require('../controllers/authController');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

module.exports = router;
