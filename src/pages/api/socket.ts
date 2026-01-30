import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/lib/websocket';
import { setGlobalIo } from '@/lib/socket-manager';

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('🔧 Setting up Socket.IO server...');
    
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      }
    });

    io.on('connection', (socket) => {
      console.log('✅ Client connected:', socket.id);

      socket.on('join-match', (matchId) => {
        console.log(`🎯 Client ${socket.id} joined match room: ${matchId}`);
        socket.join(matchId);
      });

      socket.on('leave-match', (matchId) => {
        console.log(`👋 Client ${socket.id} left match room: ${matchId}`);
        socket.leave(matchId);
      });

      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
    
    // Set the global WebSocket instance for broadcasting from other parts of the app
    setGlobalIo(io);
    console.log('✅ Global WebSocket instance set successfully');
  } else {
    // Server already exists, but make sure global instance is set
    console.log('🔄 Socket.IO server already exists, refreshing global instance...');
    setGlobalIo(res.socket.server.io);
    console.log('✅ Global WebSocket instance refreshed');
  }
  
  res.end();
}
