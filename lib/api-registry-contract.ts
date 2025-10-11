import { ethers } from 'ethers';
import APIRegistryABI from '@/smart_contracts/apireg_abi.json';

// Contract address (update after deployment)
const API_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_API_REGISTRY_ADDRESS || '';

export interface APIData {
  owner: string;
  name: string;
  description: string;
  pricePerCall: bigint;
  monthlyQuota: bigint;
  active: boolean;
}

/**
 * Get a read-only contract instance (for querying)
 */
export function getAPIRegistryContract(providerOrSigner?: ethers.Provider | ethers.Signer) {
  if (!API_REGISTRY_ADDRESS) {
    throw new Error('API Registry contract address not configured. Set NEXT_PUBLIC_API_REGISTRY_ADDRESS in .env.local');
  }

  const provider = providerOrSigner || new ethers.JsonRpcProvider(process.env.RPC_URL);
  return new ethers.Contract(API_REGISTRY_ADDRESS, APIRegistryABI, provider);
}

/**
 * Get a contract instance with signer (for transactions)
 */
export function getAPIRegistryContractWithSigner(signer: ethers.Signer) {
  if (!API_REGISTRY_ADDRESS) {
    throw new Error('API Registry contract address not configured');
  }
  
  return new ethers.Contract(API_REGISTRY_ADDRESS, APIRegistryABI, signer);
}

/**
 * Register a new API on the blockchain
 */
export async function registerAPIOnChain(
  signer: ethers.Signer,
  name: string,
  description: string,
  pricePerCall: string, // in ETH
  monthlyQuota: number
): Promise<{ apiId: number; txHash: string }> {
  try {
    const contract = getAPIRegistryContractWithSigner(signer);
    
    // Convert price to wei
    const priceInWei = ethers.parseEther(pricePerCall);
    
    // Call the contract
    const tx = await contract.registerAPI(name, description, priceInWei, monthlyQuota);
    
    console.log('Transaction sent:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log('Transaction confirmed:', receipt);
    
    // Parse the APIRegistered event to get the API ID
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'APIRegistered';
      } catch {
        return false;
      }
    });
    
    let apiId = 0;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      apiId = Number(parsed?.args[0]); // First arg is apiId
    }
    
    return {
      apiId,
      txHash: receipt?.hash || tx.hash
    };
  } catch (error) {
    console.error('Error registering API on chain:', error);
    throw error;
  }
}

/**
 * Get API details from blockchain
 */
export async function getAPIFromChain(apiId: number): Promise<APIData> {
  try {
    const contract = getAPIRegistryContract();
    const api = await contract.getAPI(apiId);
    
    return {
      owner: api.owner,
      name: api.name,
      description: api.description,
      pricePerCall: api.pricePerCall,
      monthlyQuota: api.monthlyQuota,
      active: api.active
    };
  } catch (error) {
    console.error('Error fetching API from chain:', error);
    throw error;
  }
}

/**
 * Get total API count from blockchain
 */
export async function getAPICount(): Promise<number> {
  try {
    const contract = getAPIRegistryContract();
    const count = await contract.apiCount();
    return Number(count);
  } catch (error) {
    console.error('Error fetching API count:', error);
    throw error;
  }
}

/**
 * Set API status (active/inactive)
 */
export async function setAPIStatus(
  signer: ethers.Signer,
  apiId: number,
  active: boolean
): Promise<string> {
  try {
    const contract = getAPIRegistryContractWithSigner(signer);
    const tx = await contract.setAPIStatus(apiId, active);
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  } catch (error) {
    console.error('Error setting API status:', error);
    throw error;
  }
}

/**
 * Check if contract is deployed and accessible
 */
export async function isContractDeployed(): Promise<boolean> {
  try {
    if (!API_REGISTRY_ADDRESS) {
      return false;
    }
    
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const code = await provider.getCode(API_REGISTRY_ADDRESS);
    
    // If code is '0x', contract is not deployed
    return code !== '0x';
  } catch (error) {
    console.error('Error checking contract deployment:', error);
    return false;
  }
}

/**
 * Get contract info (for debugging)
 */
export function getContractInfo() {
  return {
    address: API_REGISTRY_ADDRESS,
    hasABI: APIRegistryABI.length > 0,
    functions: APIRegistryABI
      .filter((item: any) => item.type === 'function')
      .map((item: any) => item.name)
  };
}
