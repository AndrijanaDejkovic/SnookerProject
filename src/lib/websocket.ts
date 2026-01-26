// WebSocket manager for live match updates
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextApiResponse } from 'next';

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: {
    server: {
      io: SocketIOServer;
    } & HTTPServer;
  };
}

let io: SocketIOServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer) => {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    },
    path: '/api/socket'
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a specific match room
    socket.on('join-match', (matchId: string) => {
      socket.join(`match-${matchId}`);
      console.log(`Client ${socket.id} joined match-${matchId}`);
    });

    // Leave a match room
    socket.on('leave-match', (matchId: string) => {
      socket.leave(`match-${matchId}`);
      console.log(`Client ${socket.id} left match-${matchId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('WebSocket not initialized. Call initializeWebSocket first.');
  }
  return io;
};

// Broadcast match update to all clients watching a specific match
export const broadcastMatchUpdate = (matchId: string, data: any) => {
  if (io) {
    io.to(`match-${matchId}`).emit('match-update', data);
    console.log(`Broadcasting update for match ${matchId}:`, data);
  }
};

// Broadcast frame update
export const broadcastFrameUpdate = (matchId: string, data: any) => {
  if (io) {
    io.to(`match-${matchId}`).emit('frame-update', data);
    console.log(`Broadcasting frame update for match ${matchId}`);
  }
};

// Broadcast score change
export const broadcastScoreUpdate = (matchId: string, data: any) => {
  if (io) {
    io.to(`match-${matchId}`).emit('score-update', data);
    console.log(`Broadcasting score update for match ${matchId}`);
  }
};
