import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/index.js';
import { CreateAccountSchema, UpdateAccountSchema, PaginationQuerySchema, type ApiResponse } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import { transformAccounts, transformAccount } from '../../utils/transformers.js';

export const getAccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { page, per_page } = PaginationQuerySchema.parse(req.query);
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const offset = (page - 1) * per_page;

  const [accounts, [{ count }]] = await Promise.all([
    db('accounts')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(per_page)
      .offset(offset),
    db('accounts')
      .where({ user_id: userId })
      .count('* as count')
  ]);

  const total = parseInt(String(count));
  const total_pages = Math.ceil(total / per_page);

  const response: ApiResponse = {
    success: true,
    data: transformAccounts(accounts),
    pagination: {
      page,
      per_page,
      total,
      total_pages,
    },
  };

  res.json(response);
});

export const getAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const account = await db('accounts')
    .where({ id, user_id: userId })
    .first();

  if (!account) {
    throw new ApiError('Account not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    data: transformAccount(account),
  };

  res.json(response);
});

export const createAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const accountData = CreateAccountSchema.parse(req.body);

  // If this is set as default, update other accounts
  if (accountData.is_default) {
    await db('accounts')
      .where({ user_id: userId })
      .update({ is_default: false });
  }

  const [account] = await db('accounts')
    .insert({
      ...accountData,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .returning('*');

  const response: ApiResponse = {
    success: true,
    data: transformAccount(account),
  };

  res.status(201).json(response);
});

export const updateAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const updateData = UpdateAccountSchema.parse(req.body);

  // Check if account exists and belongs to user
  const existingAccount = await db('accounts')
    .where({ id, user_id: userId })
    .first();

  if (!existingAccount) {
    throw new ApiError('Account not found', 404);
  }

  // If this is set as default, update other accounts
  if (updateData.is_default) {
    await db('accounts')
      .where({ user_id: userId })
      .andWhere('id', '!=', id)
      .update({ is_default: false });
  }

  const [account] = await db('accounts')
    .where({ id, user_id: userId })
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .returning('*');

  const response: ApiResponse = {
    success: true,
    data: transformAccount(account),
  };

  res.json(response);
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  // Check if account exists and belongs to user
  const existingAccount = await db('accounts')
    .where({ id, user_id: userId })
    .first();

  if (!existingAccount) {
    throw new ApiError('Account not found', 404);
  }

  // Check if account has activities
  const activityCount = await db('activities')
    .where({ account_id: id })
    .count('* as count')
    .first();

  if (activityCount && parseInt(String(activityCount.count)) > 0) {
    throw new ApiError('Cannot delete account with existing activities', 400);
  }

  await db('accounts')
    .where({ id, user_id: userId })
    .delete();

  const response: ApiResponse = {
    success: true,
    data: { message: 'Account deleted successfully' },
  };

  res.json(response);
});

export const getAccountSummary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError('User not authenticated', 401);
  }

  const accounts = await db('accounts')
    .where({ user_id: userId, is_active: true })
    .orderBy('created_at', 'desc');

  // Get account balances and activity counts
  const accountsWithSummary = await Promise.all(
    accounts.map(async (account) => {
      const [activityCount, lastActivity] = await Promise.all([
        db('activities')
          .where({ account_id: account.id })
          .count('* as count')
          .first(),
        db('activities')
          .where({ account_id: account.id })
          .orderBy('activity_date', 'desc')
          .first()
      ]);

      return {
        ...account,
        activity_count: parseInt(String(activityCount?.count || '0')),
        last_activity_date: lastActivity?.activity_date || null,
      };
    })
  );

  const response: ApiResponse = {
    success: true,
    data: transformAccounts(accountsWithSummary),
  };

  res.json(response);
});