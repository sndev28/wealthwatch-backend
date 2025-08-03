import { Router } from 'express';
import { 
  getActivities, 
  getActivity, 
  createActivity, 
  updateActivity, 
  deleteActivity, 
  getActivityTypes,
  bulkImportActivities 
} from '../handlers/activities.js';

const router = Router();

// Activity routes
router.get('/', getActivities);
router.get('/types', getActivityTypes);
router.get('/:id', getActivity);
router.post('/', createActivity);
router.post('/import', bulkImportActivities);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;