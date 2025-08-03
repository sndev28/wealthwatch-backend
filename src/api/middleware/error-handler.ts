import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../config/logger.js';
import type { ApiResponse } from '../models/index.js';

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500): ApiError => {
  return new ApiError(message, statusCode);
};

export const errorHandler = (
  error: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Authentication required';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token format';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please log in again';
  } else if (error.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token not yet valid';
  }

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  const logData = {
    message: error.message,
    stack: error.stack,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  if (logLevel === 'error') {
    logger.error('API Error:', logData);
  } else {
    logger.warn('API Warning:', logData);
  }

  // Send response
  const response: ApiResponse = {
    success: false,
    error: message,
    data: null,
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};