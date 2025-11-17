import { Router } from 'express';
import {
  getFarmerReputation,
  getReputationHistory,
  getTopFarmers,
} from '../controllers/reputation.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Get farmer reputation (current user or specific farmer when param provided)
router.get('/farmer', authenticateToken, getFarmerReputation);
router.get('/farmer/:farmerId', authenticateToken, getFarmerReputation);

// Get reputation history
router.get('/history', authenticateToken, getReputationHistory);
router.get('/history/:farmerId', authenticateToken, getReputationHistory);

// Get top farmers
router.get('/top', authenticateToken, getTopFarmers);

export default router;

