import { Router } from 'express';
import {
  getPortfolioHoldings,
  getAccountHoldings,
  getPortfolioPerformance,
  getPortfolioIncome,
  getPortfolioValuations,
  getPortfolioSummary,
  recalculatePortfolio
} from '../handlers/portfolio.js';

const router = Router();

// Portfolio summary
router.get('/summary', getPortfolioSummary);

// Portfolio holdings
router.get('/holdings', getPortfolioHoldings);
router.get('/holdings/:accountId', getAccountHoldings);

// Portfolio performance
router.get('/performance', getPortfolioPerformance);

// Portfolio income
router.get('/income', getPortfolioIncome);

// Portfolio valuations
router.get('/valuations', getPortfolioValuations);

// Recalculate portfolio
router.post('/recalculate', recalculatePortfolio);

export default router;