import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  
  // Database
  databaseUrl: z.string().min(1),
  
  // JWT
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('15m'),
  jwtRefreshExpiresIn: z.string().default('7d'),
  
  // CORS
  corsOrigin: z.string().default('http://localhost:5173'),
  
  // Rate limiting
  rateLimitWindowMs: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: z.coerce.number().default(100),
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  logFile: z.string().optional(),
});

const env = {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  databaseUrl: process.env.NODE_ENV === 'production' 
    ? process.env.DATABASE_URL 
    : process.env.DATABASE_URL_DEV,
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-that-is-at-least-32-characters-long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  corsOrigin: process.env.CORS_ORIGIN,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
  logLevel: process.env.LOG_LEVEL,
  logFile: process.env.LOG_FILE,
};

export const config = configSchema.parse(env);