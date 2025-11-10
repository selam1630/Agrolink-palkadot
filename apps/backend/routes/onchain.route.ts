import { Router } from 'express';
import { getOnchainTransactions, getOnchainTransactionByHash } from '../controllers/onchain.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// admin-only: list transactions
router.get('/', protect(['admin']), getOnchainTransactions);

// admin-only: get a specific transaction by txHash
router.get('/:txHash', protect(['admin']), getOnchainTransactionByHash);

export default router;
