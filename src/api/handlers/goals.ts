import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import type { ApiResponse } from '../models/index.js';

// Get all goals for user
export const getGoals = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  const goals = await db('goals as g')
    .select(
      'g.*',
      db.raw('COALESCE(SUM(ga.percent_allocation), 0) as total_allocation')
    )
    .leftJoin('goals_allocation as ga', 'g.id', 'ga.goal_id')
    .where('g.user_id', userId)
    .groupBy('g.id')
    .orderBy('g.created_at', 'desc');

  const response: ApiResponse<typeof goals> = {
    success: true,
    data: goals
  };

  res.json(response);
});

// Get goal by ID
export const getGoal = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const goal = await db('goals')
    .where({ id, user_id: userId })
    .first();

  if (!goal) {
    throw new ApiError('Goal not found', 404);
  }

  // Get goal allocations
  const allocations = await db('goals_allocation as ga')
    .select(
      'ga.*',
      'a.name as account_name',
      'a.currency as account_currency'
    )
    .join('accounts as a', 'ga.account_id', 'a.id')
    .where('ga.goal_id', id);

  const goalWithAllocations = {
    ...goal,
    allocations
  };

  const response: ApiResponse<typeof goalWithAllocations> = {
    success: true,
    data: goalWithAllocations
  };

  res.json(response);
});

// Create new goal
export const createGoal = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { title, description, target_amount, is_achieved = false } = req.body;

  if (!title || !target_amount) {
    throw new ApiError('Title and target amount are required', 400);
  }

  const [goal] = await db('goals')
    .insert({
      user_id: userId,
      title,
      description,
      target_amount: parseFloat(target_amount),
      is_achieved,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .returning('*');

  const response: ApiResponse<typeof goal> = {
    success: true,
    data: goal
  };

  res.status(201).json(response);
});

// Update goal
export const updateGoal = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const updateData = req.body;

  // Verify goal exists and belongs to user
  const existingGoal = await db('goals')
    .where({ id, user_id: userId })
    .first();

  if (!existingGoal) {
    throw new ApiError('Goal not found', 404);
  }

  // Validate update data
  const allowedFields = ['title', 'description', 'target_amount', 'is_achieved'];
  const validData = Object.keys(updateData)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = updateData[key];
      return obj;
    }, {} as any);

  if (Object.keys(validData).length === 0) {
    throw new ApiError('No valid fields provided for update', 400);
  }

  validData.updated_at = new Date().toISOString();

  const [updatedGoal] = await db('goals')
    .where({ id })
    .update(validData)
    .returning('*');

  const response: ApiResponse<typeof updatedGoal> = {
    success: true,
    data: updatedGoal
  };

  res.json(response);
});

// Delete goal
export const deleteGoal = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  // Verify goal exists and belongs to user
  const existingGoal = await db('goals')
    .where({ id, user_id: userId })
    .first();

  if (!existingGoal) {
    throw new ApiError('Goal not found', 404);
  }

  // Delete goal allocations first (due to foreign key constraint)
  await db('goals_allocation').where({ goal_id: id }).del();

  // Delete goal
  await db('goals').where({ id }).del();

  const response: ApiResponse<null> = {
    success: true,
    data: null
  };

  res.json(response);
});

// Update goal allocations
export const updateGoalAllocations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const { allocations } = req.body;

  // Verify goal exists and belongs to user
  const existingGoal = await db('goals')
    .where({ id, user_id: userId })
    .first();

  if (!existingGoal) {
    throw new ApiError('Goal not found', 404);
  }

  if (!Array.isArray(allocations)) {
    throw new ApiError('Allocations must be an array', 400);
  }

  // Validate allocations
  const totalAllocation = allocations.reduce((sum, alloc) => sum + (alloc.percent_allocation || 0), 0);
  if (totalAllocation > 100) {
    throw new ApiError('Total allocation cannot exceed 100%', 400);
  }

  // Verify all accounts belong to user
  const accountIds = allocations.map(alloc => alloc.account_id);
  const userAccounts = await db('accounts')
    .where({ user_id: userId })
    .whereIn('id', accountIds);

  if (userAccounts.length !== accountIds.length) {
    throw new ApiError('One or more accounts not found or do not belong to user', 400);
  }

  // Delete existing allocations
  await db('goals_allocation').where({ goal_id: id }).del();

  // Insert new allocations
  const allocationData = allocations.map(alloc => ({
    goal_id: id,
    account_id: alloc.account_id,
    percent_allocation: alloc.percent_allocation,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  if (allocationData.length > 0) {
    await db('goals_allocation').insert(allocationData);
  }

  // Get updated allocations
  const updatedAllocations = await db('goals_allocation as ga')
    .select(
      'ga.*',
      'a.name as account_name',
      'a.currency as account_currency'
    )
    .join('accounts as a', 'ga.account_id', 'a.id')
    .where('ga.goal_id', id);

  const response: ApiResponse<typeof updatedAllocations> = {
    success: true,
    data: updatedAllocations
  };

  res.json(response);
});

// Get goal progress
export const getGoalProgress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  // Verify goal exists and belongs to user
  const goal = await db('goals')
    .where({ id, user_id: userId })
    .first();

  if (!goal) {
    throw new ApiError('Goal not found', 404);
  }

  // Get goal allocations
  const allocations = await db('goals_allocation as ga')
    .select(
      'ga.account_id',
      'ga.percent_allocation',
      'a.name as account_name',
      'a.currency as account_currency'
    )
    .join('accounts as a', 'ga.account_id', 'a.id')
    .where('ga.goal_id', id);

  // Calculate current value for each allocated account
  const progressData = [];
  let totalCurrentValue = 0;

  for (const allocation of allocations) {
    // Get current account value (simplified calculation)
    const accountValue = await db('activities as act')
      .select(
        db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) as cost_basis'),
        db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(q.close_price, 0) as market_value')
      )
      .leftJoin('assets as ast', 'act.asset_id', 'ast.id')
      .leftJoin(
        db('quotes')
          .select('symbol', 'close_price')
          .whereIn('symbol', db('assets').select('symbol'))
          .orderBy('timestamp', 'desc')
          .limit(1)
          .as('latest_quotes'),
        'ast.symbol',
        'latest_quotes.symbol'
      )
      .where('act.account_id', allocation.account_id)
      .first();

    const currentValue = accountValue.market_value || 0;
    const allocatedValue = (goal.target_amount * allocation.percent_allocation) / 100;
    const progress = allocatedValue > 0 ? (currentValue / allocatedValue) * 100 : 0;

    progressData.push({
      account_id: allocation.account_id,
      account_name: allocation.account_name,
      account_currency: allocation.account_currency,
      percent_allocation: allocation.percent_allocation,
      allocated_amount: allocatedValue,
      current_value: currentValue,
      progress_percent: progress
    });

    totalCurrentValue += currentValue;
  }

  const overallProgress = goal.target_amount > 0 ? (totalCurrentValue / goal.target_amount) * 100 : 0;

  const response: ApiResponse<{
    goal: typeof goal;
    progress_data: typeof progressData;
    total_current_value: number;
    overall_progress_percent: number;
  }> = {
    success: true,
    data: {
      goal,
      progress_data: progressData,
      total_current_value: totalCurrentValue,
      overall_progress_percent: overallProgress
    }
  };

  res.json(response);
});

// Get all goals progress summary
export const getGoalsProgressSummary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  const goals = await db('goals')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc');

  const summary = [];

  for (const goal of goals) {
    // Get goal allocations
    const allocations = await db('goals_allocation as ga')
      .select('ga.account_id', 'ga.percent_allocation')
      .where('ga.goal_id', goal.id);

    // Calculate current value for allocated accounts
    let totalCurrentValue = 0;

    for (const allocation of allocations) {
      const accountValue = await db('activities as act')
        .select(
          db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(q.close_price, 0) as market_value')
        )
        .leftJoin('assets as ast', 'act.asset_id', 'ast.id')
        .leftJoin(
          db('quotes')
            .select('symbol', 'close_price')
            .whereIn('symbol', db('assets').select('symbol'))
            .orderBy('timestamp', 'desc')
            .limit(1)
            .as('latest_quotes'),
          'ast.symbol',
          'latest_quotes.symbol'
        )
        .where('act.account_id', allocation.account_id)
        .first();

      totalCurrentValue += accountValue.market_value || 0;
    }

    const progress = goal.target_amount > 0 ? (totalCurrentValue / goal.target_amount) * 100 : 0;

    summary.push({
      id: goal.id,
      title: goal.title,
      target_amount: goal.target_amount,
      current_value: totalCurrentValue,
      progress_percent: progress,
      is_achieved: goal.is_achieved,
      created_at: goal.created_at
    });
  }

  const response: ApiResponse<typeof summary> = {
    success: true,
    data: summary
  };

  res.json(response);
}); 