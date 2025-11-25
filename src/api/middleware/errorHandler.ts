// Global error handler middleware

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request data',
      code: 'VALIDATION_ERROR',
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
      timestamp: new Date().toISOString(),
    });
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle unknown errors
  res.status(500).json({
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
}

