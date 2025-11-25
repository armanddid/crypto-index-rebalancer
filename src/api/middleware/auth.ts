// Authentication middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Generate a JWT token
 */
export function generateToken(userId: string, email: string): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(
    { userId, email } as JWTPayload,
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(userId: string, email: string): string {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  
  return jwt.sign(
    { userId, email } as JWTPayload,
    process.env.REFRESH_TOKEN_SECRET || JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
}

/**
 * Authentication middleware
 * Extracts and verifies JWT token from Authorization header
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format. Use: Bearer <token>');
    }
    
    const token = parts[1];
    const payload = verifyToken(token);
    
    // Attach userId to request
    req.userId = payload.userId;
    
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message,
        code: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error('Authentication error:', error);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication failed',
        code: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches userId if token is provided, but doesn't fail if not
 */
export function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const parts = authHeader.split(' ');
      
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const payload = verifyToken(token);
        req.userId = payload.userId;
      }
    }
    
    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}

