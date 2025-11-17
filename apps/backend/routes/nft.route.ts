import { Router } from 'express';
import {
  getProductCertificate,
  getUserCertificates,
  generateCertificate,
} from '../controllers/nft.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Get NFT certificate for a product
router.get('/product/:productId', authenticateToken, getProductCertificate);

// Get all certificates for authenticated user
router.get('/user/certificates', authenticateToken, getUserCertificates);

// Generate certificate for a product
router.post('/generate/:productId', authenticateToken, generateCertificate);

export default router;

