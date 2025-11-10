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

  if (useWebSocket) {
    contract.on('ProductListed', async (productId: any, seller: string, price: any, metadataURI: string, event: any) => {
      try {
        // Convert the productId to BigInt
        const pid = BigInt("0x" + productId.toString());  // Use 0x for hex representation if needed
        const priceEth = ethers.formatEther(price);
        console.log(`ProductListed - id:${pid.toString()} seller:${seller} price:${priceEth} metadata:${metadataURI}`);

        await prisma.product.create({
          data: {
            name: `onchain#${pid.toString()}`,
            quantity: 1,
            price: parseFloat(priceEth),
            description: `On-chain listing by ${seller}`,
            imageUrl: metadataURI,
            status: 'available',
            isSold: false
          }
        });
        console.log('Inserted product in DB for onchain id', pid.toString());
      } catch (err) {
        console.error('Error handling ProductListed', err);
      }
    });

    contract.on('ProductBought', async (productId: any, buyer: string, price: any, event: any) => {
      try {
        // Convert the productId to BigInt
        const pid = BigInt("0x" + productId.toString());
        console.log(`ProductBought - id:${pid.toString()} buyer:${buyer}`);

        const nameMatcher = `onchain#${pid.toString()}`;
        const updated = await prisma.product.updateMany({
          where: { name: nameMatcher, isSold: false },
          data: { isSold: true, status: 'sold' }
        });

        if (updated.count > 0) {
          console.log(`Marked ${updated.count} product(s) as sold for onchain id ${pid.toString()}`);
        } else {
          console.log('No matching local product found to mark as sold for onchain id', pid.toString());
        }
      } catch (err) {
        console.error('Error handling ProductBought', err);
      }
    });
  } else {
    console.log('RPC does not support subscriptions reliably; running in polling mode (queryFilter).');
    let lastCheckedBlock = await provider.getBlockNumber();

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
            const pid = BigInt("0x" + (args?.productId?.toString() ?? String(args?.[0])));
            const seller = args?.seller ?? args?.[1];
            const price = args?.price ?? args?.[2];
            const metadataURI = args?.metadataURI ?? args?.[3];

            const priceEth = ethers.formatEther(price);
            console.log(`ProductListed (poll) - id:${pid.toString()} seller:${seller} price:${priceEth} metadata:${metadataURI}`);

            await prisma.product.create({
              data: {
                name: `onchain#${pid.toString()}`,
                quantity: 1,
                price: parseFloat(priceEth),
                description: `On-chain listing by ${seller}`,
                imageUrl: metadataURI,
                status: 'available',
                isSold: false
              }
            });
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
            const pid = BigInt("0x" + (args?.productId?.toString() ?? String(args?.[0])));
            const buyer = args?.buyer ?? args?.[1];
            console.log(`ProductBought (poll) - id:${pid.toString()} buyer:${buyer}`);

            const nameMatcher = `onchain#${pid.toString()}`;
            const updated = await prisma.product.updateMany({
              where: { name: nameMatcher, isSold: false },
              data: { isSold: true, status: 'sold' }
            });

            if (updated.count > 0) {
              console.log(`Marked ${updated.count} product(s) as sold for onchain id ${pid.toString()}`);
            } else {
              console.log('No matching local product found to mark as sold for onchain id', pid.toString());
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
