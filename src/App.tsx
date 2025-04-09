import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './context/WalletContext';
import WalletConnect from './components/WalletConnect';
import { TournamentList } from './components/TournamentList';
import { Trophy } from 'lucide-react';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white">
            <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-10">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-8 h-8 text-purple-400" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      CryptoTournaments
                    </h1>
                  </div>
                  <WalletConnect />
                </div>
              </div>
            </header>

            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={
                  <div className="space-y-8">
                    <div className="text-center">
                      <h2 className="text-4xl font-bold mb-4">Welcome to CryptoTournaments</h2>
                      <p className="text-xl text-purple-200 mb-8">
                        Connect your wallet to start competing in blockchain-based tournaments
                      </p>
                    </div>
                    <TournamentList />
                  </div>
                } />
                {/* Additional routes will be added in the next iteration */}
              </Routes>
            </main>

            <footer className="border-t border-white/10 backdrop-blur-sm mt-auto">
              <div className="container mx-auto px-4 py-6">
                <div className="text-center text-purple-200">
                  © 2025 CryptoTournaments. All rights reserved.
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;