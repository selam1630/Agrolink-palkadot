import { ethers } from 'ethers';
import MarketplaceAbi from './Marketplace.json';

// Buy an on-chain product using the injected wallet (MetaMask)
// onchainId: number - the marketplace product id
// price: string - formatted ether string (e.g. '0.01')
export async function buyOnchainProduct(onchainId: number, price: string | number) {
  if (typeof window === 'undefined') throw new Error('Not running in browser');
  const anyWindow: any = window as any;
  const ethereum = anyWindow.ethereum;
  if (!ethereum) throw new Error('No injected wallet found. Install MetaMask.');

  const provider = new ethers.BrowserProvider(ethereum as any);
  const signer = await provider.getSigner();

  const contractAddress = (import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS as string) || (process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS as string) || '';
  if (!contractAddress) throw new Error('MARKETPLACE_CONTRACT_ADDRESS not configured in environment (VITE_MARKETPLACE_CONTRACT_ADDRESS)');

  // price may already be a string like '0.001'
  const priceStr = typeof price === 'number' ? String(price) : price;
  const value = ethers.parseEther(priceStr);

  const contract = new ethers.Contract(contractAddress, MarketplaceAbi as any, signer);

  // call buyProduct and send value
  const tx = await contract.buyProduct(onchainId, { value });
  // wait for confirmation
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}
