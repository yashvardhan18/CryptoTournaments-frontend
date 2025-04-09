import { ethers } from 'ethers';
import contractAbi from '../abi.json';
import { toast } from 'react-hot-toast';

const CONTRACT_ADDRESS = '0x359d14410282EEAFcc9CD92c2CDbAB9386348a35';

export class ContractService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.BrowserProvider | null = null;

  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Request account access if needed
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await this.provider.getSigner();
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      throw error;
    }
  }

  async joinTournament(tournamentId: number, entryFee: string) {
    if (!this.contract) {
      await this.initialize();
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      // Convert entry fee to hex for MetaMask
      const entryFeeHex = ethers.toQuantity(entryFee);

      // Prepare transaction parameters
      const txParams = {
        to: CONTRACT_ADDRESS,
        from: await this.contract.runner.getAddress(),
        value: entryFeeHex,
        data: this.contract.interface.encodeFunctionData('joinTournament', [tournamentId])
      };

      // Show pending toast
      const pendingToast = toast.loading('Preparing transaction...');

      // Request transaction signature through MetaMask
      const txResponse = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      // Update toast to show transaction is being processed
      toast.loading('Transaction submitted, waiting for confirmation...', {
        id: pendingToast,
      });

      // Wait for transaction confirmation
      const receipt = await this.provider!.waitForTransaction(txResponse);

      // Show success toast
      toast.success('Successfully joined tournament!', {
        id: pendingToast,
      });

      return receipt;
    } catch (error: any) {
      // Handle user rejection
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        toast.error('Transaction was rejected');
        throw new Error('Transaction rejected by user');
      }

      // Handle specific contract errors
      if (error.message?.includes('Tournament not open for joining')) {
        toast.error('Tournament is not open for joining');
        throw new Error('Tournament is not open for joining');
      } else if (error.message?.includes('Registration period ended')) {
        toast.error('Registration period has ended');
        throw new Error('Registration period has ended');
      } else if (error.message?.includes('Tournament is full')) {
        toast.error('Tournament is full');
        throw new Error('Tournament is full');
      } else if (error.message?.includes('Incorrect ETH amount sent')) {
        toast.error('Incorrect entry fee amount');
        throw new Error('Incorrect entry fee amount');
      } else if (error.message?.includes('Already joined this tournament')) {
        toast.error('You have already joined this tournament');
        throw new Error('You have already joined this tournament');
      } else if (error.message?.includes('onlyRegisteredPlayer')) {
        toast.error('You must register as a player first');
        throw new Error('You must register as a player first');
      }

      // Handle any other errors
      toast.error('Failed to join tournament');
      throw error;
    }
  }

  async registerPlayer(username: string) {
    if (!this.contract) {
      await this.initialize();
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      // Prepare transaction parameters
      const txParams = {
        to: CONTRACT_ADDRESS,
        from: await this.contract.runner.getAddress(),
        data: this.contract.interface.encodeFunctionData('registerPlayer', [username])
      };

      // Show pending toast
      const pendingToast = toast.loading('Preparing registration...');

      // Request transaction signature through MetaMask
      const txResponse = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      // Update toast to show transaction is being processed
      toast.loading('Registration submitted, waiting for confirmation...', {
        id: pendingToast,
      });

      // Wait for transaction confirmation
      const receipt = await this.provider!.waitForTransaction(txResponse);

      // Show success toast
      toast.success('Successfully registered as a player!', {
        id: pendingToast,
      });

      return receipt;
    } catch (error: any) {
      // Handle user rejection
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        toast.error('Registration was rejected');
        throw new Error('Registration rejected by user');
      }

      // Handle any other errors
      toast.error('Failed to register as a player');
      throw error;
    }
  }
}

export const contractService = new ContractService();