// Authentication routes

import { Router, Response } from 'express';
import { createUser, findUserByEmail, findUserById, verifyPassword } from '../../storage/models/User.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../../utils/validation.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../../utils/validation.js';
import { ConflictError, AuthenticationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = validateBody(registerSchema, req.body);

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await createUser(email, password, name);

    // Generate tokens
    const token = generateToken(user.userId, user.email);
    const refreshToken = generateRefreshToken(user.userId, user.email);

    logger.info(`User registered: ${user.userId} (${user.email})`);

    res.status(201).json({
      userId: user.userId,
      email: user.email,
      name: user.name,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = validateBody(loginSchema, req.body);

    // Find user
    const user = findUserByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate tokens
    const token = generateToken(user.userId, user.email);
    const refreshToken = generateRefreshToken(user.userId, user.email);

    logger.info(`User logged in: ${user.userId} (${user.email})`);

    res.json({
      userId: user.userId,
      email: user.email,
      name: user.name,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', (req, res, next) => {
  try {
    const { refreshToken } = validateBody(refreshTokenSchema, req.body);

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Generate new tokens
    const newToken = generateToken(payload.userId, payload.email);
    const newRefreshToken = generateRefreshToken(payload.userId, payload.email);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, (req: AuthRequest, res: Response, next) => {
  try {
    const user = findUserById(req.userId!);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    res.json({
      userId: user.userId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

