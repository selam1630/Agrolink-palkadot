import { ethers } from 'ethers';
import MarketplaceAbi from './Marketplace.json';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Buy an on-chain product using the injected wallet (MetaMask)
// Adds: network check (optional), gas estimation, and returns explorer url if configured
export async function buyOnchainProduct(onchainId: number, price: string | number) {
  if (typeof window === 'undefined') throw new Error('Not running in browser');
  const anyWindow: any = window as any;
  const ethereum = anyWindow.ethereum;
  if (!ethereum) throw new Error('No injected wallet found. Install MetaMask.');

  const provider = new ethers.BrowserProvider(ethereum as any);
  const signer = await provider.getSigner();

  const contractAddress = (import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS as string) || (process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS as string) || '';
  if (!contractAddress) throw new Error('MARKETPLACE_CONTRACT_ADDRESS not configured in environment (VITE_MARKETPLACE_CONTRACT_ADDRESS)');

  // optional expected chain id to enforce a network check (set VITE_EXPECTED_CHAIN_ID)
  const expectedChainIdEnv = (import.meta.env.VITE_EXPECTED_CHAIN_ID as string) || '';
  const expectedChainId = expectedChainIdEnv ? Number(expectedChainIdEnv) : undefined;

  // optional tx explorer base url (set VITE_TX_EXPLORER_URL), e.g. https://moonbase.moonscan.io/tx
  const explorerBase = (import.meta.env.VITE_TX_EXPLORER_URL as string) || '';

  const network = await provider.getNetwork();
  if (expectedChainId && Number(network.chainId) !== expectedChainId) {
    // ask wallet to switch network
    try {
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + expectedChainId.toString(16) }] });
    } catch (switchErr: any) {
      // 4902 - chain not added to wallet
      if (switchErr && switchErr.code === 4902) {
        throw new Error(`Please add the target chain (chainId ${expectedChainId}) to your wallet and try again.`);
      }
      throw new Error(`Please switch your wallet to chainId ${expectedChainId}. ${switchErr?.message ?? String(switchErr)}`);
    }
  }

  const priceStr = typeof price === 'number' ? String(price) : price;
  const value = ethers.parseEther(priceStr);

  const contract = new ethers.Contract(contractAddress, MarketplaceAbi as any, signer);

  // estimate gas for the buy call
  let gasLimit: bigint | undefined;
  try {
    const estimate: bigint = await contract.estimateGas.buyProduct(onchainId, { value });
    // add 10% buffer
    gasLimit = (estimate * 110n) / 100n;
  } catch {
    // fallback: leave gasLimit undefined and let wallet estimate
    gasLimit = undefined;
  }

  const tx = await contract.buyProduct(onchainId, gasLimit ? { value, gasLimit } : { value });
  const receipt = await tx.wait();

  const explorerUrl = explorerBase ? `${explorerBase.replace(/\/$/, '')}/${tx.hash}` : undefined;
  return { hash: tx.hash, receipt, explorerUrl };
}

// List a product on-chain using the injected wallet (MetaMask)
// metadataUri: string - a URI pointing to metadata (image/JSON)
// price: string|number - price in ether (GLMR) string or number
export async function listOnchainProduct(metadataUri: string, price: string | number) {
  if (typeof window === 'undefined') throw new Error('Not running in browser');
  const anyWindow: any = window as any;
  const ethereum = anyWindow.ethereum;
  if (!ethereum) throw new Error('No injected wallet found. Install MetaMask.');

  const provider = new ethers.BrowserProvider(ethereum as any);
  const signer = await provider.getSigner();

  const contractAddress = (import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS as string) || (process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS as string) || '';
  if (!contractAddress) throw new Error('MARKETPLACE_CONTRACT_ADDRESS not configured in environment (VITE_MARKETPLACE_CONTRACT_ADDRESS)');

  const expectedChainIdEnv = (import.meta.env.VITE_EXPECTED_CHAIN_ID as string) || '';
  const expectedChainId = expectedChainIdEnv ? Number(expectedChainIdEnv) : undefined;

  const explorerBase = (import.meta.env.VITE_TX_EXPLORER_URL as string) || '';

  const network = await provider.getNetwork();
  if (expectedChainId && network.chainId !== expectedChainId) {
    try {
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + expectedChainId.toString(16) }] });
    } catch (switchErr: any) {
      if (switchErr && switchErr.code === 4902) {
        throw new Error(`Please add the target chain (chainId ${expectedChainId}) to your wallet and try again.`);
      }
      throw new Error(`Please switch your wallet to chainId ${expectedChainId}. ${switchErr?.message ?? String(switchErr)}`);
    }
  }

  const priceStr = typeof price === 'number' ? String(price) : price;
  const value = ethers.parseEther(priceStr);

  const contract = new ethers.Contract(contractAddress, MarketplaceAbi as any, signer);

  // estimate gas for listing
  let gasLimit: bigint | undefined;
  try {
    const estimate: bigint = await (contract.estimateGas as any).listProduct(metadataUri, value);
    gasLimit = (estimate * 120n) / 100n; // 20% buffer
  } catch {
    gasLimit = undefined;
  }

  // listProduct(metadataURI, price)
  const tx = await contract.listProduct(metadataUri, value, gasLimit ? { gasLimit } : {});
  const receipt = await tx.wait();

  const explorerUrl = explorerBase ? `${explorerBase.replace(/\/$/, '')}/${tx.hash}` : undefined;
  return { hash: tx.hash, receipt, explorerUrl };
}

// Confirm delivery (buyer only) - releases escrow immediately
export async function confirmDelivery(onchainId: number) {
  if (typeof window === 'undefined') throw new Error('Not running in browser');
  const anyWindow: any = window as any;
  const ethereum = anyWindow.ethereum;
  if (!ethereum) throw new Error('No injected wallet found. Install MetaMask.');

  const provider = new ethers.BrowserProvider(ethereum as any);
  const signer = await provider.getSigner();

  const contractAddress = (import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS as string) || (process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS as string) || '';
  if (!contractAddress) throw new Error('MARKETPLACE_CONTRACT_ADDRESS not configured');

  const explorerBase = (import.meta.env.VITE_TX_EXPLORER_URL as string) || '';
  const contract = new ethers.Contract(contractAddress, MarketplaceAbi as any, signer);

  let gasLimit: bigint | undefined;
  try {
    const estimate: bigint = await contract.estimateGas.confirmDelivery(onchainId);
    gasLimit = (estimate * 110n) / 100n;
  } catch {
    gasLimit = undefined;
  }

  const tx = await contract.confirmDelivery(onchainId, gasLimit ? { gasLimit } : {});
  const receipt = await tx.wait();

  const explorerUrl = explorerBase ? `${explorerBase.replace(/\/$/, '')}/${tx.hash}` : undefined;
  return { hash: tx.hash, receipt, explorerUrl };
}

// Release escrow after time period
export async function releaseEscrow(onchainId: number) {
  if (typeof window === 'undefined') throw new Error('Not running in browser');
  const anyWindow: any = window as any;
  const ethereum = anyWindow.ethereum;
  if (!ethereum) throw new Error('No injected wallet found. Install MetaMask.');

  const provider = new ethers.BrowserProvider(ethereum as any);
  const signer = await provider.getSigner();

  const contractAddress = (import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS as string) || (process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS as string) || '';
  if (!contractAddress) throw new Error('MARKETPLACE_CONTRACT_ADDRESS not configured');

  const explorerBase = (import.meta.env.VITE_TX_EXPLORER_URL as string) || '';
  const contract = new ethers.Contract(contractAddress, MarketplaceAbi as any, signer);

  let gasLimit: bigint | undefined;
  try {
    const estimate: bigint = await contract.estimateGas.releaseEscrow(onchainId);
    gasLimit = (estimate * 110n) / 100n;
  } catch {
    gasLimit = undefined;
  }

  const tx = await contract.releaseEscrow(onchainId, gasLimit ? { gasLimit } : {});
  const receipt = await tx.wait();

  const explorerUrl = explorerBase ? `${explorerBase.replace(/\/$/, '')}/${tx.hash}` : undefined;
  return { hash: tx.hash, receipt, explorerUrl };
}

// Raise a dispute
export async function raiseDispute(onchainId: number) {
  if (typeof window === 'undefined') throw new Error('Not running in browser');
  const anyWindow: any = window as any;
  const ethereum = anyWindow.ethereum;
  if (!ethereum) throw new Error('No injected wallet found. Install MetaMask.');

  const provider = new ethers.BrowserProvider(ethereum as any);
  const signer = await provider.getSigner();

  const contractAddress = (import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS as string) || (process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS as string) || '';
  if (!contractAddress) throw new Error('MARKETPLACE_CONTRACT_ADDRESS not configured');

  const explorerBase = (import.meta.env.VITE_TX_EXPLORER_URL as string) || '';
  const contract = new ethers.Contract(contractAddress, MarketplaceAbi as any, signer);

  let gasLimit: bigint | undefined;
  try {
    const estimate: bigint = await contract.estimateGas.raiseDispute(onchainId);
    gasLimit = (estimate * 110n) / 100n;
  } catch {
    gasLimit = undefined;
  }

  const tx = await contract.raiseDispute(onchainId, gasLimit ? { gasLimit } : {});
  const receipt = await tx.wait();

  const explorerUrl = explorerBase ? `${explorerBase.replace(/\/$/, '')}/${tx.hash}` : undefined;
  return { hash: tx.hash, receipt, explorerUrl };
}

// Resolve dispute (admin only)
export async function resolveDispute(onchainId: number, favorBuyer: boolean) {
  if (typeof window === 'undefined') throw new Error('Not running in browser');
  const anyWindow: any = window as any;
  const ethereum = anyWindow.ethereum;
  if (!ethereum) throw new Error('No injected wallet found. Install MetaMask.');

  const provider = new ethers.BrowserProvider(ethereum as any);
  const signer = await provider.getSigner();

  const contractAddress = (import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS as string) || (process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS as string) || '';
  if (!contractAddress) throw new Error('MARKETPLACE_CONTRACT_ADDRESS not configured');

  const explorerBase = (import.meta.env.VITE_TX_EXPLORER_URL as string) || '';
  const contract = new ethers.Contract(contractAddress, MarketplaceAbi as any, signer);

  let gasLimit: bigint | undefined;
  try {
    const estimate: bigint = await contract.estimateGas.resolveDispute(onchainId, favorBuyer);
    gasLimit = (estimate * 110n) / 100n;
  } catch {
    gasLimit = undefined;
  }

  const tx = await contract.resolveDispute(onchainId, favorBuyer, gasLimit ? { gasLimit } : {});
  const receipt = await tx.wait();

  const explorerUrl = explorerBase ? `${explorerBase.replace(/\/$/, '')}/${tx.hash}` : undefined;
  return { hash: tx.hash, receipt, explorerUrl };
}