import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/index.js';
import { LoginSchema, CreateUserSchema, type ApiResponse, type AuthResponse } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import { config } from '../../config/index.js';

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, display_name } = CreateUserSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await db('users').where({ email }).first();
  if (existingUser) {
    throw new ApiError('User already exists with this email', 400);
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 12);

  // Create user
  const [user] = await db('users')
    .insert({
      email,
      password_hash,
      display_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .returning(['id', 'email', 'display_name', 'is_active', 'created_at', 'updated_at']);

  // Create user settings
  await db('user_settings').insert({
    user_id: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Generate tokens
  const token = (jwt.sign as any)(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const refresh_token = (jwt.sign as any)(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );

  // Store refresh token
  await db('user_sessions').insert({
    user_id: user.id,
    token_hash: await bcrypt.hash(refresh_token, 10),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    user_agent: req.get('User-Agent'),
    ip_address: req.ip,
    created_at: new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  });

  const response: ApiResponse<AuthResponse> = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
      refresh_token,
    },
  };

  res.status(201).json(response);
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = LoginSchema.parse(req.body);

  // Find user
  const user = await db('users').where({ email }).first();
  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Check if user is active
  if (!user.is_active) {
    throw new ApiError('Account is inactive', 401);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Update last login
  await db('users')
    .where({ id: user.id })
    .update({ last_login_at: new Date().toISOString() });

  // Generate tokens
  const token = (jwt.sign as any)(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const refresh_token = (jwt.sign as any)(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );

  // Store refresh token
  await db('user_sessions').insert({
    user_id: user.id,
    token_hash: await bcrypt.hash(refresh_token, 10),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    user_agent: req.get('User-Agent'),
    ip_address: req.ip,
    created_at: new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  });

  const response: ApiResponse<AuthResponse> = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
      },
      token,
      refresh_token,
    },
  };

  res.json(response);
});

export const refresh = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new ApiError('Refresh token is required', 400);
  }

  try {
    const decoded = jwt.verify(refresh_token, config.jwtSecret) as { userId: string; email: string };

    // Find user
    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user || !user.is_active) {
      throw new ApiError('Invalid refresh token', 401);
    }

    // Verify refresh token exists in database
    const sessions = await db('user_sessions')
      .where({ user_id: user.id })
      .andWhere('expires_at', '>', new Date().toISOString());

    let validSession = false;
    for (const session of sessions) {
      const isValid = await bcrypt.compare(refresh_token, session.token_hash);
      if (isValid) {
        validSession = true;
        // Update last used
        await db('user_sessions')
          .where({ id: session.id })
          .update({ last_used_at: new Date().toISOString() });
        break;
      }
    }

    if (!validSession) {
      throw new ApiError('Invalid refresh token', 401);
    }

    // Generate new access token
    const token = (jwt.sign as any)(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const response: ApiResponse<{ token: string }> = {
      success: true,
      data: { token },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      throw new ApiError('Invalid refresh token', 401);
    }
    throw error;
  }
});

export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { refresh_token } = req.body;

  if (refresh_token) {
    // Remove specific refresh token from database
    const sessions = await db('user_sessions')
      .where({ user_id: req.user?.id });

    for (const session of sessions) {
      const isValid = await bcrypt.compare(refresh_token, session.token_hash);
      if (isValid) {
        await db('user_sessions').where({ id: session.id }).delete();
        break;
      }
    }
  } else {
    // If no refresh token provided, remove all sessions for the user
    // This is useful for "logout from all devices" functionality
    if (req.user?.id) {
      await db('user_sessions')
        .where({ user_id: req.user.id })
        .delete();
    }
  }

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Logged out successfully' },
  };

  res.json(response);
});

export const me = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ApiError('User not found', 401);
  }

  const user = await db('users')
    .where({ id: req.user.id })
    .first();

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
    },
  };

  res.json(response);
});