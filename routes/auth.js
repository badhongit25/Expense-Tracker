const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { findUserByUsername, createUser } = require('../database/db');

/**
 * POST /api/auth/register
 * Register a new user account with bcrypt password hashing
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username is required.'
      });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 30 characters.'
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username may only contain letters, numbers, hyphens, and underscores.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if username already exists
    const existing = await findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken. Please choose another username.'
      });
    }

    // Hash password with bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save to SQLite
    const result = await createUser(cleanUsername, hashedPassword);

    // Set user session automatically upon registration
    req.session.user = {
      id: result.id,
      username: cleanUsername
    };

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Trackr//.',
      user: req.session.user
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred during registration.'
    });
  }
});

/**
 * POST /api/auth/login
 * Verify user credentials and establish express-session
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both username and password are required.'
      });
    }

    const cleanUsername = username.trim();
    const user = await findUserByUsername(cleanUsername);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Verify bcrypt password hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Regenerate session to protect against session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to establish user session.'
        });
      }

      req.session.user = {
        id: user.id,
        username: user.username
      };

      return res.json({
        success: true,
        message: `Welcome back, ${user.username}!`,
        user: req.session.user
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy user session and clear cookie
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to logout cleanly.'
        });
      }
      res.clearCookie('connect.sid');
      return res.json({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  } else {
    res.clearCookie('connect.sid');
    return res.json({
      success: true,
      message: 'Already logged out.'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current session user status
 */
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      authenticated: true,
      user: req.session.user
    });
  }
  return res.json({
    authenticated: false,
    user: null
  });
});

module.exports = router;
