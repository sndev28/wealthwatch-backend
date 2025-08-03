import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { db } from '../../database/index.js';
import { ApiError } from './error-handler.js';

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        error: 'Authorization header is required',
        code: 'AUTH_HEADER_MISSING'
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Invalid authorization format. Use Bearer token',
        code: 'INVALID_AUTH_FORMAT'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      res.status(401).json({
        error: 'Token is required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          error: 'Token has expired. Please log in again',
          code: 'TOKEN_EXPIRED'
        });
        return;
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          error: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
        return;
      } else {
        res.status(401).json({
          error: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
        return;
      }
    }
    
    // Check if user exists and is active
    const user = await db('users')
      .where({ id: decoded.userId })
      .first();

    if (!user) {
      res.status(401).json({
        error: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({
        error: 'User account is inactive. Please contact support',
        code: 'USER_INACTIVE'
      });
      return;
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    // Log the error for debugging but don't expose internal details
    console.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
    return;
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (jwtError) {
      // For optional auth, we don't fail on token errors
      return next();
    }
    
    // Check if user exists and is active
    const user = await db('users')
      .where({ id: decoded.userId })
      .first();

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        email: user.email,
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on any errors
    next();
  }
};