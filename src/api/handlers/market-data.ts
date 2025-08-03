import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import type { ApiResponse } from '../models/index.js';

// Search for symbols
export const searchSymbol = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    throw new ApiError('Query parameter is required', 400);
  }

  // Search in assets table
  const symbols = await db('assets')
    .select('symbol', 'name', 'asset_type', 'currency', 'data_source')
    .where('symbol', 'like', `%${query}%`)
    .orWhere('name', 'like', `%${query}%`)
    .limit(20);

  // Mock additional results from external providers
  const mockResults = [
    {
      symbol: query.toUpperCase(),
      name: `${query.toUpperCase()} Stock`,
      asset_type: 'STOCK',
      currency: 'USD',
      data_source: 'YAHOO'
    }
  ];

  const results = [...symbols, ...mockResults];

  const response: ApiResponse<typeof results> = {
    success: true,
    data: results
  };

  res.json(response);
});

// Sync market data
export const syncMarketData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { symbols, refetch_all = false } = req.body;

  // Get all assets that need market data
  let assetsQuery = db('assets')
    .select('symbol', 'currency', 'data_source')
    .where('asset_type', '!=', 'CASH');

  if (symbols && Array.isArray(symbols) && symbols.length > 0) {
    assetsQuery = assetsQuery.whereIn('symbol', symbols);
  }

  const assets = await assetsQuery;

  // Mock market data sync process
  const syncResults = [];
  const errors = [];

  for (const asset of assets) {
    try {
      // Mock quote data
      const mockQuote = {
        symbol: asset.symbol,
        timestamp: new Date().toISOString(),
        open_price: Math.random() * 100 + 10,
        high_price: Math.random() * 100 + 10,
        low_price: Math.random() * 100 + 10,
        close_price: Math.random() * 100 + 10,
        adj_close_price: Math.random() * 100 + 10,
        volume: Math.floor(Math.random() * 1000000),
        currency: asset.currency,
        data_source: asset.data_source,
        created_at: new Date().toISOString()
      };

      // Save or update quote
      await db('quotes')
        .insert(mockQuote)
        .onConflict(['symbol', 'timestamp', 'data_source'])
        .merge();

      syncResults.push({
        symbol: asset.symbol,
        status: 'success',
        message: 'Quote updated successfully'
      });
    } catch (error) {
      errors.push({
        symbol: asset.symbol,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const response: ApiResponse<{
    synced: typeof syncResults;
    errors: typeof errors;
    total_processed: number;
  }> = {
    success: true,
    data: {
      synced: syncResults,
      errors,
      total_processed: assets.length
    }
  };

  res.json(response);
});

// Update quote
export const updateQuote = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const quoteData = req.body;

  // Verify quote exists
  const existingQuote = await db('quotes').where({ id }).first();
  if (!existingQuote) {
    throw new ApiError('Quote not found', 404);
  }

  // Update quote
  const [updatedQuote] = await db('quotes')
    .where({ id })
    .update({
      ...quoteData,
      updated_at: new Date().toISOString()
    })
    .returning('*');

  const response: ApiResponse<typeof updatedQuote> = {
    success: true,
    data: updatedQuote
  };

  res.json(response);
});

// Delete quote
export const deleteQuote = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Verify quote exists
  const existingQuote = await db('quotes').where({ id }).first();
  if (!existingQuote) {
    throw new ApiError('Quote not found', 404);
  }

  // Delete quote
  await db('quotes').where({ id }).del();

  const response: ApiResponse<null> = {
    success: true,
    data: null
  };

  res.json(response);
});

// Get quote history
export const getQuoteHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { symbol } = req.params;
  const { start_date, end_date } = req.query;

  let query = db('quotes')
    .where({ symbol })
    .orderBy('timestamp', 'desc');

  if (start_date) {
    query = query.where('timestamp', '>=', start_date as string);
  }

  if (end_date) {
    query = query.where('timestamp', '<=', end_date as string);
  }

  const quotes = await query.limit(1000);

  const response: ApiResponse<typeof quotes> = {
    success: true,
    data: quotes
  };

  res.json(response);
});

// Get market data providers
export const getMarketDataProviders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const providers = [
    {
      id: 'yahoo',
      name: 'Yahoo Finance',
      description: 'Free market data provider with comprehensive coverage',
      url: 'https://finance.yahoo.com',
      is_active: true,
      supports_search: true,
      supports_historical: true,
      supports_realtime: false,
      rate_limit: '1000 requests per hour',
      data_sources: ['STOCKS', 'ETFS', 'MUTUAL_FUNDS', 'CRYPTO', 'FOREX']
    },
    {
      id: 'manual',
      name: 'Manual Entry',
      description: 'Manual quote entry for custom assets',
      url: null,
      is_active: true,
      supports_search: false,
      supports_historical: false,
      supports_realtime: false,
      rate_limit: 'Unlimited',
      data_sources: ['CUSTOM']
    },
    {
      id: 'alpha_vantage',
      name: 'Alpha Vantage',
      description: 'Professional market data API',
      url: 'https://www.alphavantage.co',
      is_active: false,
      supports_search: true,
      supports_historical: true,
      supports_realtime: true,
      rate_limit: '500 requests per day (free)',
      data_sources: ['STOCKS', 'ETFS', 'FOREX', 'CRYPTO']
    }
  ];

  const response: ApiResponse<typeof providers> = {
    success: true,
    data: providers
  };

  res.json(response);
});

// Get latest quotes for symbols
export const getLatestQuotes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { symbols } = req.query;

  if (!symbols || !Array.isArray(symbols)) {
    throw new ApiError('Symbols parameter is required and must be an array', 400);
  }

  const quotes = await db('quotes')
    .select('*')
    .whereIn('symbol', symbols)
    .whereIn('id', 
      db('quotes')
        .select(db.raw('MAX(id)'))
        .whereIn('symbol', symbols)
        .groupBy('symbol')
    );

  const response: ApiResponse<typeof quotes> = {
    success: true,
    data: quotes
  };

  res.json(response);
});

// Get historical quotes for symbols in range
export const getHistoricalQuotes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { symbols, start_date, end_date } = req.query;

  if (!symbols || !Array.isArray(symbols)) {
    throw new ApiError('Symbols parameter is required and must be an array', 400);
  }

  if (!start_date || !end_date) {
    throw new ApiError('Start date and end date are required', 400);
  }

  const quotes = await db('quotes')
    .select('*')
    .whereIn('symbol', symbols)
    .where('timestamp', '>=', start_date as string)
    .where('timestamp', '<=', end_date as string)
    .orderBy(['symbol', 'timestamp']);

  const response: ApiResponse<typeof quotes> = {
    success: true,
    data: quotes
  };

  res.json(response);
}); 