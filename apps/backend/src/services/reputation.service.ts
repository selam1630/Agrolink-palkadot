import prisma from '../../prisma/prisma';

/**
 * Calculate farmer reputation score based on transaction history
 * Score ranges from 0-100
 */
export async function calculateFarmerReputation(farmerId: string): Promise<number> {
  try {
    const farmer = await prisma.user.findUnique({
      where: { id: farmerId },
      include: {
        products: {
          where: { isSold: true },
        },
      },
    });

    if (!farmer) {
      return 0;
    }

    const totalSales = farmer.totalSales || 0;
    const successfulTransactions = farmer.successfulTransactions || 0;
    const disputeCount = farmer.disputeCount || 0;

    // Get products with escrow status
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { seller: farmer.walletAddress },
          { userId: farmerId },
        ],
        isSold: true,
      },
    });

    // Calculate metrics
    const totalTransactions = products.length;
    const confirmedDeliveries = products.filter(p => p.deliveryConfirmed).length;
    const disputes = products.filter(p => p.disputeRaised).length;
    const releasedEscrows = products.filter(p => p.escrowStatus === 'released' || p.escrowStatus === 'confirmed').length;

    // Base score starts at 50
    let score = 50;

    // Positive factors
    if (totalTransactions > 0) {
      // +30 points for having transactions (scaled)
      score += Math.min(30, (totalTransactions / 10) * 10);
      
      // +20 points for successful deliveries (up to 20)
      const deliveryRate = confirmedDeliveries / totalTransactions;
      score += deliveryRate * 20;
      
      // +10 points for released escrows (trust indicator)
      const escrowReleaseRate = releasedEscrows / totalTransactions;
      score += escrowReleaseRate * 10;
    }

    // Negative factors
    if (totalTransactions > 0) {
      // -30 points for disputes (scaled by dispute rate)
      const disputeRate = disputes / totalTransactions;
      score -= disputeRate * 30;
    }

    // Bonus for high transaction count
    if (totalTransactions >= 10) {
      score += 5;
    }
    if (totalTransactions >= 50) {
      score += 5;
    }
    if (totalTransactions >= 100) {
      score += 5;
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating farmer reputation:', error);
    return 0;
  }
}

/**
 * Update farmer reputation and record history
 */
export async function updateFarmerReputation(
  farmerId: string,
  reason: string,
  transactionId?: string,
  notes?: string
) {
  try {
    const farmer = await prisma.user.findUnique({
      where: { id: farmerId },
    });

    if (!farmer) {
      throw new Error('Farmer not found');
    }

    const previousScore = farmer.reputationScore || 0;
    const newScore = await calculateFarmerReputation(farmerId);

    // Update farmer's reputation
    await prisma.user.update({
      where: { id: farmerId },
      data: {
        reputationScore: newScore,
      },
    });

    // Record reputation history
    await prisma.farmerReputationHistory.create({
      data: {
        farmerId,
        farmerPhone: farmer.phone,
        previousScore,
        newScore,
        changeReason: reason,
        transactionId,
        notes,
      },
    });

    console.log(`✅ Updated reputation for farmer ${farmerId}: ${previousScore} → ${newScore} (${reason})`);
    return newScore;
  } catch (error) {
    console.error('Error updating farmer reputation:', error);
    throw error;
  }
}

/**
 * Get reputation history for a farmer
 */
export async function getReputationHistory(farmerId: string, limit: number = 20) {
  return await prisma.farmerReputationHistory.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get top farmers by reputation
 */
export async function getTopFarmers(limit: number = 10) {
  return await prisma.user.findMany({
    where: {
      role: 'farmer',
      reputationScore: { gt: 0 },
    },
    orderBy: { reputationScore: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      phone: true,
      reputationScore: true,
      totalSales: true,
      successfulTransactions: true,
      walletAddress: true,
    },
  });
}

