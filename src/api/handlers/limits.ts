import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import type { ApiResponse } from '../models/index.js';

// Get all contribution limits for user
export const getContributionLimits = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  const limits = await db('contribution_limits')
    .where({ user_id: userId })
    .orderBy(['contribution_year', 'group_name']);

  const response: ApiResponse<typeof limits> = {
    success: true,
    data: limits
  };

  res.json(response);
});

// Get contribution limit by ID
export const getContributionLimit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const limit = await db('contribution_limits')
    .where({ id, user_id: userId })
    .first();

  if (!limit) {
    throw new ApiError('Contribution limit not found', 404);
  }

  const response: ApiResponse<typeof limit> = {
    success: true,
    data: limit
  };

  res.json(response);
});

// Create new contribution limit
export const createContributionLimit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { group_name, contribution_year, limit_amount, account_ids, start_date, end_date } = req.body;

  if (!group_name || !contribution_year || !limit_amount) {
    throw new ApiError('Group name, contribution year, and limit amount are required', 400);
  }

  // Check if limit already exists for this group and year
  const existingLimit = await db('contribution_limits')
    .where({ 
      user_id: userId, 
      group_name, 
      contribution_year 
    })
    .first();

  if (existingLimit) {
    throw new ApiError('Contribution limit already exists for this group and year', 400);
  }

  const [limit] = await db('contribution_limits')
    .insert({
      user_id: userId,
      group_name,
      contribution_year: parseInt(contribution_year),
      limit_amount: parseFloat(limit_amount),
      account_ids: account_ids ? JSON.stringify(account_ids) : null,
      start_date: start_date ? new Date(start_date).toISOString() : null,
      end_date: end_date ? new Date(end_date).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .returning('*');

  const response: ApiResponse<typeof limit> = {
    success: true,
    data: limit
  };

  res.status(201).json(response);
});

// Update contribution limit
export const updateContributionLimit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const updateData = req.body;

  // Verify limit exists and belongs to user
  const existingLimit = await db('contribution_limits')
    .where({ id, user_id: userId })
    .first();

  if (!existingLimit) {
    throw new ApiError('Contribution limit not found', 404);
  }

  // Validate update data
  const allowedFields = ['group_name', 'contribution_year', 'limit_amount', 'account_ids', 'start_date', 'end_date'];
  const validData = Object.keys(updateData)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      if (key === 'account_ids' && updateData[key]) {
        obj[key] = JSON.stringify(updateData[key]);
      } else if (key === 'start_date' && updateData[key]) {
        obj[key] = new Date(updateData[key]).toISOString();
      } else if (key === 'end_date' && updateData[key]) {
        obj[key] = new Date(updateData[key]).toISOString();
      } else {
        obj[key] = updateData[key];
      }
      return obj;
    }, {} as any);

  if (Object.keys(validData).length === 0) {
    throw new ApiError('No valid fields provided for update', 400);
  }

  validData.updated_at = new Date().toISOString();

  const [updatedLimit] = await db('contribution_limits')
    .where({ id })
    .update(validData)
    .returning('*');

  const response: ApiResponse<typeof updatedLimit> = {
    success: true,
    data: updatedLimit
  };

  res.json(response);
});

// Delete contribution limit
export const deleteContributionLimit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  // Verify limit exists and belongs to user
  const existingLimit = await db('contribution_limits')
    .where({ id, user_id: userId })
    .first();

  if (!existingLimit) {
    throw new ApiError('Contribution limit not found', 404);
  }

  // Delete limit
  await db('contribution_limits').where({ id }).del();

  const response: ApiResponse<null> = {
    success: true,
    data: null
  };

  res.json(response);
});

// Get contribution deposits for a limit
export const getContributionDeposits = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  // Verify limit exists and belongs to user
  const limit = await db('contribution_limits')
    .where({ id, user_id: userId })
    .first();

  if (!limit) {
    throw new ApiError('Contribution limit not found', 404);
  }

  // Get account IDs for this limit
  const accountIds = limit.account_ids ? JSON.parse(limit.account_ids) : [];

  if (accountIds.length === 0) {
    const response: ApiResponse<{
      limit: typeof limit;
      deposits: any[];
      total_deposits: number;
      remaining_limit: number;
    }> = {
      success: true,
      data: {
        limit,
        deposits: [],
        total_deposits: 0,
        remaining_limit: limit.limit_amount
      }
    };

    res.json(response);
    return;
  }

  // Get deposits from activities
  const startDate = limit.start_date || `${limit.contribution_year}-01-01`;
  const endDate = limit.end_date || `${limit.contribution_year}-12-31`;

  const deposits = await db('activities as act')
    .select(
      'act.id',
      'act.activity_date',
      'act.amount',
      'act.currency',
      'act.comment',
      'a.name as account_name',
      'ast.symbol',
      'ast.name as asset_name'
    )
    .join('accounts as a', 'act.account_id', 'a.id')
    .join('assets as ast', 'act.asset_id', 'ast.id')
    .where('a.user_id', userId)
    .whereIn('act.account_id', accountIds)
    .whereIn('act.activity_type', ['BUY', 'DEPOSIT', 'CONTRIBUTION'])
    .where('act.activity_date', '>=', startDate)
    .where('act.activity_date', '<=', endDate)
    .orderBy('act.activity_date', 'desc');

  // Calculate total deposits
  const totalDeposits = deposits.reduce((sum, deposit) => sum + (deposit.amount || 0), 0);
  const remainingLimit = Math.max(0, limit.limit_amount - totalDeposits);

  const response: ApiResponse<{
    limit: typeof limit;
    deposits: typeof deposits;
    total_deposits: number;
    remaining_limit: number;
  }> = {
    success: true,
    data: {
      limit,
      deposits,
      total_deposits: totalDeposits,
      remaining_limit: remainingLimit
    }
  };

  res.json(response);
});

// Get contribution limits summary
export const getContributionLimitsSummary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { year } = req.query;

  let query = db('contribution_limits')
    .where({ user_id: userId });

  if (year) {
    query = query.where({ contribution_year: parseInt(year as string) });
  }

  const limits = await query.orderBy(['contribution_year', 'group_name']);

  const summary = [];

  for (const limit of limits) {
    // Get account IDs for this limit
    const accountIds = limit.account_ids ? JSON.parse(limit.account_ids) : [];

    if (accountIds.length === 0) {
      summary.push({
        id: limit.id,
        group_name: limit.group_name,
        contribution_year: limit.contribution_year,
        limit_amount: limit.limit_amount,
        total_deposits: 0,
        remaining_limit: limit.limit_amount,
        utilization_percent: 0
      });
      continue;
    }

    // Get deposits from activities
    const startDate = limit.start_date || `${limit.contribution_year}-01-01`;
    const endDate = limit.end_date || `${limit.contribution_year}-12-31`;

    const deposits = await db('activities as act')
      .select(db.raw('COALESCE(SUM(act.amount), 0) as total_deposits'))
      .join('accounts as a', 'act.account_id', 'a.id')
      .where('a.user_id', userId)
      .whereIn('act.account_id', accountIds)
      .whereIn('act.activity_type', ['BUY', 'DEPOSIT', 'CONTRIBUTION'])
      .where('act.activity_date', '>=', startDate)
      .where('act.activity_date', '<=', endDate)
      .first();

    const totalDeposits = deposits.total_deposits || 0;
    const remainingLimit = Math.max(0, limit.limit_amount - totalDeposits);
    const utilizationPercent = limit.limit_amount > 0 ? (totalDeposits / limit.limit_amount) * 100 : 0;

    summary.push({
      id: limit.id,
      group_name: limit.group_name,
      contribution_year: limit.contribution_year,
      limit_amount: limit.limit_amount,
      total_deposits: totalDeposits,
      remaining_limit: remainingLimit,
      utilization_percent: utilizationPercent
    });
  }

  const response: ApiResponse<typeof summary> = {
    success: true,
    data: summary
  };

  res.json(response);
});

// Get available account groups for limits
export const getAccountGroups = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  const groups = await db('accounts')
    .select('group_name')
    .where({ user_id: userId })
    .whereNotNull('group_name')
    .groupBy('group_name')
    .orderBy('group_name');

  const response: ApiResponse<typeof groups> = {
    success: true,
    data: groups
  };

  res.json(response);
});

// Get accounts by group
export const getAccountsByGroup = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { group_name } = req.params;

  const accounts = await db('accounts')
    .select('id', 'name', 'account_type', 'currency', 'is_active')
    .where({ user_id: userId, group_name, is_active: true })
    .orderBy('name');

  const response: ApiResponse<typeof accounts> = {
    success: true,
    data: accounts
  };

  res.json(response);
}); 