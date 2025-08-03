import { Router } from 'express';
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalAllocations,
  getGoalProgress,
  getGoalsProgressSummary
} from '../handlers/goals.js';

const router = Router();

// Goals CRUD
router.get('/', getGoals);
router.get('/summary', getGoalsProgressSummary);
router.post('/', createGoal);
router.get('/:id', getGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

// Goal allocations
router.put('/:id/allocations', updateGoalAllocations);

// Goal progress
router.get('/:id/progress', getGoalProgress);

export default router;