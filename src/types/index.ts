import { Socket } from 'socket.io-client';

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
}

export interface Tournament {
  id: number;
  name: string;
  entryFee: string;
  maxPlayers: number;
  currentPlayers: number;
  startTime: number;
  endTime: number;
  lobbyCloseTime: number;
  gameType: number;
  status: TournamentStatus;
  createdAt: string;
  updatedAt: string;
  winners?: string[];
}

export enum TournamentStatus {
  CREATED = 0,
  ACTIVE = 1,
  COMPLETED = 2,
  CANCELED = 3
}

export interface TournamentResponse {
  success: boolean;
  data: Tournament | Tournament[];
  message?: string;
}

export interface JoinTournamentResponse {
  success: boolean;
  message: string;
  data: {
    tournamentId: number;
    playerAddress: string;
    txHash: string;
    currentPlayers: number;
    maxPlayers: number;
  };
}

export interface Player {
  address: string;
  username: string;
  score: number;
  rank?: number;
}

export interface Score {
  tournamentId: number;
  playerAddress: string;
  score: number;
  timestamp: string;
}

export interface TournamentPlayers {
  players: Player[];
  lastUpdated: string;
}