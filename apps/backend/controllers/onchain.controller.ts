import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
export const getOnchainTransactions = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.skip) || 0;

    const transactions = await prisma.onchainTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    return res.status(200).json({ count: transactions.length, transactions });
  } catch (err) {
    console.error('Error fetching onchain transactions', err);
    return res.status(500).json({ error: 'Server error fetching on-chain transactions' });
  }
};

// GET /api/onchain/transactions/:txHash
export const getOnchainTransactionByHash = async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;
    if (!txHash) return res.status(400).json({ error: 'Missing txHash parameter' });

    const tx = await prisma.onchainTransaction.findUnique({ where: { txHash } as any });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    return res.status(200).json(tx);
  } catch (err) {
    console.error('Error fetching onchain transaction by hash', err);
    return res.status(500).json({ error: 'Server error fetching on-chain transaction' });
  }
};
