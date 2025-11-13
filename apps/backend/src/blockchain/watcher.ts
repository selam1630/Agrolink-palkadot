import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import prisma from '../../prisma/prisma';

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

    contract.on('ProductBought', async (productId: any, buyer: string, price: any, event: any) => {
      try {
        const pid = Number(productId?.toString());
        const txHash = event?.transactionHash ?? event?.transaction?.hash;
        const logIndex = typeof event?.logIndex !== 'undefined' ? Number(event.logIndex) : undefined;
        const blockNumber = typeof event?.blockNumber !== 'undefined' ? Number(event.blockNumber) : undefined;
        const amount = typeof price !== 'undefined' ? ethers.formatEther(price) : undefined;

        console.log(`ProductBought - id:${pid} buyer:${buyer} tx:${txHash}`);

        const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
        if (existing) {
          const updated = await prisma.product.updateMany({
            where: { onchainId: pid } as any,
            data: {
              isSold: true,
              status: 'sold',
              onchainTxHash: txHash,
              onchainLogIndex: logIndex,
              onchainBlockNumber: blockNumber
            }
          });
          console.log('Marked product as sold for onchain id', pid, 'updatedCount=', updated.count);
          // create an onchain transaction record (dedupe by txHash)
            try {
              // Don't call findUnique with an undefined txHash; guard against missing txHash
              let existingTx = null;
              if (txHash) {
                existingTx = await prisma.onchainTransaction.findUnique({ where: { txHash } as any });
              }
              if (!existingTx) {
                await prisma.onchainTransaction.create({
                  data: {
                    txHash: txHash ?? '',
                    onchainProductId: pid,
                    buyer: buyer,
                    seller: existing.seller ?? undefined,
                    amount: amount ?? '',
                    blockNumber: blockNumber ?? undefined,
                    logIndex: logIndex ?? undefined,
                  }
                });
                console.log('Created onchain transaction record for tx', txHash);
              } else {
                console.log('Onchain transaction already exists for tx', txHash);
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
    const boughtFilter = contract.filters.ProductBought();

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
        const boughtEvents = await contract.queryFilter(boughtFilter, from, to);
        for (const ev of boughtEvents) {
          try {
            const evAny: any = ev as any;
            const args: any = evAny.args ?? evAny;
            const pid = Number(args?.productId?.toString() ?? String(args?.[0] ?? '0'));
            const buyer = args?.buyer ?? args?.[1];
            const txHash = evAny.transactionHash ?? evAny.transaction?.hash;
            const logIndex = typeof evAny.logIndex !== 'undefined' ? Number(evAny.logIndex) : undefined;
            const blockNumber = typeof evAny.blockNumber !== 'undefined' ? Number(evAny.blockNumber) : undefined;
            console.log(`ProductBought (poll) - id:${pid} buyer:${buyer} tx:${txHash}`);

            const existing = await prisma.product.findFirst({ where: { onchainId: pid } as any });
            if (existing) {
              const updated = await prisma.product.updateMany({
                where: { onchainId: pid } as any,
                data: {
                  isSold: true,
                  status: 'sold',
                  onchainTxHash: txHash,
                  onchainLogIndex: logIndex,
                  onchainBlockNumber: blockNumber
                }
              });
              console.log('Marked product as sold for onchain id', pid, 'updatedCount=', updated.count);
              // record transaction in DB
              try {
                const amount = (typeof evAny.args?.price !== 'undefined') ? ethers.formatEther(evAny.args.price) : '';
                const existingTx = await prisma.onchainTransaction.findUnique({ where: { txHash } as any });
                if (!existingTx) {
                  await prisma.onchainTransaction.create({
                    data: {
                      txHash: txHash ?? '',
                      onchainProductId: pid,
                      buyer: buyer,
                      seller: existing.seller ?? undefined,
                      amount: amount ?? '',
                      blockNumber: blockNumber ?? undefined,
                      logIndex: logIndex ?? undefined,
                    }
                  });
                  console.log('Created onchain transaction record for tx (poll)', txHash);
                } else {
                  console.log('Onchain transaction already exists for tx (poll)', txHash);
                }
              } catch (txErr) {
                console.error('Failed creating onchain transaction record (poll)', txErr);
              }
            } else {
              console.log('No matching local product found to mark as sold for onchain id', pid);
            }
          } catch (e) {
            console.error('Error processing ProductBought (poll)', e);
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
