import axios from 'axios';
import type { Tournament, TournamentResponse, JoinTournamentResponse, TournamentPlayers } from '../types';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

let socket: Socket | null = null;

async function makeRequest<T>(
  url: string, 
  method: 'get' | 'post' = 'get', 
  data?: any, 
  retryCount = 0
): Promise<T | null> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      data,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    return response.data;
  } catch (error: any) {
    console.warn(`API request attempt ${retryCount + 1} failed for ${url}:`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return makeRequest<T>(url, method, data, retryCount + 1);
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Server connection timeout - please try again');
    } else if (error.response) {
      throw new Error('Server error - please try again later');
    } else if (error.request) {
      throw new Error('Unable to reach server - please check your connection');
    }
    
    throw error;
  }
}

function initializeSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ['websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    socket.on('connect', () => {
      console.log('Connected to tournament server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from tournament server');
    });
  }
  return socket;
}

export const tournamentService = {
  async getAllTournaments(): Promise<Tournament[]> {
    try {
      const response = await makeRequest<TournamentResponse>('/api/tournaments');
      if (!response) return [];
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
      return [];
    }
  },

  async getTournamentById(id: number): Promise<Tournament | null> {
    try {
      const response = await makeRequest<TournamentResponse>(`/api/tournaments/${id}`);
      if (!response) return null;
      return response.data as Tournament;
    } catch (error) {
      console.error(`Failed to fetch tournament ${id}:`, error);
      return null;
    }
  },

  async getActiveTournaments(): Promise<Tournament[]> {
    try {
      const response = await makeRequest<TournamentResponse>('/api/tournaments/active');
      if (!response) return [];
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch active tournaments:', error);
      return [];
    }
  },

  async joinTournament(tournamentId: number, playerAddress: string): Promise<JoinTournamentResponse> {
    const response = await makeRequest<JoinTournamentResponse>(
      `/api/tournaments/${tournamentId}/join`,
      'post',
      { playerAddress }
    );
    
    if (!response) {
      throw new Error('Failed to join tournament');
    }
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to join tournament');
    }
    
    return response;
  },

  async getTournamentPlayers(tournamentId: number): Promise<TournamentPlayers> {
    const response = await makeRequest<{ success: boolean; data: TournamentPlayers }>(
      `/api/tournaments/${tournamentId}/players`,
      'get'
    );

    if (!response || !response.success) {
      throw new Error('Failed to fetch tournament players');
    }

    return response.data;
  },

  async enterTournamentGame(tournamentId: number, playerAddress: string): Promise<boolean> {
    const response = await makeRequest<{ success: boolean }>(
      `/api/tournaments/${tournamentId}/enter`,
      'post',
      { playerAddress }
    );

    return response?.success || false;
  },

  async getTournamentStatus(tournamentId: number): Promise<Tournament> {
    const response = await makeRequest<TournamentResponse>(
      `/api/tournaments/${tournamentId}/status`,
      'get'
    );

    if (!response || !response.success) {
      throw new Error('Failed to fetch tournament status');
    }

    return response.data as Tournament;
  },

  subscribeToTournament(tournamentId: number, callbacks: {
    onScoreUpdate?: (data: { playerAddress: string; score: number }) => void;
    onTournamentComplete?: (data: Tournament) => void;
    onTournamentCanceled?: (data: Tournament) => void;
  }) {
    const socket = initializeSocket();

    socket.emit('join-tournament', { tournamentId });

    socket.on('score-updated', callbacks.onScoreUpdate);
    socket.on('tournament-completed', callbacks.onTournamentComplete);
    socket.on('tournament-canceled', callbacks.onTournamentCanceled);

    return () => {
      socket.off('score-updated', callbacks.onScoreUpdate);
      socket.off('tournament-completed', callbacks.onTournamentComplete);
      socket.off('tournament-canceled', callbacks.onTournamentCanceled);
      socket.emit('leave-tournament', { tournamentId });
    };
  }
};