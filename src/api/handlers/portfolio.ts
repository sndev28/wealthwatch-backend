import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import type { ApiResponse } from '../models/index.js';

// Get portfolio holdings for all accounts
export const getPortfolioHoldings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { account_id } = req.query;

  let query = db('accounts as a')
    .select(
      'a.id as account_id',
      'a.name as account_name',
      'a.currency as account_currency',
      'ast.id as asset_id',
      'ast.symbol',
      'ast.name as asset_name',
      'ast.asset_type',
      'ast.asset_class',
      'ast.currency as asset_currency',
      'ast.sectors',
      'ast.countries',
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) as quantity'),
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) as cost_basis'),
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) / NULLIF(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE 0 END), 0) as avg_price'),
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(latest_quotes.close_price, 0) as market_value'),
      db.raw('(COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(latest_quotes.close_price, 0)) - COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) as unrealized_gain'),
      db.raw('CASE WHEN COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) > 0 THEN ((COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(latest_quotes.close_price, 0)) - COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0)) / COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) * 100 ELSE 0 END as unrealized_gain_percent')
    )
    .leftJoin('activities as act', 'a.id', 'act.account_id')
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
    .where('a.user_id', userId)
    .where('a.is_active', true)
    .groupBy(['a.id', 'ast.id', 'latest_quotes.close_price']);

  if (account_id) {
    query = query.where('a.id', account_id as string);
  }

  const holdings = await query;

  // Group by account
  const groupedHoldings = holdings.reduce((acc, holding) => {
    if (!acc[holding.account_id]) {
      acc[holding.account_id] = {
        account_id: holding.account_id,
        account_name: holding.account_name,
        account_currency: holding.account_currency,
        holdings: []
      };
    }
    
    if (holding.asset_id && holding.quantity > 0) {
      acc[holding.account_id].holdings.push({
        id: holding.asset_id,
        symbol: holding.symbol,
        asset_name: holding.asset_name,
        asset_type: holding.asset_type,
        asset_class: holding.asset_class,
        asset_currency: holding.asset_currency,
        sectors: holding.sectors || [],
        countries: holding.countries || [],
        quantity: holding.quantity,
        cost_basis: holding.cost_basis,
        avg_price: holding.avg_price,
        market_value: holding.market_value,
        unrealized_gain: holding.unrealized_gain,
        unrealized_gain_percent: holding.unrealized_gain_percent
      });
    }
    
    return acc;
  }, {});

  const response: ApiResponse<typeof groupedHoldings> = {
    success: true,
    data: Object.values(groupedHoldings)
  };

  res.json(response);
});

// Get portfolio holdings for specific account
export const getAccountHoldings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { accountId } = req.params;

  // Verify account belongs to user
  const account = await db('accounts')
    .where({ id: accountId, user_id: userId, is_active: true })
    .first();

  if (!account) {
    throw new ApiError('Account not found', 404);
  }

  const holdings = await db('accounts as a')
    .select(
      'ast.id',
      'ast.symbol',
      'ast.name as asset_name',
      'ast.asset_type',
      'ast.asset_class',
      'ast.currency',
      'ast.sectors',
      'ast.countries',
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) as quantity'),
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) as cost_basis'),
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) / NULLIF(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE 0 END), 0) as avg_price'),
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(latest_quotes.close_price, 0) as market_value'),
      db.raw('(COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(latest_quotes.close_price, 0)) - COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) as unrealized_gain'),
      db.raw('CASE WHEN COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) > 0 THEN ((COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(latest_quotes.close_price, 0)) - COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0)) / COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) * 100 ELSE 0 END as unrealized_gain_percent')
    )
    .leftJoin('activities as act', 'a.id', 'act.account_id')
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
    .where('a.id', accountId)
    .groupBy(['ast.id', 'latest_quotes.close_price'])
    .having(db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) > 0'));

  const response: ApiResponse<typeof holdings> = {
    success: true,
    data: holdings
  };

  res.json(response);
});

// Get portfolio performance
export const getPortfolioPerformance = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { start_date, end_date, account_id } = req.query;

  let query = db('daily_account_valuation as dav')
    .select(
      'dav.valuation_date',
      'dav.total_value',
      'dav.cost_basis',
      'dav.net_contribution',
      db.raw('dav.total_value - dav.cost_basis as total_gain'),
      db.raw('CASE WHEN dav.cost_basis > 0 THEN (dav.total_value - dav.cost_basis) / dav.cost_basis * 100 ELSE 0 END as total_gain_percent')
    )
    .join('accounts as a', 'dav.account_id', 'a.id')
    .where('a.user_id', userId)
    .where('a.is_active', true)
    .orderBy('dav.valuation_date', 'asc');

  if (start_date) {
    query = query.where('dav.valuation_date', '>=', start_date as string);
  }

  if (end_date) {
    query = query.where('dav.valuation_date', '<=', end_date as string);
  }

  if (account_id) {
    query = query.where('dav.account_id', account_id as string);
  }

  const performance = await query;

  const response: ApiResponse<typeof performance> = {
    success: true,
    data: performance
  };

  res.json(response);
});

// Get portfolio income
export const getPortfolioIncome = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { start_date, end_date, account_id } = req.query;

  let query = db('activities as act')
    .select(
      'act.activity_date',
      'act.amount',
      'act.currency',
      'a.name as account_name',
      'ast.symbol',
      'ast.name as asset_name'
    )
    .join('accounts as a', 'act.account_id', 'a.id')
    .join('assets as ast', 'act.asset_id', 'ast.id')
    .where('a.user_id', userId)
    .where('a.is_active', true)
    .whereIn('act.activity_type', ['DIVIDEND', 'INTEREST', 'DISTRIBUTION']);

  if (start_date) {
    query = query.where('act.activity_date', '>=', start_date as string);
  }

  if (end_date) {
    query = query.where('act.activity_date', '<=', end_date as string);
  }

  if (account_id) {
    query = query.where('act.account_id', account_id as string);
  }

  const income = await query.orderBy('act.activity_date', 'desc');

  const response: ApiResponse<typeof income> = {
    success: true,
    data: income
  };

  res.json(response);
});

// Get portfolio valuations
export const getPortfolioValuations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { start_date, end_date, account_id } = req.query;

  let query = db('daily_account_valuation as dav')
    .select(
      'dav.valuation_date',
      'dav.account_currency',
      'dav.base_currency',
      'dav.fx_rate_to_base',
      'dav.cash_balance',
      'dav.investment_market_value',
      'dav.total_value',
      'dav.cost_basis',
      'dav.net_contribution',
      'a.name as account_name'
    )
    .join('accounts as a', 'dav.account_id', 'a.id')
    .where('a.user_id', userId)
    .where('a.is_active', true)
    .orderBy('dav.valuation_date', 'desc');

  if (start_date) {
    query = query.where('dav.valuation_date', '>=', start_date as string);
  }

  if (end_date) {
    query = query.where('dav.valuation_date', '<=', end_date as string);
  }

  if (account_id) {
    query = query.where('dav.account_id', account_id as string);
  }

  const valuations = await query;

  const response: ApiResponse<typeof valuations> = {
    success: true,
    data: valuations
  };

  res.json(response);
});

// Recalculate portfolio
export const recalculatePortfolio = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { account_id } = req.body;

  // Get user's accounts
  const accounts = await db('accounts')
    .where({ user_id: userId, is_active: true })
    .modify((queryBuilder) => {
      if (account_id) {
        queryBuilder.where('id', account_id);
      }
    });

  if (accounts.length === 0) {
    throw new ApiError('No accounts found', 404);
  }

  const recalculationResults = [];

  for (const account of accounts) {
    // Calculate current holdings
    const holdings = await db('activities as act')
      .select(
        'ast.symbol',
        db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) as quantity'),
        db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) as cost_basis'),
        db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) / NULLIF(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE 0 END), 0) as avg_price')
      )
      .join('assets as ast', 'act.asset_id', 'ast.id')
      .where('act.account_id', account.id)
      .groupBy('ast.symbol')
      .having(db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) > 0'));

    // Get latest quotes
    const symbols = holdings.map(h => h.symbol);
    const quotes = await db('quotes')
      .select('symbol', 'close_price')
      .whereIn('symbol', symbols)
      .whereIn('id', 
        db('quotes')
          .select(db.raw('MAX(id)'))
          .whereIn('symbol', symbols)
          .groupBy('symbol')
      );

    const quoteMap = quotes.reduce((acc, quote) => {
      acc[quote.symbol] = quote.close_price;
      return acc;
    }, {});

    // Calculate total values
    let totalCostBasis = 0;
    let totalMarketValue = 0;

    for (const holding of holdings) {
      totalCostBasis += holding.cost_basis;
      totalMarketValue += holding.quantity * (quoteMap[holding.symbol] || 0);
    }

    // Create or update daily valuation
    const today = new Date().toISOString().split('T')[0];
    
    await db('daily_account_valuation')
      .insert({
        account_id: account.id,
        valuation_date: today,
        account_currency: account.currency,
        base_currency: account.currency,
        fx_rate_to_base: 1,
        cash_balance: 0, // Would need to calculate from activities
        investment_market_value: totalMarketValue,
        total_value: totalMarketValue,
        cost_basis: totalCostBasis,
        net_contribution: totalCostBasis, // Simplified
        calculated_at: new Date().toISOString()
      })
      .onConflict(['account_id', 'valuation_date'])
      .merge();

    recalculationResults.push({
      account_id: account.id,
      account_name: account.name,
      total_cost_basis: totalCostBasis,
      total_market_value: totalMarketValue,
      total_gain: totalMarketValue - totalCostBasis,
      total_gain_percent: totalCostBasis > 0 ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100 : 0
    });
  }

  const response: ApiResponse<typeof recalculationResults> = {
    success: true,
    data: recalculationResults
  };

  res.json(response);
}); 

// Get portfolio summary
export const getPortfolioSummary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const { account_id } = req.query;

  let query = db('accounts as a')
    .select(
      'a.currency',
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity * act.unit_price ELSE 0 END), 0) as total_cost'),
      db.raw('COALESCE(SUM(CASE WHEN act.activity_type = \'BUY\' THEN act.quantity ELSE -act.quantity END), 0) * COALESCE(latest_quotes.close_price, 0) as total_value')
    )
    .leftJoin('activities as act', 'a.id', 'act.account_id')
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
    .where('a.user_id', userId)
    .where('a.is_active', true)
    .groupBy('a.currency');

  if (account_id) {
    query = query.where('a.id', account_id as string);
  }

  const summary = await query;

  // Calculate totals across all currencies (simplified - assumes base currency)
  let totalValue = 0;
  let totalCost = 0;
  let baseCurrency = 'USD'; // Default currency

  for (const row of summary) {
    totalValue += row.total_value || 0;
    totalCost += row.total_cost || 0;
    baseCurrency = row.currency || baseCurrency;
  }

  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const portfolioSummary = {
    total_value: totalValue,
    total_cost: totalCost,
    total_gain: totalGain,
    total_gain_percent: totalGainPercent,
    currency: baseCurrency
  };

  const response: ApiResponse<typeof portfolioSummary> = {
    success: true,
    data: portfolioSummary
  };

  res.json(response);
}); 