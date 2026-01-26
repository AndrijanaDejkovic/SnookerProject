// Global Socket.IO manager for server-side broadcasting
import { Server } from 'socket.io';

let globalIo: Server | null = null;

export const setGlobalIo = (io: Server) => {
  globalIo = io;
  console.log('Global WebSocket instance set');
};

export const getGlobalIo = (): Server | null => {
  return globalIo;
};

// Broadcast functions that use the global instance
export const broadcastMatchUpdate = (matchId: string, data: object) => {
  if (globalIo) {
    globalIo.to(matchId).emit('match-update', data);
    console.log(`Broadcasting match update for match ${matchId}:`, data);
  } else {
    console.warn('WebSocket not available for broadcasting');
  }
};

export const broadcastFrameUpdate = (matchId: string, data: object) => {
  if (globalIo) {
    globalIo.to(matchId).emit('frame-update', data);
    console.log(`Broadcasting frame update for match ${matchId}`);
  } else {
    console.warn('WebSocket not available for broadcasting');
  }
};

export const broadcastScoreUpdate = (matchId: string, data: object) => {
  if (globalIo) {
    globalIo.to(matchId).emit('score-update', data);
    console.log(`Broadcasting score update for match ${matchId}`);
  } else {
    console.warn('WebSocket not available for broadcasting');
  }
};
