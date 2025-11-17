import { Request, Response } from 'express';
import * as reputationService from '../src/services/reputation.service';
import prisma from '../prisma/prisma';

/**
 * Get farmer reputation score
 */
export const getFarmerReputation = async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.params;
    const userId = farmerId || (req as any).user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'Farmer ID is required' });
    }

    const farmer = await prisma.user.findUnique({
      where: { id: userId } as any,
      select: {
        id: true,
        name: true,
        phone: true,
        reputationScore: true,
        totalSales: true,
        successfulTransactions: true,
        disputeCount: true,
        walletAddress: true,
      },
    });

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    // Recalculate to ensure accuracy
    const calculatedScore = await reputationService.calculateFarmerReputation(userId);

    return res.status(200).json({
      farmer: {
        ...farmer,
        reputationScore: calculatedScore,
      },
      reputationLevel: getReputationLevel(calculatedScore),
    });
  } catch (error) {
    console.error('Error getting farmer reputation:', error);
    return res.status(500).json({ error: 'Server error getting reputation' });
  }
};

/**
 * Get reputation history
 */
export const getReputationHistory = async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.params;
    const userId = farmerId || (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      return res.status(400).json({ error: 'Farmer ID is required' });
    }

    const history = await reputationService.getReputationHistory(userId, limit);

    return res.status(200).json({
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Error getting reputation history:', error);
    return res.status(500).json({ error: 'Server error getting reputation history' });
  }
};

/**
 * Get top farmers by reputation
 */
export const getTopFarmers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topFarmers = await reputationService.getTopFarmers(limit);

    return res.status(200).json({
      count: topFarmers.length,
      farmers: topFarmers.map(f => ({
        ...f,
        reputationLevel: getReputationLevel(f.reputationScore),
      })),
    });
  } catch (error) {
    console.error('Error getting top farmers:', error);
    return res.status(500).json({ error: 'Server error getting top farmers' });
  }
};

/**
 * Helper function to determine reputation level
 */
function getReputationLevel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 45) return 'Fair';
  if (score >= 30) return 'Needs Improvement';
  return 'Poor';
}

