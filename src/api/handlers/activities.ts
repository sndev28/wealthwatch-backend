import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/index.js';
import { CreateActivitySchema, UpdateActivitySchema, PaginationQuerySchema, type ApiResponse } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';

export const getActivities = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { page, per_page } = PaginationQuerySchema.parse(req.query);
  const { account_id, activity_type, search } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const offset = (page - 1) * per_page;

  let query = db('activities')
    .join('accounts', 'activities.account_id', 'accounts.id')
    .join('assets', 'activities.asset_id', 'assets.id')
    .where('accounts.user_id', userId)
    .select(
      'activities.*',
      'accounts.name as account_name',
      'assets.symbol as asset_symbol',
      'assets.name as asset_name'
    );

  // Apply filters
  if (account_id) {
    query = query.where('activities.account_id', account_id);
  }
  if (activity_type) {
    query = query.where('activities.activity_type', activity_type);
  }
  if (search) {
    query = query.where(function() {
      this.where('assets.symbol', 'like', `%${search}%`)
        .orWhere('assets.name', 'like', `%${search}%`)
        .orWhere('activities.comment', 'like', `%${search}%`);
    });
  }

  const [activities, [{ count }]] = await Promise.all([
    query.clone()
      .orderBy('activities.activity_date', 'desc')
      .limit(per_page)
      .offset(offset),
    query.clone().count('* as count')
  ]);

  const total = parseInt(String(count));
  const total_pages = Math.ceil(total / per_page);

  const response: ApiResponse = {
    success: true,
    data: activities,
    pagination: {
      page,
      per_page,
      total,
      total_pages,
    },
  };

  res.json(response);
});

export const getActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const activity = await db('activities')
    .join('accounts', 'activities.account_id', 'accounts.id')
    .join('assets', 'activities.asset_id', 'assets.id')
    .where('activities.id', id)
    .where('accounts.user_id', userId)
    .select(
      'activities.*',
      'accounts.name as account_name',
      'assets.symbol as asset_symbol',
      'assets.name as asset_name'
    )
    .first();

  if (!activity) {
    throw new ApiError('Activity not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: activity,
  };

  res.json(response);
});

export const createActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const activityData = CreateActivitySchema.parse(req.body);

  // Verify account belongs to user
  const account = await db('accounts')
    .where({ id: activityData.account_id, user_id: userId })
    .first();

  if (!account) {
    throw new ApiError('Account not found or does not belong to user', 404);
  }

  // Verify asset exists
  const asset = await db('assets')
    .where({ id: activityData.asset_id })
    .first();

  if (!asset) {
    throw new ApiError('Asset not found', 404);
  }

  const [activity] = await db('activities')
    .insert({
      ...activityData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .returning('*');

  const response: ApiResponse = {
    success: true,
    data: activity,
  };

  res.status(201).json(response);
});

export const updateActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const updateData = UpdateActivitySchema.parse(req.body);

  // Check if activity exists and belongs to user
  const existingActivity = await db('activities')
    .join('accounts', 'activities.account_id', 'accounts.id')
    .where('activities.id', id)
    .where('accounts.user_id', userId)
    .first();

  if (!existingActivity) {
    throw new ApiError('Activity not found', 404);
  }

  // If updating account, verify it belongs to user
  if (updateData.account_id) {
    const account = await db('accounts')
      .where({ id: updateData.account_id, user_id: userId })
      .first();

    if (!account) {
      throw new ApiError('Account not found or does not belong to user', 404);
    }
  }

  // If updating asset, verify it exists
  if (updateData.asset_id) {
    const asset = await db('assets')
      .where({ id: updateData.asset_id })
      .first();

    if (!asset) {
      throw new ApiError('Asset not found', 404);
    }
  }

  const [activity] = await db('activities')
    .where({ id })
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .returning('*');

  const response: ApiResponse = {
    success: true,
    data: activity,
  };

  res.json(response);
});

export const deleteActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  // Check if activity exists and belongs to user
  const existingActivity = await db('activities')
    .join('accounts', 'activities.account_id', 'accounts.id')
    .where('activities.id', id)
    .where('accounts.user_id', userId)
    .first();

  if (!existingActivity) {
    throw new ApiError('Activity not found', 404);
  }

  await db('activities')
    .where({ id })
    .delete();

  const response: ApiResponse = {
    success: true,
    data: { message: 'Activity deleted successfully' },
  };

  res.json(response);
});

export const getActivityTypes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const activityTypes = await db('activities')
    .join('accounts', 'activities.account_id', 'accounts.id')
    .where('accounts.user_id', userId)
    .distinct('activity_type')
    .orderBy('activity_type');

  const response: ApiResponse = {
    success: true,
    data: activityTypes.map(row => row.activity_type),
  };

  res.json(response);
});

export const bulkImportActivities = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const { activities } = req.body;

  if (!Array.isArray(activities) || activities.length === 0) {
    throw new ApiError('Activities array is required', 400);
  }

  // Validate each activity
  const validatedActivities = activities.map(activity => CreateActivitySchema.parse(activity));

  // Verify all accounts belong to user
  const accountIds = [...new Set(validatedActivities.map(a => a.account_id))];
  const userAccounts = await db('accounts')
    .whereIn('id', accountIds)
    .where({ user_id: userId });

  if (userAccounts.length !== accountIds.length) {
    throw new ApiError('One or more accounts do not belong to user', 400);
  }

  // Verify all assets exist
  const assetIds = [...new Set(validatedActivities.map(a => a.asset_id))];
  const existingAssets = await db('assets')
    .whereIn('id', assetIds);

  if (existingAssets.length !== assetIds.length) {
    throw new ApiError('One or more assets do not exist', 400);
  }

  // Insert activities
  const activitiesWithTimestamps = validatedActivities.map(activity => ({
    ...activity,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const insertedActivities = await db('activities')
    .insert(activitiesWithTimestamps)
    .returning('*');

  const response: ApiResponse = {
    success: true,
    data: {
      imported_count: insertedActivities.length,
      activities: insertedActivities,
    },
  };

  res.status(201).json(response);
});