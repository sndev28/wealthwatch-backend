import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { UpdateAssetSchema, PaginationQuerySchema, type ApiResponse } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';

export const getAssets = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { page, per_page } = PaginationQuerySchema.parse(req.query);
  const { search, asset_type, data_source } = req.query;

  const offset = (page - 1) * per_page;

  let query = db('assets');

  // Apply filters
  if (search) {
    query = query.where(function() {
      this.where('symbol', 'like', `%${search}%`)
        .orWhere('name', 'like', `%${search}%`)
        .orWhere('isin', 'like', `%${search}%`);
    });
  }
  if (asset_type) {
    query = query.where('asset_type', asset_type);
  }
  if (data_source) {
    query = query.where('data_source', data_source);
  }

  const [assets, [{ count }]] = await Promise.all([
    query.clone()
      .orderBy('symbol', 'asc')
      .limit(per_page)
      .offset(offset),
    query.clone().count('* as count')
  ]);

  const total = parseInt(String(count));
  const total_pages = Math.ceil(total / per_page);

  const response: ApiResponse = {
    success: true,
    data: assets,
    pagination: {
      page,
      per_page,
      total,
      total_pages,
    },
  };

  res.json(response);
});

export const getAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const asset = await db('assets')
    .where({ id })
    .first();

  if (!asset) {
    throw new ApiError('Asset not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: asset,
  };

  res.json(response);
});

export const updateAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updateData = UpdateAssetSchema.parse(req.body);

  // Check if asset exists
  const existingAsset = await db('assets')
    .where({ id })
    .first();

  if (!existingAsset) {
    throw new ApiError('Asset not found', 404);
  }

  const [asset] = await db('assets')
    .where({ id })
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .returning('*');

  const response: ApiResponse = {
    success: true,
    data: asset,
  };

  res.json(response);
});

export const updateAssetDataSource = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { data_source } = req.body;

  if (!data_source) {
    throw new ApiError('Data source is required', 400);
  }

  // Check if asset exists
  const existingAsset = await db('assets')
    .where({ id })
    .first();

  if (!existingAsset) {
    throw new ApiError('Asset not found', 404);
  }

  const [asset] = await db('assets')
    .where({ id })
    .update({
      data_source,
      updated_at: new Date().toISOString(),
    })
    .returning('*');

  const response: ApiResponse = {
    success: true,
    data: asset,
  };

  res.json(response);
});

export const searchAssets = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { q, limit = 10 } = req.query;

  if (!q) {
    throw new ApiError('Search query is required', 400);
  }

  const searchLimit = Math.min(parseInt(limit as string) || 10, 50);

  const assets = await db('assets')
    .where(function() {
      this.where('symbol', 'like', `%${q}%`)
        .orWhere('name', 'like', `%${q}%`)
        .orWhere('isin', 'like', `%${q}%`);
    })
    .orderBy('symbol', 'asc')
    .limit(searchLimit);

  const response: ApiResponse = {
    success: true,
    data: assets,
  };

  res.json(response);
});

export const getAssetTypes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const assetTypes = await db('assets')
    .distinct('asset_type')
    .whereNotNull('asset_type')
    .orderBy('asset_type');

  const response: ApiResponse = {
    success: true,
    data: assetTypes.map(row => row.asset_type),
  };

  res.json(response);
});

export const getDataSources = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const dataSources = await db('assets')
    .distinct('data_source')
    .orderBy('data_source');

  const response: ApiResponse = {
    success: true,
    data: dataSources.map(row => row.data_source),
  };

  res.json(response);
});

export const getAssetHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { start_date, end_date } = req.query;

  // Check if asset exists
  const asset = await db('assets')
    .where({ id })
    .first();

  if (!asset) {
    throw new ApiError('Asset not found', 404);
  }

  let query = db('quotes')
    .where('symbol', asset.symbol)
    .orderBy('timestamp', 'desc');

  if (start_date) {
    query = query.where('timestamp', '>=', start_date);
  }
  if (end_date) {
    query = query.where('timestamp', '<=', end_date);
  }

  const quotes = await query.limit(1000); // Limit to prevent large responses

  const response: ApiResponse = {
    success: true,
    data: quotes,
  };

  res.json(response);
});

export const getAssetActivities = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  // Check if asset exists
  const asset = await db('assets')
    .where({ id })
    .first();

  if (!asset) {
    throw new ApiError('Asset not found', 404);
  }

  const activities = await db('activities')
    .join('accounts', 'activities.account_id', 'accounts.id')
    .where('activities.asset_id', id)
    .where('accounts.user_id', userId)
    .select(
      'activities.*',
      'accounts.name as account_name'
    )
    .orderBy('activities.activity_date', 'desc');

  const response: ApiResponse = {
    success: true,
    data: activities,
  };

  res.json(response);
});