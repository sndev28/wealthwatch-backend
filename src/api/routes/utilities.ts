import { Router } from 'express';
import {
  createBackup,
  restoreBackup,
  exportUserData,
  getSystemHealth,
  getDatabaseStats
} from '../handlers/utilities.js';

const router = Router();

// Backup and restore
router.post('/backup', createBackup);
router.post('/restore', restoreBackup);

// Data export
router.get('/export', exportUserData);

// System utilities
router.get('/health', getSystemHealth);
router.get('/stats', getDatabaseStats);

export default router; 