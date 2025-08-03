import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import type { ApiResponse } from '../models/index.js';

// Create database backup
export const createBackup = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  try {
    // Get all user data for backup
    const backup = {
      user: await db('users').where({ id: userId }).first(),
      user_settings: await db('user_settings').where({ user_id: userId }).first(),
      accounts: await db('accounts').where({ user_id: userId }),
      assets: await db('assets').whereIn('id', 
        db('activities').select('asset_id').join('accounts', 'activities.account_id', 'accounts.id').where('accounts.user_id', userId)
      ),
      activities: await db('activities')
        .join('accounts', 'activities.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .select('activities.*'),
      goals: await db('goals').where({ user_id: userId }),
      goals_allocation: await db('goals_allocation')
        .join('goals', 'goals_allocation.goal_id', 'goals.id')
        .where('goals.user_id', userId)
        .select('goals_allocation.*'),
      contribution_limits: await db('contribution_limits').where({ user_id: userId }),
      quotes: await db('quotes').whereIn('symbol', 
        db('assets').select('symbol').whereIn('id', 
          db('activities').select('asset_id').join('accounts', 'activities.account_id', 'accounts.id').where('accounts.user_id', userId)
        )
      ),
      activity_import_profiles: await db('activity_import_profiles').where({ user_id: userId }),
      holdings_snapshots: await db('holdings_snapshots')
        .join('accounts', 'holdings_snapshots.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .select('holdings_snapshots.*'),
      daily_account_valuation: await db('daily_account_valuation')
        .join('accounts', 'daily_account_valuation.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .select('daily_account_valuation.*'),
      backup_created_at: new Date().toISOString(),
      backup_version: '1.0.0'
    };

    const response: ApiResponse<{
      backup_id: string;
      backup_size: number;
      backup_created_at: string;
      tables_backed_up: string[];
    }> = {
      success: true,
      data: {
        backup_id: `backup_${userId}_${Date.now()}`,
        backup_size: JSON.stringify(backup).length,
        backup_created_at: backup.backup_created_at,
        tables_backed_up: Object.keys(backup).filter(key => key !== 'backup_created_at' && key !== 'backup_version')
      }
    };

    res.json(response);
  } catch (error) {
    throw new ApiError('Failed to create backup', 500);
  }
});

// Restore database from backup
export const restoreBackup = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { backup_data } = req.body;

  if (!backup_data) {
    throw new ApiError('Backup data is required', 400);
  }

  try {
    // Validate backup data structure
    const requiredTables = ['user', 'user_settings', 'accounts', 'assets', 'activities', 'goals'];
    for (const table of requiredTables) {
      if (!backup_data[table]) {
        throw new ApiError(`Invalid backup data: missing ${table}`, 400);
      }
    }

    // Start transaction
    await db.transaction(async (trx) => {
      // Clear existing user data
      await trx('daily_account_valuation')
        .join('accounts', 'daily_account_valuation.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .del();

      await trx('holdings_snapshots')
        .join('accounts', 'holdings_snapshots.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .del();

      await trx('goals_allocation')
        .join('goals', 'goals_allocation.goal_id', 'goals.id')
        .where('goals.user_id', userId)
        .del();

      await trx('activities')
        .join('accounts', 'activities.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .del();

      await trx('goals').where({ user_id: userId }).del();
      await trx('contribution_limits').where({ user_id: userId }).del();
      await trx('activity_import_profiles').where({ user_id: userId }).del();
      await trx('accounts').where({ user_id: userId }).del();

      // Restore user settings
      if (backup_data.user_settings) {
        await trx('user_settings').insert(backup_data.user_settings);
      }

      // Restore accounts
      if (backup_data.accounts && backup_data.accounts.length > 0) {
        await trx('accounts').insert(backup_data.accounts);
      }

      // Restore assets
      if (backup_data.assets && backup_data.assets.length > 0) {
        await trx('assets').insert(backup_data.assets);
      }

      // Restore activities
      if (backup_data.activities && backup_data.activities.length > 0) {
        await trx('activities').insert(backup_data.activities);
      }

      // Restore goals
      if (backup_data.goals && backup_data.goals.length > 0) {
        await trx('goals').insert(backup_data.goals);
      }

      // Restore goal allocations
      if (backup_data.goals_allocation && backup_data.goals_allocation.length > 0) {
        await trx('goals_allocation').insert(backup_data.goals_allocation);
      }

      // Restore contribution limits
      if (backup_data.contribution_limits && backup_data.contribution_limits.length > 0) {
        await trx('contribution_limits').insert(backup_data.contribution_limits);
      }

      // Restore quotes
      if (backup_data.quotes && backup_data.quotes.length > 0) {
        await trx('quotes').insert(backup_data.quotes);
      }

      // Restore activity import profiles
      if (backup_data.activity_import_profiles && backup_data.activity_import_profiles.length > 0) {
        await trx('activity_import_profiles').insert(backup_data.activity_import_profiles);
      }

      // Restore holdings snapshots
      if (backup_data.holdings_snapshots && backup_data.holdings_snapshots.length > 0) {
        await trx('holdings_snapshots').insert(backup_data.holdings_snapshots);
      }

      // Restore daily account valuations
      if (backup_data.daily_account_valuation && backup_data.daily_account_valuation.length > 0) {
        await trx('daily_account_valuation').insert(backup_data.daily_account_valuation);
      }
    });

    const response: ApiResponse<{
      restored_at: string;
      tables_restored: string[];
    }> = {
      success: true,
      data: {
        restored_at: new Date().toISOString(),
        tables_restored: Object.keys(backup_data).filter(key => key !== 'backup_created_at' && key !== 'backup_version')
      }
    };

    res.json(response);
  } catch (error) {
    throw new ApiError('Failed to restore backup', 500);
  }
});

// Export user data
export const exportUserData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { format = 'json' } = req.query;

  try {
    // Get all user data
    const userData = {
      user: await db('users').where({ id: userId }).first(),
      user_settings: await db('user_settings').where({ user_id: userId }).first(),
      accounts: await db('accounts').where({ user_id: userId }),
      assets: await db('assets').whereIn('id', 
        db('activities').select('asset_id').join('accounts', 'activities.account_id', 'accounts.id').where('accounts.user_id', userId)
      ),
      activities: await db('activities')
        .join('accounts', 'activities.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .select('activities.*'),
      goals: await db('goals').where({ user_id: userId }),
      goals_allocation: await db('goals_allocation')
        .join('goals', 'goals_allocation.goal_id', 'goals.id')
        .where('goals.user_id', userId)
        .select('goals_allocation.*'),
      contribution_limits: await db('contribution_limits').where({ user_id: userId }),
      quotes: await db('quotes').whereIn('symbol', 
        db('assets').select('symbol').whereIn('id', 
          db('activities').select('asset_id').join('accounts', 'activities.account_id', 'accounts.id').where('accounts.user_id', userId)
        )
      ),
      export_created_at: new Date().toISOString(),
      export_version: '1.0.0'
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = {
        accounts: userData.accounts,
        activities: userData.activities,
        goals: userData.goals
      };

      const response: ApiResponse<typeof csvData> = {
        success: true,
        data: csvData
      };

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="wealthwatch_export_${Date.now()}.csv"`);
      res.json(response);
    } else {
      const response: ApiResponse<typeof userData> = {
        success: true,
        data: userData
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="wealthwatch_export_${Date.now()}.json"`);
      res.json(response);
    }
  } catch (error) {
    throw new ApiError('Failed to export user data', 500);
  }
});

// Get system health
export const getSystemHealth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Test database connection
    await db.raw('SELECT 1');

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    const response: ApiResponse<typeof health> = {
      success: true,
      data: health
    };

    res.json(response);
  } catch (error) {
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    const response: ApiResponse<typeof health> = {
      success: false,
      data: health
    };

    res.status(503).json(response);
  }
});

// Get database statistics
export const getDatabaseStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  try {
    const stats = {
      accounts: await db('accounts').where({ user_id: userId }).count('* as count').first(),
      assets: await db('assets').whereIn('id', 
        db('activities').select('asset_id').join('accounts', 'activities.account_id', 'accounts.id').where('accounts.user_id', userId)
      ).count('* as count').first(),
      activities: await db('activities')
        .join('accounts', 'activities.account_id', 'accounts.id')
        .where('accounts.user_id', userId)
        .count('activities.id as count').first(),
      goals: await db('goals').where({ user_id: userId }).count('* as count').first(),
      quotes: await db('quotes').whereIn('symbol', 
        db('assets').select('symbol').whereIn('id', 
          db('activities').select('asset_id').join('accounts', 'activities.account_id', 'accounts.id').where('accounts.user_id', userId)
        )
      ).count('* as count').first(),
      contribution_limits: await db('contribution_limits').where({ user_id: userId }).count('* as count').first(),
      generated_at: new Date().toISOString()
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    throw new ApiError('Failed to get database statistics', 500);
  }
}); 