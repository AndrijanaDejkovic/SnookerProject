import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/lib/websocket';
import { setGlobalIo } from '@/lib/socket-manager';

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...');
    
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-match', (matchId) => {
        console.log(`Client ${socket.id} joined match ${matchId}`);
        socket.join(matchId);
      });

      socket.on('leave-match', (matchId) => {
        console.log(`Client ${socket.id} left match ${matchId}`);
        socket.leave(matchId);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
    
    // Set the global WebSocket instance for broadcasting from other parts of the app
    setGlobalIo(io);
  }
  
  res.end();
}
