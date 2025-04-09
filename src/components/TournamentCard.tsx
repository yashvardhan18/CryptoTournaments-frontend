import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { Tournament, TournamentStatus, Player } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { Trophy, Users, Clock, Coins, Loader2, TowerControl as GameController } from 'lucide-react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { tournamentService } from '../services/tournament';
import { TournamentScoreboard } from './TournamentScoreboard.tsx';

interface TournamentCardProps {
  tournament: Tournament;
  onJoin: (tournamentId: number) => Promise<void>;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onJoin }) => {
  const { wallet } = useWallet();
  const [isJoining, setIsJoining] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  
  const startTimeDate = new Date(tournament.startTime * 1000);
  const endTimeDate = new Date(tournament.endTime * 1000);
  const lobbyCloseDate = new Date(tournament.lobbyCloseTime * 1000);
  
  const isLobbyOpen = Date.now() < tournament.lobbyCloseTime * 1000;
  const hasStarted = Date.now() > tournament.startTime * 1000;
  const hasEnded = Date.now() > tournament.endTime * 1000;
  const isActive = tournament.status === TournamentStatus.ACTIVE;
  const isCompleted = tournament.status === TournamentStatus.COMPLETED;
  const isCanceled = tournament.status === TournamentStatus.CANCELED;
  
  const getStatusText = () => {
    if (isCanceled) return 'Canceled';
    if (isCompleted) return 'Completed';
    if (hasEnded) return 'Ended';
    if (hasStarted) return 'In Progress';
    if (isLobbyOpen) return 'Registration Open';
    return 'Registration Closed';
  };

  const getStatusColor = () => {
    if (isCanceled) return 'bg-red-500';
    if (isCompleted) return 'bg-green-500';
    if (hasEnded) return 'bg-gray-500';
    if (hasStarted) return 'bg-green-500';
    if (isLobbyOpen) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  const handleJoinClick = async () => {
    try {
      setIsJoining(true);
      await onJoin(tournament.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join tournament');
    } finally {
      setIsJoining(false);
    }
  };

  const handleEnterGame = async () => {
    if (!wallet.address) return;
    
    try {
      setIsEntering(true);
      const success = await tournamentService.enterTournamentGame(tournament.id, wallet.address);
      if (success) {
        toast.success('Successfully entered the game!');
        // Here you would typically redirect to the game page or open the game interface
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to enter game');
    } finally {
      setIsEntering(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchPlayers = async () => {
      try {
        const result = await tournamentService.getTournamentPlayers(tournament.id);
        setPlayers(result.players || []);
      } catch (error) {
        console.error('Failed to fetch players:', error);
        setPlayers([]);
      }
    };

    if (isActive || isCompleted) {
      fetchPlayers();
      
      unsubscribe = tournamentService.subscribeToTournament(tournament.id, {
        onScoreUpdate: (data) => {
          setPlayers(prev => prev.map(player => 
            player.address === data.playerAddress 
              ? { ...player, score: data.score }
              : player
          ));
        },
        onTournamentComplete: (updatedTournament) => {
          tournament.status = updatedTournament.status;
          tournament.winners = updatedTournament.winners;
          fetchPlayers(); // Fetch final scores
        },
        onTournamentCanceled: (updatedTournament) => {
          tournament.status = updatedTournament.status;
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [tournament.id, isActive, isCompleted]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-white">{tournament.name}</h3>
        <span className={`${getStatusColor()} px-3 py-1 rounded-full text-sm font-medium text-white`}>
          {getStatusText()}
        </span>
      </div>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-purple-200">
          <Users className="w-5 h-5" />
          <span>{tournament.currentPlayers}/{tournament.maxPlayers} Players</span>
        </div>
        
        <div className="flex items-center gap-2 text-purple-200">
          <Clock className="w-5 h-5" />
          <div className="flex flex-col">
            <span>Starts: {format(startTimeDate, 'PPp')}</span>
            <span className="text-sm text-purple-300">
              {formatDistanceToNow(startTimeDate, { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-purple-200">
          <Coins className="w-5 h-5" />
          <span>{ethers.formatEther(tournament.entryFee)} BNB Entry Fee</span>
        </div>
      </div>

      <div className="space-y-4">
        {isActive && hasStarted && !hasEnded && (
          <button
            onClick={handleEnterGame}
            disabled={!wallet.address || isEntering}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isEntering ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GameController className="w-5 h-5" />
            )}
            {isEntering ? 'Entering Game...' : 'Get in Game'}
          </button>
        )}

        {!hasStarted && !isCanceled && (
          <button
            onClick={handleJoinClick}
            disabled={!wallet.address || !isLobbyOpen || tournament.currentPlayers >= tournament.maxPlayers || isJoining}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isJoining && <Loader2 className="w-5 h-5 animate-spin" />}
            {!wallet.address ? 'Connect Wallet to Join' :
             !isLobbyOpen ? 'Registration Closed' :
             tournament.currentPlayers >= tournament.maxPlayers ? 'Tournament Full' :
             isJoining ? 'Joining...' : 'Join Tournament'}
          </button>
        )}

        {(isActive || isCompleted || players.length > 0) && (
          <button
            onClick={() => setShowScoreboard(!showScoreboard)}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            {showScoreboard ? 'Hide Scoreboard' : 'Show Scoreboard'}
          </button>
        )}

        {showScoreboard && (
          <TournamentScoreboard
            players={players}
            winners={tournament.winners}
            isCompleted={isCompleted}
            isCanceled={isCanceled}
          />
        )}
      </div>
    </div>
  );
};