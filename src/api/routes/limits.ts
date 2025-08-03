import { Router } from 'express';
import {
  getContributionLimits,
  getContributionLimit,
  createContributionLimit,
  updateContributionLimit,
  deleteContributionLimit,
  getContributionDeposits,
  getContributionLimitsSummary,
  getAccountGroups,
  getAccountsByGroup
} from '../handlers/limits.js';

const router = Router();

// Contribution limits CRUD
router.get('/', getContributionLimits);
router.get('/summary', getContributionLimitsSummary);
router.post('/', createContributionLimit);
router.get('/:id', getContributionLimit);
router.put('/:id', updateContributionLimit);
router.delete('/:id', deleteContributionLimit);

// Contribution deposits
router.get('/:id/deposits', getContributionDeposits);

// Account groups
router.get('/groups', getAccountGroups);
router.get('/groups/:group_name/accounts', getAccountsByGroup);

export default router; 