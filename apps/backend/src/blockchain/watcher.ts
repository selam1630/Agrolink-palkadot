import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import prisma from '../../prisma/prisma';
import * as nftService from '../services/nftCertificate.service';
import * as reputationService from '../services/reputation.service';

const RPC_URL = process.env.BLOCKCHAIN_PROVIDER_URL || '';
const CONTRACT_ADDRESS = process.env.MARKETPLACE_CONTRACT_ADDRESS || '';

if (!RPC_URL || !CONTRACT_ADDRESS) {
  console.warn('BLOCKCHAIN_PROVIDER_URL or MARKETPLACE_CONTRACT_ADDRESS not set. Watcher will not start.');
  process.exit(0);
}

import * as fs from 'fs';
import * as path from 'path';
const ABI: any = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../contracts/abi/Marketplace.json'), 'utf8')
);

async function main() {
  const useWebSocket = RPC_URL.startsWith('ws://') || RPC_URL.startsWith('wss://');
  const provider = useWebSocket ? new ethers.WebSocketProvider(RPC_URL) : new ethers.JsonRpcProvider(RPC_URL);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI as any, provider);

  console.log('Connected to contract at', CONTRACT_ADDRESS, `(provider: ${useWebSocket ? 'websocket' : 'http/polling'})`);

  // Ensure Prisma is connected early so DB writes don't fail silently later
  try {
    await prisma.$connect();
    console.log('Prisma client connected successfully');
  } catch (connErr) {
    console.error('Failed to connect Prisma client in watcher', connErr);
    // don't exit; let subsequent DB calls surface errors, but warn loudly
  }

  if (useWebSocket) {
    contract.on('ProductListed', async (productId: any, seller: string, price: any, metadataURI: string, event: any) => {
      try {
        console.log('Received ProductListed event - raw:', { productId, seller, price, metadataURI, event });
        try {
          console.log('Event.args:', (event && (event.args ?? (event as any))))
        } catch {}
        const pid = Number(productId?.toString());
        const priceEth = ethers.formatEther(price);
        const txHash = event?.transactionHash ?? event?.transaction?.hash;
        const logIndex = typeof event?.logIndex !== 'undefined' ? Number(event.logIndex) : undefined;
        const blockNumber = typeof event?.blockNumber !== 'undefined' ? Number(event.blockNumber) : undefined;

        console.log(`ProductListed - id:${pid} seller:${seller} price:${priceEth} metadata:${metadataURI} tx:${txHash}`);

        const nameMatcher = `onchain#${pid}`;

        // Check for existing record with same onchainId
        const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
        if (existing) {
          // If same event already stored, skip
          if (existing.onchainTxHash === txHash && existing.onchainLogIndex === logIndex) {
            console.log('Duplicate ProductListed event detected, skipping', txHash, logIndex);
          } else {
            const updateData = {
              name: nameMatcher,
              quantity: 1,
              price: parseFloat(priceEth),
              description: `On-chain listing by ${seller}`,
              imageUrl: metadataURI,
              status: 'available',
              isSold: false,
              seller: seller,
              onchainPrice: priceEth,
              metadataUri: metadataURI,
              onchainTxHash: txHash,
              onchainLogIndex: logIndex,
              onchainBlockNumber: blockNumber
            };
            console.log('Updating product where onchainId=', pid, 'with', updateData);
            try {
              const updated = await prisma.product.updateMany({ where: { onchainId: pid } as any, data: updateData });
              console.log('Updated existing product with onchain id', pid, 'updatedCount=', updated.count);
            } catch (updErr) {
              console.error('Failed updating product for onchain id', pid, (updErr as any)?.stack ?? updErr);
            }
          }
        } else {
          const createData = {
            name: nameMatcher,
            onchainId: pid,
            quantity: 1,
            price: parseFloat(priceEth),
            description: `On-chain listing by ${seller}`,
            imageUrl: metadataURI,
            status: 'available',
            isSold: false,
            seller: seller,
            onchainPrice: priceEth,
            metadataUri: metadataURI,
            onchainTxHash: txHash,
            onchainLogIndex: logIndex,
            onchainBlockNumber: blockNumber
          };
          console.log('Creating product with data', createData);
          try {
            await prisma.product.create({ data: createData });
            console.log('Inserted product in DB for onchain id', pid);
          } catch (createErr) {
            console.error('Failed creating product for onchain id', pid, (createErr as any)?.stack ?? createErr);
          }
        }
      } catch (err) {
        console.error('Error handling ProductListed', err);
      }
    });

    contract.on('ProductBought', async (productId: any, buyer: string, seller: string, price: any, event: any) => {
      try {
        const pid = Number(productId?.toString());
        const txHash = event?.transactionHash ?? event?.transaction?.hash;
        const logIndex = typeof event?.logIndex !== 'undefined' ? Number(event.logIndex) : undefined;
        const blockNumber = typeof event?.blockNumber !== 'undefined' ? Number(event.blockNumber) : undefined;
        const amount = typeof price !== 'undefined' ? ethers.formatEther(price) : undefined;

        console.log(`ProductBought - id:${pid} buyer:${buyer} seller:${seller} tx:${txHash}`);

        // Calculate escrow release time (7 days from now)
        const escrowReleaseTime = new Date();
        escrowReleaseTime.setDate(escrowReleaseTime.getDate() + 7);

        const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
        if (existing) {
          const updated = await prisma.product.updateMany({
            where: { onchainId: pid } as any,
            data: {
              isSold: true,
              status: 'sold',
              buyer: buyer,
              escrowStatus: 'pending',
              escrowReleaseTime: escrowReleaseTime,
              deliveryConfirmed: false,
              disputeRaised: false,
              onchainTxHash: txHash,
              onchainLogIndex: logIndex,
              onchainBlockNumber: blockNumber
            }
          });
          console.log('Marked product as sold with escrow for onchain id', pid, 'updatedCount=', updated.count);
          
          // Initialize supply chain trace if not exists
          try {
            const existingTrace = await prisma.supplyChainTrace.findUnique({ where: { productId: existing.id } as any });
            if (!existingTrace) {
              const crypto = require('crypto');
              const verificationData = {
                productId: existing.id,
                onchainId: pid,
                timestamp: new Date().toISOString(),
                seller: seller || existing.seller
              };
              const verificationHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(verificationData))
                .digest('hex');

              await prisma.supplyChainTrace.create({
                data: {
                  productId: existing.id,
                  onchainId: pid,
                  farmRegion: existing.farmerName || 'Unknown',
                  harvestDate: new Date(),
                  currentStage: 'harvested',
                  verificationHash,
                  verifiedOnChains: ['polkadot'],
                  events: {
                    create: {
                      eventType: 'harvested',
                      location: existing.farmerName || 'Farm',
                      description: `Product harvested by ${existing.farmerName || 'Farmer'}`,
                      verified: true,
                      metadata: {
                        farmerName: existing.farmerName,
                        farmerPhone: existing.farmerPhone,
                        productName: existing.name,
                        onchainTxHash: txHash
                      }
                    }
                  }
                }
              });
              console.log('Created supply chain trace for onchain product', pid);
            }
          } catch (traceErr) {
            console.error('Failed creating supply chain trace', (traceErr as any)?.stack ?? traceErr);
          }
          
          // create an onchain transaction record (dedupe by txHash)
            try {
              // Only create transaction if we have a valid txHash
              const txHashStr = txHash ? String(txHash).trim() : '';
              if (txHashStr !== '') {
                let existingTx = null;
                existingTx = await prisma.onchainTransaction.findUnique({ where: { txHash: txHashStr } as any });
                if (!existingTx) {
                  // Ensure amount is properly formatted
                  const formattedAmount = amount && amount !== '' ? amount : (price ? ethers.formatEther(price) : '0');
                  await prisma.onchainTransaction.create({
                    data: {
                      txHash: txHashStr,
                      onchainProductId: pid,
                      buyer: buyer || '',
                      seller: seller ?? existing.seller ?? undefined,
                      amount: formattedAmount,
                      blockNumber: blockNumber ?? undefined,
                      logIndex: logIndex ?? undefined,
                    }
                  });
                  console.log('Created onchain transaction record for tx', txHashStr);
                  
                  // Generate NFT certificate for the product
                  try {
                    const existingCert = await nftService.getNFTCertificate(existing.id);
                    if (!existingCert) {
                      await nftService.createNFTCertificate({
                        productId: existing.id,
                        productName: existing.name,
                        farmerName: existing.farmerName ?? undefined,
                        farmerAddress: seller ?? existing.seller ?? undefined,
                        region: undefined,
                        qualityGrade: 'A',
                        organicCertified: false,
                        harvestDate: existing.createdAt ? new Date(existing.createdAt) : undefined,
                        transactionHash: txHashStr,
                        imageUrl: existing.imageUrl ?? undefined,
                        ownerAddress: buyer,
                        ownerId: undefined, // Buyer might not be a user in our system
                      });
                      console.log('✅ Generated NFT certificate for product', existing.id);
                    }
                  } catch (nftErr) {
                    console.error('Failed generating NFT certificate', (nftErr as any)?.stack ?? nftErr);
                  }
                  
                  // Update farmer reputation
                  try {
                    if (existing.userId) {
                      await prisma.user.update({
                        where: { id: existing.userId } as any,
                        data: {
                          totalSales: { increment: 1 },
                        },
                      });
                      await reputationService.updateFarmerReputation(
                        existing.userId,
                        'transaction_completed',
                        existing.id,
                        `Product sold: ${existing.name}`
                      );
                      console.log('✅ Updated farmer reputation for', existing.userId);
                    }
                  } catch (repErr) {
                    console.error('Failed updating farmer reputation', (repErr as any)?.stack ?? repErr);
                  }
                } else {
                  console.log('Onchain transaction already exists for tx', txHashStr);
                }
              } else {
                console.warn('Cannot create onchain transaction: txHash is missing or empty for product', pid);
              }
            } catch (txErr) {
              console.error('Failed creating onchain transaction record', (txErr as any)?.stack ?? txErr);
            }
        } else {
          console.log('No matching local product found to mark as sold for onchain id', pid);
        }
      } catch (err) {
        console.error('Error handling ProductBought', err);
      }
    });

    // Handle DeliveryConfirmed event
    contract.on('DeliveryConfirmed', async (productId: any, buyer: string, event: any) => {
      try {
        const pid = Number(productId?.toString());
        const txHash = event?.transactionHash ?? event?.transaction?.hash;
        console.log(`DeliveryConfirmed - id:${pid} buyer:${buyer} tx:${txHash}`);

        const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
        if (existing) {
          await prisma.product.updateMany({
            where: { onchainId: pid } as any,
            data: {
              deliveryConfirmed: true,
              escrowStatus: 'confirmed'
            }
          });
          console.log('Updated product delivery confirmation for onchain id', pid);
        }
      } catch (err) {
        console.error('Error handling DeliveryConfirmed', err);
      }
    });

    // Handle EscrowReleased event
    contract.on('EscrowReleased', async (productId: any, seller: string, amount: any, event: any) => {
      try {
        const pid = Number(productId?.toString());
        const txHash = event?.transactionHash ?? event?.transaction?.hash;
        console.log(`EscrowReleased - id:${pid} seller:${seller} amount:${ethers.formatEther(amount)} tx:${txHash}`);

        const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
        if (existing) {
          await prisma.product.updateMany({
            where: { onchainId: pid } as any,
            data: {
              escrowStatus: 'released'
            }
          });
          console.log('Updated product escrow status to released for onchain id', pid);
        }
      } catch (err) {
        console.error('Error handling EscrowReleased', err);
      }
    });

    // Handle DisputeRaised event
    contract.on('DisputeRaised', async (productId: any, raisedBy: string, event: any) => {
      try {
        const pid = Number(productId?.toString());
        const txHash = event?.transactionHash ?? event?.transaction?.hash;
        console.log(`DisputeRaised - id:${pid} raisedBy:${raisedBy} tx:${txHash}`);

        const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
        if (existing) {
          await prisma.product.updateMany({
            where: { onchainId: pid } as any,
            data: {
              disputeRaised: true,
              escrowStatus: 'disputed'
            }
          });
          console.log('Updated product dispute status for onchain id', pid);
        }
      } catch (err) {
        console.error('Error handling DisputeRaised', err);
      }
    });

    // Handle DisputeResolved event
    contract.on('DisputeResolved', async (productId: any, favorBuyer: boolean, resolver: string, event: any) => {
      try {
        const pid = Number(productId?.toString());
        const txHash = event?.transactionHash ?? event?.transaction?.hash;
        console.log(`DisputeResolved - id:${pid} favorBuyer:${favorBuyer} resolver:${resolver} tx:${txHash}`);

        const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
        if (existing) {
          await prisma.product.updateMany({
            where: { onchainId: pid } as any,
            data: {
              disputeRaised: false,
              escrowStatus: 'resolved'
            }
          });
          console.log('Updated product dispute resolution for onchain id', pid);
        }
      } catch (err) {
        console.error('Error handling DisputeResolved', err);
      }
    });
  } else {
    console.log('RPC does not support subscriptions reliably; running in polling mode (queryFilter).');
    // Allow an environment-configured start block so the watcher can catch up historical events
    let lastCheckedBlock: number;
    const startBlockEnv = process.env.BLOCKCHAIN_START_BLOCK;
    if (startBlockEnv) {
      const parsed = Number(startBlockEnv);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        // set lastCheckedBlock to start-1 so the first query covers start..latest
        lastCheckedBlock = parsed - 1;
        console.log('Starting poller from configured BLOCKCHAIN_START_BLOCK =', parsed);
      } else {
        console.warn('Invalid BLOCKCHAIN_START_BLOCK value:', startBlockEnv, 'falling back to current block');
        lastCheckedBlock = await provider.getBlockNumber();
      }
    } else {
      lastCheckedBlock = await provider.getBlockNumber();
    }

    const pollIntervalMs = Number(process.env.BLOCKCHAIN_POLL_INTERVAL_MS || 10_000);

    const listedFilter = contract.filters.ProductListed();

    const poller = setInterval(async () => {
      try {
        const latest = await provider.getBlockNumber();
        if (latest <= lastCheckedBlock) return;

        const from = lastCheckedBlock + 1;
        const to = latest;

        // fetch listings
        const listedEvents = await contract.queryFilter(listedFilter, from, to);
        for (const ev of listedEvents) {
          try {
            const evAny: any = ev as any;
            const args: any = evAny.args ?? evAny;
            const pid = Number(args?.productId?.toString() ?? String(args?.[0] ?? '0'));
            const seller = args?.seller ?? args?.[1];
            const price = args?.price ?? args?.[2];
            const metadataURI = args?.metadataURI ?? args?.[3];
            const txHash = evAny.transactionHash ?? evAny.transaction?.hash;
            const logIndex = typeof evAny.logIndex !== 'undefined' ? Number(evAny.logIndex) : undefined;
            const blockNumber = typeof evAny.blockNumber !== 'undefined' ? Number(evAny.blockNumber) : undefined;

            const priceEth = ethers.formatEther(price);
            console.log(`ProductListed (poll) - id:${pid} seller:${seller} price:${priceEth} metadata:${metadataURI} tx:${txHash}`);

            const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
            const nameMatcher = `onchain#${pid}`;
            if (existing) {
              if (existing.onchainTxHash === txHash && existing.onchainLogIndex === logIndex) {
                console.log('Duplicate ProductListed (poll) event detected, skipping', txHash, logIndex);
              } else {
                const updateData = {
                  name: nameMatcher,
                  quantity: 1,
                  price: parseFloat(priceEth),
                  description: `On-chain listing by ${seller}`,
                  imageUrl: metadataURI,
                  status: 'available',
                  isSold: false,
                  seller: seller,
                  onchainPrice: priceEth,
                  metadataUri: metadataURI,
                  onchainTxHash: txHash,
                  onchainLogIndex: logIndex,
                  onchainBlockNumber: blockNumber
                };
                console.log('Updating product (poll) where onchainId=', pid, 'with', updateData);
                try {
                  const updated = await prisma.product.updateMany({ where: { onchainId: pid } as any, data: updateData });
                  console.log('Updated existing product (poll) with onchain id', pid, 'updatedCount=', updated.count);
                } catch (updErr) {
                  console.error('Failed updating product (poll) for onchain id', pid, (updErr as any)?.stack ?? updErr);
                }
              }
            } else {
              const createData = {
                name: nameMatcher,
                onchainId: pid,
                quantity: 1,
                price: parseFloat(priceEth),
                description: `On-chain listing by ${seller}`,
                imageUrl: metadataURI,
                status: 'available',
                isSold: false,
                seller: seller,
                onchainPrice: priceEth,
                metadataUri: metadataURI,
                onchainTxHash: txHash,
                onchainLogIndex: logIndex,
                onchainBlockNumber: blockNumber
              };
              console.log('Creating product (poll) with data', createData);
              try {
                await prisma.product.create({ data: createData });
                console.log('Inserted product in DB for onchain id', pid);
              } catch (createErr) {
                console.error('Failed creating product (poll) for onchain id', pid, (createErr as any)?.stack ?? createErr);
              }
            }
          } catch (e) {
            console.error('Error processing ProductListed (poll)', e);
          }
        }

        // fetch bought
        const boughtFilter = contract.filters.ProductBought();
        const boughtEvents = await contract.queryFilter(boughtFilter, from, to);
        for (const ev of boughtEvents) {
          try {
            const evAny: any = ev as any;
            const args: any = evAny.args ?? evAny;
            const pid = Number(args?.productId?.toString() ?? String(args?.[0] ?? '0'));
            const buyer = args?.buyer ?? args?.[1];
            const seller = args?.seller ?? args?.[2];
            const txHash = evAny.transactionHash ?? evAny.transaction?.hash;
            const logIndex = typeof evAny.logIndex !== 'undefined' ? Number(evAny.logIndex) : undefined;
            const blockNumber = typeof evAny.blockNumber !== 'undefined' ? Number(evAny.blockNumber) : undefined;
            console.log(`ProductBought (poll) - id:${pid} buyer:${buyer} seller:${seller} tx:${txHash}`);

            const escrowReleaseTime = new Date();
            escrowReleaseTime.setDate(escrowReleaseTime.getDate() + 7);

            const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
            if (existing) {
              const updated = await prisma.product.updateMany({
                where: { onchainId: pid } as any,
                data: {
                  isSold: true,
                  status: 'sold',
                  buyer: buyer,
                  escrowStatus: 'pending',
                  escrowReleaseTime: escrowReleaseTime,
                  deliveryConfirmed: false,
                  disputeRaised: false,
                  onchainTxHash: txHash,
                  onchainLogIndex: logIndex,
                  onchainBlockNumber: blockNumber
                }
              });
              console.log('Marked product as sold with escrow for onchain id', pid, 'updatedCount=', updated.count);
              
              // Initialize supply chain trace if not exists (polling mode)
              try {
                const existingTrace = await prisma.supplyChainTrace.findUnique({ where: { productId: existing.id } as any });
                if (!existingTrace) {
                  const crypto = require('crypto');
                  const verificationData = {
                    productId: existing.id,
                    onchainId: pid,
                    timestamp: new Date().toISOString(),
                    seller: seller || existing.seller
                  };
                  const verificationHash = crypto
                    .createHash('sha256')
                    .update(JSON.stringify(verificationData))
                    .digest('hex');

                  await prisma.supplyChainTrace.create({
                    data: {
                      productId: existing.id,
                      onchainId: pid,
                      farmRegion: existing.farmerName || 'Unknown',
                      harvestDate: new Date(),
                      currentStage: 'harvested',
                      verificationHash,
                      verifiedOnChains: ['polkadot'],
                      events: {
                        create: {
                          eventType: 'harvested',
                          location: existing.farmerName || 'Farm',
                          description: `Product harvested by ${existing.farmerName || 'Farmer'}`,
                          verified: true,
                          metadata: {
                            farmerName: existing.farmerName,
                            farmerPhone: existing.farmerPhone,
                            productName: existing.name,
                            onchainTxHash: txHash
                          }
                        }
                      }
                    }
                  });
                  console.log('Created supply chain trace (poll) for onchain product', pid);
                }
              } catch (traceErr) {
                console.error('Failed creating supply chain trace (poll)', (traceErr as any)?.stack ?? traceErr);
              }
              
              // record transaction in DB
              try {
                // Only create transaction if we have a valid txHash
                const txHashStr = txHash ? String(txHash).trim() : '';
                if (txHashStr !== '') {
                  const priceValue = evAny.args?.price ?? args?.price ?? args?.[3];
                  const amount = (typeof priceValue !== 'undefined') ? ethers.formatEther(priceValue) : '0';
                  const existingTx = await prisma.onchainTransaction.findUnique({ where: { txHash: txHashStr } as any });
                  if (!existingTx) {
                    await prisma.onchainTransaction.create({
                      data: {
                        txHash: txHashStr,
                        onchainProductId: pid,
                        buyer: buyer || '',
                        seller: seller ?? existing.seller ?? undefined,
                        amount: amount,
                        blockNumber: blockNumber ?? undefined,
                        logIndex: logIndex ?? undefined,
                      }
                    });
                    console.log('Created onchain transaction record for tx (poll)', txHashStr);
                    
                    // Generate NFT certificate for the product
                    try {
                      const existingCert = await nftService.getNFTCertificate(existing.id);
                      if (!existingCert) {
                        await nftService.createNFTCertificate({
                          productId: existing.id,
                          productName: existing.name,
                          farmerName: existing.farmerName ?? undefined,
                          farmerAddress: seller ?? existing.seller ?? undefined,
                          region: undefined,
                          qualityGrade: 'A',
                          organicCertified: false,
                          harvestDate: existing.createdAt ? new Date(existing.createdAt) : undefined,
                          transactionHash: txHashStr,
                          imageUrl: existing.imageUrl ?? undefined,
                          ownerAddress: buyer,
                          ownerId: undefined,
                        });
                        console.log('✅ Generated NFT certificate for product (poll)', existing.id);
                      }
                    } catch (nftErr) {
                      console.error('Failed generating NFT certificate (poll)', (nftErr as any)?.stack ?? nftErr);
                    }
                    
                    // Update farmer reputation
                    try {
                      if (existing.userId) {
                        await prisma.user.update({
                          where: { id: existing.userId } as any,
                          data: {
                            totalSales: { increment: 1 },
                          },
                        });
                        await reputationService.updateFarmerReputation(
                          existing.userId,
                          'transaction_completed',
                          existing.id,
                          `Product sold: ${existing.name}`
                        );
                        console.log('✅ Updated farmer reputation (poll) for', existing.userId);
                      }
                    } catch (repErr) {
                      console.error('Failed updating farmer reputation (poll)', (repErr as any)?.stack ?? repErr);
                    }
                  } else {
                    console.log('Onchain transaction already exists for tx (poll)', txHashStr);
                  }
                } else {
                  console.warn('Cannot create onchain transaction (poll): txHash is missing or empty for product', pid);
                }
              } catch (txErr) {
                console.error('Failed creating onchain transaction record (poll)', (txErr as any)?.stack ?? txErr);
              }
            } else {
              console.log('No matching local product found to mark as sold for onchain id', pid);
            }
          } catch (e) {
            console.error('Error processing ProductBought (poll)', e);
          }
        }

        // Handle DeliveryConfirmed events (polling)
        const deliveryConfirmedFilter = contract.filters.DeliveryConfirmed();
        const deliveryEvents = await contract.queryFilter(deliveryConfirmedFilter, from, to);
        for (const ev of deliveryEvents) {
          try {
            const evAny: any = ev as any;
            const args: any = evAny.args ?? evAny;
            const pid = Number(args?.productId?.toString() ?? String(args?.[0] ?? '0'));
            const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
            if (existing) {
              await prisma.product.updateMany({
                where: { onchainId: pid } as any,
                data: {
                  deliveryConfirmed: true,
                  escrowStatus: 'confirmed'
                }
              });
              console.log('Updated product delivery confirmation (poll) for onchain id', pid);
            }
          } catch (e) {
            console.error('Error processing DeliveryConfirmed (poll)', e);
          }
        }

        // Handle EscrowReleased events (polling)
        const escrowReleasedFilter = contract.filters.EscrowReleased();
        const escrowReleasedEvents = await contract.queryFilter(escrowReleasedFilter, from, to);
        for (const ev of escrowReleasedEvents) {
          try {
            const evAny: any = ev as any;
            const args: any = evAny.args ?? evAny;
            const pid = Number(args?.productId?.toString() ?? String(args?.[0] ?? '0'));
            const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
            if (existing) {
              await prisma.product.updateMany({
                where: { onchainId: pid } as any,
                data: {
                  escrowStatus: 'released'
                }
              });
              console.log('Updated product escrow status to released (poll) for onchain id', pid);
            }
          } catch (e) {
            console.error('Error processing EscrowReleased (poll)', e);
          }
        }

        // Handle DisputeRaised events (polling)
        const disputeRaisedFilter = contract.filters.DisputeRaised();
        const disputeRaisedEvents = await contract.queryFilter(disputeRaisedFilter, from, to);
        for (const ev of disputeRaisedEvents) {
          try {
            const evAny: any = ev as any;
            const args: any = evAny.args ?? evAny;
            const pid = Number(args?.productId?.toString() ?? String(args?.[0] ?? '0'));
            const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
            if (existing) {
              await prisma.product.updateMany({
                where: { onchainId: pid } as any,
                data: {
                  disputeRaised: true,
                  escrowStatus: 'disputed'
                }
              });
              console.log('Updated product dispute status (poll) for onchain id', pid);
            }
          } catch (e) {
            console.error('Error processing DisputeRaised (poll)', e);
          }
        }

        // Handle DisputeResolved events (polling)
        const disputeResolvedFilter = contract.filters.DisputeResolved();
        const disputeResolvedEvents = await contract.queryFilter(disputeResolvedFilter, from, to);
        for (const ev of disputeResolvedEvents) {
          try {
            const evAny: any = ev as any;
            const args: any = evAny.args ?? evAny;
            const pid = Number(args?.productId?.toString() ?? String(args?.[0] ?? '0'));
            const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
            if (existing) {
              await prisma.product.updateMany({
                where: { onchainId: pid } as any,
                data: {
                  disputeRaised: false,
                  escrowStatus: 'resolved'
                }
              });
              console.log('Updated product dispute resolution (poll) for onchain id', pid);
            }
          } catch (e) {
            console.error('Error processing DisputeResolved (poll)', e);
          }
        }

        lastCheckedBlock = latest;
      } catch (err) {
        console.error('Polling error', err);
      }
    }, pollIntervalMs);

    // clear poller on shutdown
    process.on('SIGINT', async () => {
      clearInterval(poller);
      console.log('Stopped poller');
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('Shutting down blockchain watcher...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error('Watcher failed', e);
  process.exit(1);
});
