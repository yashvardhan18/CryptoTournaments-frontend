import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tournamentService } from '../services/tournament';
import { contractService } from '../services/contract';
import { TournamentCard } from './TournamentCard';
import { useWallet } from '../context/WalletContext';
import { Toaster } from 'react-hot-toast';

export const TournamentList: React.FC = () => {
  const { wallet } = useWallet();
  const queryClient = useQueryClient();
  
  const { data: tournaments = [], isLoading, error } = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentService.getAllTournaments,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleJoinTournament = async (tournamentId: number) => {
    if (!wallet.address) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // First, call the smart contract
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      await contractService.joinTournament(tournamentId, tournament.entryFee);
      
      // Then, update the backend
      const result = await tournamentService.joinTournament(tournamentId, wallet.address);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to join tournament');
      }

      // Refetch tournaments to update the UI
      await queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to join tournament';
      throw new Error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-4">
        <p>Error loading tournaments. Please try again later.</p>
      </div>
    );
  }

  if (!tournaments.length) {
    return (
      <div className="text-center text-purple-200 p-4">
        <p>No tournaments available at the moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
            onJoin={handleJoinTournament}
          />
        ))}
      </div>
      <Toaster position="bottom-right" />
    </>
  );
};