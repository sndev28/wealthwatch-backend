import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import authRoutes from './auth.js';
import accountRoutes from './accounts.js';
import activityRoutes from './activities.js';
import assetRoutes from './assets.js';
import portfolioRoutes from './portfolio.js';
import goalRoutes from './goals.js';
import marketDataRoutes from './market-data.js';
import settingsRoutes from './settings.js';
import limitsRoutes from './limits.js';
import utilitiesRoutes from './utilities.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Authentication routes (no auth required)
router.use('/auth', authRoutes);

// Protected routes
router.use('/accounts', authMiddleware, accountRoutes);
router.use('/activities', authMiddleware, activityRoutes);
router.use('/assets', authMiddleware, assetRoutes);
router.use('/portfolio', authMiddleware, portfolioRoutes);
router.use('/goals', authMiddleware, goalRoutes);
router.use('/market-data', authMiddleware, marketDataRoutes);
router.use('/settings', authMiddleware, settingsRoutes);
router.use('/limits', authMiddleware, limitsRoutes);
router.use('/utilities', authMiddleware, utilitiesRoutes);

export { router as apiRoutes };