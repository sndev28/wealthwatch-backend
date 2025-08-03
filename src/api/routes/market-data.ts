import { Router } from 'express';
import {
  searchSymbol,
  syncMarketData,
  updateQuote,
  deleteQuote,
  getQuoteHistory,
  getMarketDataProviders,
  getLatestQuotes,
  getHistoricalQuotes
} from '../handlers/market-data.js';

const router = Router();

// Search symbols
router.get('/search', searchSymbol);

// Sync market data
router.post('/sync', syncMarketData);

// Quote management
router.put('/quotes/:id', updateQuote);
router.delete('/quotes/:id', deleteQuote);
router.get('/quotes/:symbol/history', getQuoteHistory);

// Get market data providers
router.get('/providers', getMarketDataProviders);

// Get latest quotes
router.get('/quotes/latest', getLatestQuotes);

// Get historical quotes
router.get('/quotes/historical', getHistoricalQuotes);

export default router;