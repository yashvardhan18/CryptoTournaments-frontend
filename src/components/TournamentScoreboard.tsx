import React from 'react';
import { Player } from '../types';
import { Trophy } from 'lucide-react';

interface TournamentScoreboardProps {
  players: Player[];
  winners?: string[];
  isCompleted: boolean;
  isCanceled: boolean;
}

export const TournamentScoreboard: React.FC<TournamentScoreboardProps> = ({
  players = [],
  winners,
  isCompleted,
  isCanceled
}) => {
  const sortedPlayers = [...(players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="mt-4 bg-black/20 rounded-lg p-4">
      <h4 className="text-lg font-semibold text-white mb-4">
        {isCompleted ? 'Final Results' : isCanceled ? 'Tournament Canceled' : 'Live Scoreboard'}
      </h4>

      {winners && winners.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <Trophy className="w-6 h-6" />
            <span className="font-semibold">Winner{winners.length > 1 ? 's' : ''}</span>
          </div>
          <div className="mt-2 space-y-1">
            {winners.map((winner, index) => (
              <div key={winner} className="text-yellow-300">
                {`${index + 1}. ${winner.slice(0, 6)}...${winner.slice(-4)}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {isCanceled ? (
        <p className="text-red-400">This tournament has been canceled.</p>
      ) : (
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.address}
              className={`flex items-center justify-between p-2 rounded ${
                winners?.includes(player.address)
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-white/5 text-purple-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center">{index + 1}</span>
                <span>{player.username || `${player.address.slice(0, 6)}...${player.address.slice(-4)}`}</span>
              </div>
              <span className="font-mono">{player.score.toLocaleString()}</span>
            </div>
          ))}

          {sortedPlayers.length === 0 && (
            <p className="text-purple-300 text-center">No scores recorded yet</p>
          )}
        </div>
      )}
    </div>
  );
};