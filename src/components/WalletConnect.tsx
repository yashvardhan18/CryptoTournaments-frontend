import React from 'react';
import { useWallet } from '../context/WalletContext';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';

const WalletConnect: React.FC = () => {
  const { wallet, connect, disconnect, switchNetwork } = useWallet();

  const handleConnect = async () => {
    await connect();
    if (wallet.chainId !== 97) {
      await switchNetwork();
    }
  };

  if (!window.ethereum) {
    return (
      <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg">
        <AlertCircle className="w-5 h-5" />
        <span>Please install MetaMask</span>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Download
        </a>
      </div>
    );
  }

  if (wallet.error) {
    return (
      <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg">
        <AlertCircle className="w-5 h-5" />
        <span>{wallet.error}</span>
      </div>
    );
  }

  if (!wallet.address) {
    return (
      <button
        onClick={handleConnect}
        disabled={wallet.isConnecting}
        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
      >
        <Wallet className="w-5 h-5" />
        {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
        <div className="text-sm text-gray-500 dark:text-gray-400">Balance</div>
        <div className="font-medium">{Number(wallet.balance).toFixed(4)} BNB</div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
        <div className="text-sm text-gray-500 dark:text-gray-400">Address</div>
        <div className="font-medium">
          {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
        </div>
      </div>
      <button
        onClick={disconnect}
        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Disconnect
      </button>
    </div>
  );
};

export default WalletConnect;