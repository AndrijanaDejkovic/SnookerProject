'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  score?: number;
  framesWon?: number;
}

interface ScoreUpdate {
  matchId: string;
  frameNumber: number;
  player1: Player;
  player2: Player;
  timestamp: string;
}

interface FrameUpdate {
  matchId: string;
  frameNumber: number;
  status: string;
  winner: Player;
  loser: Player;
  timestamp: string;
}

interface MatchUpdate {
  matchId: string;
  status: string;
  players?: {
    player1: Player;
    player2: Player;
  };
  winner?: Player;
  message: string;
  timestamp: string;
}

interface PlayerOption {
  id: string;
  name: string;
}

export default function LiveScorePage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [matchId, setMatchId] = useState<string>('');
  const [currentMatch, setCurrentMatch] = useState<MatchUpdate | null>(null);
  const [currentFrame, setCurrentFrame] = useState<ScoreUpdate | null>(null);
  const [frameHistory, setFrameHistory] = useState<FrameUpdate[]>([]);
  const [connected, setConnected] = useState(false);
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [bestOf, setBestOf] = useState(7);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // First, initialize the WebSocket server by hitting the endpoint
    const initWebSocket = async () => {
      try {
        console.log('🔌 Initializing WebSocket server...');
        await fetch('/api/socket');
        console.log('✅ WebSocket server initialized');
      } catch (error) {
        console.error('❌ Failed to initialize WebSocket:', error);
      }

      // Small delay to ensure server is ready
      setTimeout(() => {
        console.log('🔌 Connecting to WebSocket...');
        
        // Initialize socket connection
        const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
          path: '/api/socket',
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
          console.log('✅ Connected to WebSocket, ID:', socketInstance.id);
          setConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('❌ Disconnected from WebSocket:', reason);
          setConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
        });

        socketInstance.on('match-update', (data: MatchUpdate) => {
          console.log('📢 Match update received:', data);
          setCurrentMatch(data);
        });

        socketInstance.on('score-update', (data: ScoreUpdate) => {
          console.log('📢 Score update received:', data);
          setCurrentFrame(data);
        });

        socketInstance.on('frame-update', (data: FrameUpdate) => {
          console.log('📢 Frame completed:', data);
          setFrameHistory(prev => [...prev, data]);
          // Reset current frame
          setCurrentFrame(null);
        });

        setSocket(socketInstance);
      }, 500);
    };

    initWebSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch all players for quick selection
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/neo4j/players/create');
        if (response.ok) {
          const data = await response.json();
          setAllPlayers(data);
        }
      } catch (error) {
        console.warn('Failed to fetch players:', error);
      }
    };

    fetchPlayers();
  }, []);

  const startMatch = async () => {
    if (!player1Id || !player2Id) {
      alert('Please provide both player IDs');
      return;
    }

    if (player1Id === player2Id) {
      alert('Players must be different');
      return;
    }

    setLoading(true);

    try {
      // Refresh WebSocket server before starting match
      console.log('🔄 Ensuring WebSocket server is ready...');
      await fetch('/api/socket');
      console.log('✅ WebSocket server ready');
      
      // Small delay to ensure server is fully initialized
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await fetch('/api/live-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1Id,
          player2Id,
          bestOf
        })
      });

      const result = await response.json();
      if (result.success) {
        const newMatchId = result.data.matchId;
        setMatchId(newMatchId);
        
        // Join match room
        if (socket) {
          console.log('🎯 Joining match room:', newMatchId);
          socket.emit('join-match', newMatchId);
        }
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error starting match:', error);
      alert('Failed to start match');
    } finally {
      setLoading(false);
    }
  };

  const stopMatch = async () => {
    if (!matchId) return;

    try {
      await fetch(`/api/redis/live/simulate?matchId=${matchId}`, {
        method: 'DELETE'
      });
      
      if (socket) {
        socket.emit('leave-match', matchId);
      }
      
      setMatchId('');
      setCurrentMatch(null);
      setCurrentFrame(null);
    } catch (error) {
      console.error('Error stopping match:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🎱 Live Snooker Match Simulator</h1>
      
      <div style={{ 
        padding: '10px', 
        marginBottom: '20px', 
        backgroundColor: connected ? '#4CAF50' : '#f44336', 
        color: 'white',
        borderRadius: '5px'
      }}>
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {!matchId ? (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h2>Start New Match</h2>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Player 1: </label>
            <select 
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              style={{ 
                padding: '10px', 
                width: '100%', 
                maxWidth: '400px',
                borderRadius: '5px',
                border: '1px solid #ccc'
              }}
            >
              <option value="">-- Select Player 1 --</option>
              {allPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Player 2: </label>
            <select 
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              style={{ 
                padding: '10px', 
                width: '100%', 
                maxWidth: '400px',
                borderRadius: '5px',
                border: '1px solid #ccc'
              }}
            >
              <option value="">-- Select Player 2 --</option>
              {allPlayers.filter(p => p.id !== player1Id).map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Best of: </label>
            <select 
              value={bestOf}
              onChange={(e) => setBestOf(Number(e.target.value))}
              style={{ 
                padding: '10px', 
                borderRadius: '5px',
                border: '1px solid #ccc'
              }}
            >
              <option value={3}>Best of 3</option>
              <option value={5}>Best of 5</option>
              <option value={7}>Best of 7</option>
              <option value={9}>Best of 9</option>
              <option value={11}>Best of 11</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={startMatch}
              disabled={loading || !player1Id || !player2Id}
              style={{
                padding: '12px 24px',
                backgroundColor: (loading || !player1Id || !player2Id) ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: (loading || !player1Id || !player2Id) ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {loading ? '🏃 Starting Match...' : '▶️ Start Live Match'}
            </button>
            {allPlayers.length === 0 && (
              <span style={{ color: '#f44336', fontSize: '14px' }}>
                Loading players...
              </span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ 
            backgroundColor: '#fff3cd', 
            padding: '20px', 
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <h2>Match ID: {matchId}</h2>
            <button 
              onClick={stopMatch}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Stop Match
            </button>
          </div>

          {currentMatch && (
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '20px', 
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h2>{currentMatch.message}</h2>
              <p><strong>Status:</strong> {currentMatch.status}</p>
              {currentMatch.players && (
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <div>
                    <strong>{currentMatch.players.player1.name}</strong>
                    <p>Frames: {currentMatch.players.player1.framesWon || 0}</p>
                  </div>
                  <div>
                    <strong>{currentMatch.players.player2.name}</strong>
                    <p>Frames: {currentMatch.players.player2.framesWon || 0}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentFrame && (
            <div style={{ 
              backgroundColor: '#c8e6c9', 
              padding: '20px', 
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h2>🔴 LIVE - Frame {currentFrame.frameNumber}</h2>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-around',
                fontSize: '24px',
                marginTop: '20px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                    {currentFrame.player1.name}
                  </div>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: 'bold',
                    color: '#2196F3'
                  }}>
                    {currentFrame.player1.score || 0}
                  </div>
                </div>
                <div style={{ fontSize: '48px', alignSelf: 'center' }}>vs</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                    {currentFrame.player2.name}
                  </div>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: 'bold',
                    color: '#f44336'
                  }}>
                    {currentFrame.player2.score || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {frameHistory.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>Frame History</h3>
              {frameHistory.map((frame, index) => (
                <div 
                  key={index}
                  style={{ 
                    backgroundColor: '#f5f5f5',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '5px'
                  }}
                >
                  <strong>Frame {frame.frameNumber}</strong> - {frame.status}
                  <p>
                    🏆 {frame.winner.name}: {frame.winner.score} (Frames Won: {frame.winner.framesWon})
                  </p>
                  <p>
                    {frame.loser.name}: {frame.loser.score} (Frames Won: {frame.loser.framesWon})
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
