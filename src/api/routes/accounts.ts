import { Router } from 'express';
import { 
  getAccounts, 
  getAccount, 
  createAccount, 
  updateAccount, 
  deleteAccount, 
  getAccountSummary 
} from '../handlers/accounts.js';

const router = Router();

// Account routes
router.get('/', getAccounts);
router.get('/summary', getAccountSummary);
router.get('/:id', getAccount);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;