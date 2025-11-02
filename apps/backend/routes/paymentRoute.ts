import express from 'express';
import { createPayment, verifyPayment } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();
router.post('/', authenticateToken, createPayment);
router.get('/verify', verifyPayment);

export default router;
