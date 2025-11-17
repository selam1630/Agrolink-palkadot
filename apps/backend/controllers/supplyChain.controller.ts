import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * Get supply chain trace for a product
 */
export const getSupplyChainTrace = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const trace = await prisma.supplyChainTrace.findUnique({
      where: { productId } as any,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            onchainId: true,
            farmerName: true,
            farmerPhone: true,
            buyer: true,
            seller: true,
          }
        },
        events: {
          orderBy: { createdAt: 'asc' }
        },
        readings: {
          orderBy: { timestamp: 'asc' },
          take: 100 // Limit to recent readings
        }
      }
    });

    if (!trace) {
      return res.status(404).json({ error: 'Supply chain trace not found for this product' });
    }

    return res.status(200).json(trace);
  } catch (err) {
    console.error('Error getting supply chain trace', err);
    return res.status(500).json({ error: 'Server error getting supply chain trace' });
  }
};

/**
 * Initialize supply chain trace when product is sold
 */
export const initializeSupplyChainTrace = async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    const user = (req as any).user;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if trace already exists
    const existing = await prisma.supplyChainTrace.findUnique({
      where: { productId } as any
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId } as any,
      include: { user: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate verification hash for cross-chain verification
    const verificationData = {
      productId: product.id,
      onchainId: product.onchainId,
      timestamp: new Date().toISOString(),
      seller: product.seller || product.user?.walletAddress
    };
    const verificationHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(verificationData))
      .digest('hex');

    // Create supply chain trace
    const trace = await prisma.supplyChainTrace.create({
      data: {
        productId: product.id,
        onchainId: product.onchainId || undefined,
        farmRegion: product.user?.name || 'Unknown',
        harvestDate: new Date(),
        currentStage: 'harvested',
        verificationHash,
        verifiedOnChains: ['polkadot'], // Initial verification on Polkadot
        events: {
          create: {
            eventType: 'harvested',
            location: product.user?.name || 'Farm',
            description: `Product harvested by ${product.farmerName || 'Farmer'}`,
            verified: true,
            metadata: {
              farmerName: product.farmerName,
              farmerPhone: product.farmerPhone,
              productName: product.name
            }
          }
        }
      },
      include: {
        events: true
      }
    });

    return res.status(201).json(trace);
  } catch (err) {
    console.error('Error initializing supply chain trace', err);
    return res.status(500).json({ error: 'Server error initializing supply chain trace' });
  }
};

/**
 * Update supply chain stage (e.g., shipped, in_transit, delivered)
 */
export const updateSupplyChainStage = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { stage, location, description, metadata } = req.body;
    const user = (req as any).user;

    if (!productId || !stage) {
      return res.status(400).json({ error: 'Product ID and stage are required' });
    }

    const validStages = ['harvested', 'packaged', 'shipped', 'in_transit', 'at_warehouse', 'delivered'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    const trace = await prisma.supplyChainTrace.findUnique({
      where: { productId } as any
    });

    if (!trace) {
      return res.status(404).json({ error: 'Supply chain trace not found' });
    }

    // Update trace
    const updated = await prisma.supplyChainTrace.update({
      where: { productId } as any,
      data: {
        currentStage: stage,
        currentLocation: location || trace.currentLocation,
        ...(stage === 'delivered' && { estimatedDelivery: new Date() })
      }
    });

    // Create event
    const event = await prisma.supplyChainEvent.create({
      data: {
        traceId: trace.id,
        eventType: stage,
        location: location || trace.currentLocation,
        description: description || `Product moved to ${stage} stage`,
        verified: false,
        metadata: metadata || {}
      }
    });

    return res.status(200).json({
      trace: updated,
      event
    });
  } catch (err) {
    console.error('Error updating supply chain stage', err);
    return res.status(500).json({ error: 'Server error updating supply chain stage' });
  }
};

/**
 * Add sensor reading (temperature/humidity)
 */
export const addSensorReading = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { readingType, value, location, recordedBy } = req.body;

    if (!productId || !readingType || value === undefined) {
      return res.status(400).json({ error: 'Product ID, reading type, and value are required' });
    }

    if (!['temperature', 'humidity'].includes(readingType)) {
      return res.status(400).json({ error: 'Reading type must be "temperature" or "humidity"' });
    }

    const trace = await prisma.supplyChainTrace.findUnique({
      where: { productId } as any
    });

    if (!trace) {
      return res.status(404).json({ error: 'Supply chain trace not found' });
    }

    const reading = await prisma.supplyChainReading.create({
      data: {
        traceId: trace.id,
        readingType,
        value: parseFloat(value),
        location: location || trace.currentLocation,
        recordedBy: recordedBy || 'sensor_device',
        timestamp: new Date()
      }
    });

    return res.status(201).json(reading);
  } catch (err) {
    console.error('Error adding sensor reading', err);
    return res.status(500).json({ error: 'Server error adding sensor reading' });
  }
};

/**
 * Verify supply chain on multiple chains (Polkadot feature)
 */
export const verifyOnChain = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { chainName, txHash } = req.body;

    if (!productId || !chainName) {
      return res.status(400).json({ error: 'Product ID and chain name are required' });
    }

    const trace = await prisma.supplyChainTrace.findUnique({
      where: { productId } as any
    });

    if (!trace) {
      return res.status(404).json({ error: 'Supply chain trace not found' });
    }

    // Add chain to verified chains if not already present
    const verifiedChains = trace.verifiedOnChains || [];
    if (!verifiedChains.includes(chainName)) {
      verifiedChains.push(chainName);
    }

    const updated = await prisma.supplyChainTrace.update({
      where: { productId } as any,
      data: {
        verifiedOnChains: verifiedChains
      }
    });

    // If txHash provided, update the latest event
    if (txHash) {
      const latestEvent = await prisma.supplyChainEvent.findFirst({
        where: { traceId: trace.id, verified: false },
        orderBy: { createdAt: 'desc' }
      });

      if (latestEvent) {
        await prisma.supplyChainEvent.update({
          where: { id: latestEvent.id } as any,
          data: {
            verified: true,
            verificationTxHash: txHash
          }
        });
      }
    }

    return res.status(200).json({
      message: `Supply chain verified on ${chainName}`,
      verifiedOnChains: updated.verifiedOnChains
    });
  } catch (err) {
    console.error('Error verifying on chain', err);
    return res.status(500).json({ error: 'Server error verifying on chain' });
  }
};

/**
 * Get all supply chain traces (for admin or user's products)
 */
export const getAllSupplyChainTraces = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    let whereClause: any = {};

    // If not admin, only show user's products
    if (user.role !== 'admin' && user.role !== 'superAdmin') {
      whereClause.product = {
        OR: [
          { buyer: user.walletAddress },
          { seller: user.walletAddress },
          { userId: user.id }
        ]
      };
    }

    // Filter by stage if provided
    if (status) {
      whereClause.currentStage = status;
    }

    const traces = await prisma.supplyChainTrace.findMany({
      where: whereClause as any,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            onchainId: true,
            farmerName: true,
            buyer: true,
            seller: true
          }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Latest event
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    return res.status(200).json({
      count: traces.length,
      traces
    });
  } catch (err) {
    console.error('Error getting all supply chain traces', err);
    return res.status(500).json({ error: 'Server error getting supply chain traces' });
  }
};

/**
 * Simulate real-time tracking updates (for demo purposes)
 */
export const simulateTrackingUpdate = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const trace = await prisma.supplyChainTrace.findUnique({
      where: { productId } as any
    });

    if (!trace) {
      return res.status(404).json({ error: 'Supply chain trace not found' });
    }

    // Simulate temperature and humidity readings
    const temperature = 15 + Math.random() * 10; // 15-25°C
    const humidity = 60 + Math.random() * 20; // 60-80%

    // Create readings
    await Promise.all([
      prisma.supplyChainReading.create({
        data: {
          traceId: trace.id,
          readingType: 'temperature',
          value: parseFloat(temperature.toFixed(2)),
          location: trace.currentLocation,
          recordedBy: 'iot_sensor_001',
          timestamp: new Date()
        }
      }),
      prisma.supplyChainReading.create({
        data: {
          traceId: trace.id,
          readingType: 'humidity',
          value: parseFloat(humidity.toFixed(2)),
          location: trace.currentLocation,
          recordedBy: 'iot_sensor_001',
          timestamp: new Date()
        }
      })
    ]);

    // Get updated trace with latest readings
    const updated = await prisma.supplyChainTrace.findUnique({
      where: { productId } as any,
      include: {
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 20
        }
      }
    });

    return res.status(200).json({
      message: 'Tracking data updated',
      trace: updated,
      latestReadings: {
        temperature: parseFloat(temperature.toFixed(2)),
        humidity: parseFloat(humidity.toFixed(2)),
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('Error simulating tracking update', err);
    return res.status(500).json({ error: 'Server error simulating tracking update' });
  }
};

