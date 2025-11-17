import { Router } from 'express';
import {
  getEscrowStatus,
  confirmDelivery,
  releaseEscrow,
  raiseDispute,
  resolveDispute,
  getActiveEscrows
} from '../controllers/escrow.controller';
import { authenticateToken, protect } from '../middlewares/auth.middleware';

const router = Router();

// Get escrow status for a product
router.get('/status/:productId', authenticateToken, getEscrowStatus);

// Get all active escrows
router.get('/active', authenticateToken, getActiveEscrows);

// Confirm delivery (buyer only)
router.post('/confirm-delivery/:productId', authenticateToken, confirmDelivery);

// Release escrow (after time period)
router.post('/release/:productId', authenticateToken, releaseEscrow);

// Raise dispute (buyer or seller)
router.post('/dispute/:productId', authenticateToken, raiseDispute);

// Resolve dispute (admin only)
router.post('/resolve/:productId', authenticateToken, protect(['admin', 'superAdmin']), resolveDispute);

export default router;

