import { Router } from 'express';
import { register, login, refresh, logout, me } from '../handlers/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);

export default router;