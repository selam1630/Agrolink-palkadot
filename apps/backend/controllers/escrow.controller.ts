import { Request, Response } from 'express';
import { ethers } from 'ethers';
import prisma from '../prisma/prisma';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = process.env.BLOCKCHAIN_PROVIDER_URL || '';
const CONTRACT_ADDRESS = process.env.MARKETPLACE_CONTRACT_ADDRESS || '';

// Load ABI
const ABI: any = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../contracts/abi/Marketplace.json'), 'utf8')
);

/**
 * Get escrow status for a product
 */
export const getEscrowStatus = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId } as any
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If product has onchainId, fetch latest status from blockchain
    if (product.onchainId && RPC_URL && CONTRACT_ADDRESS) {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        const onchainData = await contract.getProduct(product.onchainId);
        
        return res.status(200).json({
          productId: product.id,
          onchainId: product.onchainId,
          escrowStatus: product.escrowStatus || 'pending',
          deliveryConfirmed: onchainData.deliveryConfirmed || product.deliveryConfirmed,
          disputeRaised: onchainData.disputeRaised || product.disputeRaised,
          escrowReleaseTime: product.escrowReleaseTime,
          buyer: onchainData.buyer || product.buyer,
          seller: onchainData.seller || product.seller,
          price: product.price,
          onchainPrice: product.onchainPrice,
          canConfirmDelivery: onchainData.buyer && onchainData.buyer.toLowerCase() === (req as any).user?.walletAddress?.toLowerCase(),
          canReleaseEscrow: onchainData.escrowReleaseTime && 
            Number(onchainData.escrowReleaseTime) * 1000 <= Date.now() &&
            !onchainData.disputeRaised &&
            !onchainData.deliveryConfirmed,
          canRaiseDispute: onchainData.sold && 
            !onchainData.disputeRaised && 
            !onchainData.deliveryConfirmed &&
            ((onchainData.buyer && onchainData.buyer.toLowerCase() === (req as any).user?.walletAddress?.toLowerCase()) ||
             (onchainData.seller && onchainData.seller.toLowerCase() === (req as any).user?.walletAddress?.toLowerCase()))
        });
      } catch (blockchainErr) {
        console.error('Error fetching from blockchain:', blockchainErr);
        // Fallback to database data
      }
    }

    // Return database data
    return res.status(200).json({
      productId: product.id,
      escrowStatus: product.escrowStatus || 'pending',
      deliveryConfirmed: product.deliveryConfirmed,
      disputeRaised: product.disputeRaised,
      escrowReleaseTime: product.escrowReleaseTime,
      buyer: product.buyer,
      seller: product.seller,
      price: product.price
    });
  } catch (err) {
    console.error('Error getting escrow status', err);
    return res.status(500).json({ error: 'Server error getting escrow status' });
  }
};

/**
 * Confirm delivery (buyer only)
 * This will trigger a blockchain transaction
 */
export const confirmDelivery = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const user = (req as any).user;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Blockchain not configured' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId } as any
    });

    if (!product || !product.onchainId) {
      return res.status(404).json({ error: 'Product not found or not on-chain' });
    }

    // Verify user is the buyer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const onchainData = await contract.getProduct(product.onchainId);

    if (!onchainData.buyer || onchainData.buyer.toLowerCase() !== user.walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Only the buyer can confirm delivery' });
    }

    // Return transaction data for frontend to sign
    return res.status(200).json({
      message: 'Please sign the transaction in your wallet',
      contractAddress: CONTRACT_ADDRESS,
      functionName: 'confirmDelivery',
      params: [product.onchainId],
      productId: product.id,
      onchainId: product.onchainId
    });
  } catch (err) {
    console.error('Error confirming delivery', err);
    return res.status(500).json({ error: 'Server error confirming delivery' });
  }
};

/**
 * Release escrow (after time period)
 */
export const releaseEscrow = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Blockchain not configured' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId } as any
    });

    if (!product || !product.onchainId) {
      return res.status(404).json({ error: 'Product not found or not on-chain' });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const onchainData = await contract.getProduct(product.onchainId);

    // Check if escrow can be released
    const releaseTime = Number(onchainData.escrowReleaseTime) * 1000;
    if (releaseTime > Date.now()) {
      return res.status(400).json({ 
        error: 'Escrow period not ended yet',
        releaseTime: new Date(releaseTime).toISOString()
      });
    }

    if (onchainData.disputeRaised) {
      return res.status(400).json({ error: 'Cannot release escrow while dispute is active' });
    }

    // Return transaction data for frontend to sign
    return res.status(200).json({
      message: 'Please sign the transaction in your wallet',
      contractAddress: CONTRACT_ADDRESS,
      functionName: 'releaseEscrow',
      params: [product.onchainId],
      productId: product.id,
      onchainId: product.onchainId
    });
  } catch (err) {
    console.error('Error releasing escrow', err);
    return res.status(500).json({ error: 'Server error releasing escrow' });
  }
};

/**
 * Raise a dispute (buyer or seller)
 */
export const raiseDispute = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Blockchain not configured' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId } as any
    });

    if (!product || !product.onchainId) {
      return res.status(404).json({ error: 'Product not found or not on-chain' });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const onchainData = await contract.getProduct(product.onchainId);

    // Verify user is buyer or seller
    const isBuyer = onchainData.buyer && onchainData.buyer.toLowerCase() === user.walletAddress?.toLowerCase();
    const isSeller = onchainData.seller && onchainData.seller.toLowerCase() === user.walletAddress?.toLowerCase();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Only buyer or seller can raise dispute' });
    }

    if (onchainData.disputeRaised) {
      return res.status(400).json({ error: 'Dispute already raised' });
    }

    if (onchainData.deliveryConfirmed) {
      return res.status(400).json({ error: 'Cannot raise dispute after delivery confirmed' });
    }

    // Store dispute reason in database (optional)
    if (reason) {
      // You could create a Dispute model to store reasons
      console.log(`Dispute reason for product ${productId}: ${reason}`);
    }

    // Return transaction data for frontend to sign
    return res.status(200).json({
      message: 'Please sign the transaction in your wallet',
      contractAddress: CONTRACT_ADDRESS,
      functionName: 'raiseDispute',
      params: [product.onchainId],
      productId: product.id,
      onchainId: product.onchainId,
      reason: reason
    });
  } catch (err) {
    console.error('Error raising dispute', err);
    return res.status(500).json({ error: 'Server error raising dispute' });
  }
};

/**
 * Resolve dispute (admin only)
 */
export const resolveDispute = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { favorBuyer } = req.body;
    const user = (req as any).user;

    // Check if user is admin (you'll need to implement this check based on your auth system)
    if (user.role !== 'admin' && user.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Only admin can resolve disputes' });
    }

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (typeof favorBuyer !== 'boolean') {
      return res.status(400).json({ error: 'favorBuyer must be a boolean' });
    }

    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Blockchain not configured' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId } as any
    });

    if (!product || !product.onchainId) {
      return res.status(404).json({ error: 'Product not found or not on-chain' });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const onchainData = await contract.getProduct(product.onchainId);

    if (!onchainData.disputeRaised) {
      return res.status(400).json({ error: 'No active dispute' });
    }

    // Return transaction data for admin to sign
    return res.status(200).json({
      message: 'Please sign the transaction in your wallet',
      contractAddress: CONTRACT_ADDRESS,
      functionName: 'resolveDispute',
      params: [product.onchainId, favorBuyer],
      productId: product.id,
      onchainId: product.onchainId,
      favorBuyer: favorBuyer
    });
  } catch (err) {
    console.error('Error resolving dispute', err);
    return res.status(500).json({ error: 'Server error resolving dispute' });
  }
};

/**
 * Get all products with active escrow
 */
export const getActiveEscrows = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    // Build base where clause - include all sold products that have onchainId (blockchain transactions)
    // These are the products that use escrow
    let whereClause: any = {
      isSold: true,
      onchainId: { not: null }
    };

    // Filter by escrow status if provided and not 'all'
    if (status && status !== 'all' && typeof status === 'string') {
      whereClause.escrowStatus = status;
    }

    // If not admin, only show user's products (buyer or seller)
    if (user.role !== 'admin' && user.role !== 'superAdmin' && user.walletAddress) {
      // Use AND to combine the existing conditions with the user filter
      whereClause = {
        ...whereClause,
        AND: [
          {
            OR: [
              { buyer: user.walletAddress },
              { seller: user.walletAddress }
            ]
          }
        ]
      };
    }

    const products = await prisma.product.findMany({
      where: whereClause as any,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.status(200).json({
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        onchainId: p.onchainId,
        escrowStatus: p.escrowStatus || 'pending',
        deliveryConfirmed: p.deliveryConfirmed || false,
        disputeRaised: p.disputeRaised || false,
        escrowReleaseTime: p.escrowReleaseTime,
        buyer: p.buyer,
        seller: p.seller,
        price: p.price,
        onchainPrice: p.onchainPrice
      }))
    });
  } catch (err) {
    console.error('Error getting active escrows', err);
    return res.status(500).json({ error: 'Server error getting active escrows' });
  }
};

