import knex from 'knex';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

const isDevelopment = config.nodeEnv === 'development';

export const db = knex({
  client: isDevelopment ? 'sqlite3' : 'pg',
  connection: isDevelopment 
    ? { filename: './dev.db' }
    : config.databaseUrl,
  useNullAsDefault: isDevelopment,
  pool: isDevelopment ? undefined : {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './migrations'
  }
});

export async function initializeDatabase() {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    logger.info('📊 Database connection established');
    
    // Check if migrations table exists
    const hasMigrationsTable = await db.schema.hasTable('knex_migrations');
    
    if (hasMigrationsTable) {
      // Check if migrations are up to date
      const pendingMigrations = await db.migrate.list();
      if (pendingMigrations[1].length === 0) {
        logger.info('📊 Database migrations are up to date');
      } else {
        // Run pending migrations
        await db.migrate.latest();
        logger.info('📊 Database migrations completed');
      }
    } else {
      // Run migrations for the first time
      await db.migrate.latest();
      logger.info('📊 Database migrations completed');
    }
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}