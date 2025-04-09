import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import type { WalletState } from '../types';

interface WalletContextType {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const BSC_TESTNET_PARAMS = {
  chainId: '0x61',
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const WalletContext = createContext<WalletContextType | null>(null);

const generateNonce = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

async function connectToBackend(address: string, signature: string, message: string, retryCount = 0): Promise<boolean> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/wallet/connect`,
      {
        address,
        signature,
        message,
      },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );
    return !!response.data;
  } catch (error: any) {
    console.warn(`Backend connection attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectToBackend(address, signature, message, retryCount + 1);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.warn('Backend connection timeout - server may be down');
    } else if (error.response) {
      console.warn('Backend error:', error.response.data);
    } else if (error.request) {
      console.warn('No response from backend - server may be unreachable');
    }
    
    return false;
  }
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>(() => {
    const savedWallet = localStorage.getItem('wallet');
    if (savedWallet) {
      return JSON.parse(savedWallet);
    }
    return {
      address: null,
      chainId: null,
      balance: null,
      isConnecting: false,
      error: null,
    };
  });

  const connect = async () => {
    if (!window.ethereum) {
      setWallet(prev => ({ ...prev, error: 'Please install MetaMask' }));
      return;
    }

    try {
      setWallet(prev => ({ ...prev, isConnecting: true, error: null }));
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(accounts[0]);
      const signer = await provider.getSigner();

      // Generate message for signing
      const nonce = generateNonce();
      const message = `Sign this message to connect to CryptoTournaments: ${nonce}`;
      
      // Get signature
      const signature = await signer.signMessage(message);

      // Try to connect to backend but proceed even if it fails
      const backendConnected = await connectToBackend(accounts[0], signature, message);
      
      const newWalletState = {
        address: accounts[0],
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance),
        isConnecting: false,
        error: backendConnected ? null : 'Connected to wallet, but backend sync failed',
      };

      setWallet(newWalletState);
      localStorage.setItem('wallet', JSON.stringify(newWalletState));
    } catch (error: any) {
      const errorState = {
        address: null,
        chainId: null,
        balance: null,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      };
      setWallet(errorState);
      localStorage.setItem('wallet', JSON.stringify(errorState));
    }
  };

  const disconnect = () => {
    const disconnectedState = {
      address: null,
      chainId: null,
      balance: null,
      isConnecting: false,
      error: null,
    };
    setWallet(disconnectedState);
    localStorage.removeItem('wallet');
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_TESTNET_PARAMS.chainId }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_TESTNET_PARAMS],
          });
        } catch (addError) {
          setWallet(prev => ({
            ...prev,
            error: 'Failed to add BSC Testnet',
          }));
        }
      }
    }
  };

  const updateWalletInfo = async () => {
    if (!wallet.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(wallet.address);

      const updatedWalletState = {
        ...wallet,
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance),
      };

      setWallet(updatedWalletState);
      localStorage.setItem('wallet', JSON.stringify(updatedWalletState));
    } catch (error) {
      console.error('Failed to update wallet info:', error);
    }
  };

  useEffect(() => {
    if (wallet.address && window.ethereum) {
      connect();
    }

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        connect();
      });

      window.ethereum.on('chainChanged', () => {
        connect();
      });

      // Set up periodic balance updates
      const intervalId = setInterval(updateWalletInfo, 10000);

      return () => {
        window.ethereum.removeAllListeners();
        clearInterval(intervalId);
      };
    }
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, switchNetwork }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};