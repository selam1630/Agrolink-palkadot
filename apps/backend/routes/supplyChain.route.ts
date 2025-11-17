import { Router } from 'express';
import {
  getSupplyChainTrace,
  initializeSupplyChainTrace,
  updateSupplyChainStage,
  addSensorReading,
  verifyOnChain,
  getAllSupplyChainTraces,
  simulateTrackingUpdate
} from '../controllers/supplyChain.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Get supply chain trace for a product
router.get('/trace/:productId', authenticateToken, getSupplyChainTrace);

// Get all supply chain traces
router.get('/traces', authenticateToken, getAllSupplyChainTraces);

// Initialize supply chain trace (called when product is sold)
router.post('/initialize', authenticateToken, initializeSupplyChainTrace);

// Update supply chain stage
router.post('/update-stage/:productId', authenticateToken, updateSupplyChainStage);

// Add sensor reading (temperature/humidity)
router.post('/sensor-reading/:productId', authenticateToken, addSensorReading);

// Verify on chain (Polkadot cross-chain feature)
router.post('/verify-chain/:productId', authenticateToken, verifyOnChain);

// Simulate tracking update (for demo)
router.post('/simulate-update/:productId', authenticateToken, simulateTrackingUpdate);

export default router;

