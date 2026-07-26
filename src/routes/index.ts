import express, { Request, Response } from 'express';
import { issueToken } from '../middleware/csrf.middleware';
import emailRoutes from './email.routes';

const router = express.Router();

// Health check, used by monitoring/load balancers.
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// The React app calls this first, then sends the token back in the
// "x-csrf-token" header on POSTs.
router.get('/csrf-token', issueToken);

router.use('/email', emailRoutes);

export default router;
