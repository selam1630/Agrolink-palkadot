import { Request, Response } from 'express';
import * as nftService from '../src/services/nftCertificate.service';
import prisma from '../prisma/prisma';

/**
 * Get NFT certificate for a product
 */
export const getProductCertificate = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const certificate = await nftService.getNFTCertificate(productId);

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    return res.status(200).json(certificate);
  } catch (error) {
    console.error('Error getting product certificate:', error);
    return res.status(500).json({ error: 'Server error getting certificate' });
  }
};

/**
 * Get all NFT certificates for the authenticated user
 */
export const getUserCertificates = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const certificates = await nftService.getUserCertificates(userId);

    return res.status(200).json({
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error('Error getting user certificates:', error);
    return res.status(500).json({ error: 'Server error getting certificates' });
  }
};

/**
 * Generate NFT certificate for a product (admin or when product is sold)
 */
export const generateCertificate = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const user = (req as any).user;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists and is sold
    const product = await prisma.product.findUnique({
      where: { id: productId } as any,
      include: { user: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if certificate already exists
    const existing = await nftService.getNFTCertificate(productId);
    if (existing) {
      return res.status(400).json({ error: 'Certificate already exists', certificate: existing });
    }

    // Only allow if product is sold or user is admin
    if (!product.isSold && user.role !== 'admin' && user.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Can only generate certificate for sold products' });
    }

    // Determine owner (buyer if sold, otherwise seller)
    const ownerAddress = product.buyer ?? product.seller ?? user.walletAddress ?? undefined;
    const ownerId = product.buyer ? undefined : (product.userId ?? user.id);

    const productName = product.name ?? 'Unknown Product';

    const certificate = await nftService.createNFTCertificate({
      productId,
      productName,
      farmerName: product.farmerName ?? product.user?.name ?? undefined,
      farmerAddress: product.seller ?? undefined,
      region: undefined, // Could be added to product model
      qualityGrade: 'A', // Could be determined by product attributes
      organicCertified: false, // Could be added to product model
      harvestDate: product.createdAt ? new Date(product.createdAt) : undefined,
      transactionHash: product.onchainTxHash ?? undefined,
      imageUrl: product.imageUrl ?? undefined,
      ownerAddress: ownerAddress ?? undefined,
      ownerId: ownerId ?? undefined,
    });

    return res.status(201).json({
      message: 'Certificate generated successfully',
      certificate,
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return res.status(500).json({ error: 'Server error generating certificate' });
  }
};

