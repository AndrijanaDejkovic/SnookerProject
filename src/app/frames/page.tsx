'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trophy, Target, Clock, Zap, Eye, Trash2, Edit } from 'lucide-react';

interface Frame {
  id: string;
  frameNumber: number;
  winnerScore: number;
  loserScore: number;
  duration: string;
  highestBreak: number;
  status: string;
  matchId: string;
}

interface Match {
  id: string;
  player1Name: string;
  player2Name: string;
  player1Id: string;
  player2Id: string;
  status: string;
  round: string;
  tournamentName?: string;
}

interface Player {
  id: string;
  name: string;
  nationality?: string;
}

interface CreateFrameRequest {
  matchId: string;
  winnerId: string;
  loserId: string;
  frameNumber: number;
  winnerScore: number;
  loserScore: number;
  duration?: string;
  highestBreak?: number;
  status: string;
}

export default function FramesPage() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateFrameRequest>({
    matchId: '',
    winnerId: '',
    loserId: '',
    frameNumber: 1,
    winnerScore: 0,
    loserScore: 0,
    duration: 'PT30M00S',
    highestBreak: 0,
    status: 'COMPLETED'
  });

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    loadFrames();
    loadMatches();
    loadPlayers();
  }, []);

  const loadFrames = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/neo4j/frames/create');
      const data = await response.json();
      
      if (data.success) {
        setFrames(data.data || []);
      } else {
        setMessage({ type: 'error', text: `Failed to load frames: ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error loading frames: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      const response = await fetch('/api/neo4j/matches/create');
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.data || []);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await fetch('/api/neo4j/players/create');
      const data = await response.json();
      
      if (data.success) {
        setPlayers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const handleMatchSelect = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
      setFormData(prev => ({
        ...prev,
        matchId: matchId,
        winnerId: '',
        loserId: ''
      }));
    }
  };

  const handlePlayerSelection = (playerId: string, role: 'winner' | 'loser') => {
    if (role === 'winner') {
      setFormData(prev => ({
        ...prev,
        winnerId: playerId,
        loserId: prev.loserId === playerId ? '' : prev.loserId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        loserId: playerId,
        winnerId: prev.winnerId === playerId ? '' : prev.winnerId
      }));
    }
  };

  const handleCreateFrame = async () => {
    if (!formData.matchId || !formData.winnerId || !formData.loserId) {
      setMessage({ type: 'error', text: 'Please select match, winner, and loser' });
      return;
    }

    if (formData.winnerId === formData.loserId) {
      setMessage({ type: 'error', text: 'Winner and loser must be different players' });
      return;
    }

    if (formData.winnerScore <= formData.loserScore) {
      setMessage({ type: 'error', text: 'Winner score must be higher than loser score' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/neo4j/frames/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowCreateForm(false);
        setFormData({
          matchId: '',
          winnerId: '',
          loserId: '',
          frameNumber: 1,
          winnerScore: 0,
          loserScore: 0,
          duration: 'PT30M00S',
          highestBreak: 0,
          status: 'COMPLETED'
        });
        setSelectedMatch(null);
        loadFrames();
        loadMatches(); // Reload to get updated match status
      } else {
        setMessage({ type: 'error', text: `Failed to create frame: ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error creating frame: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || playerId;
  };

  const formatDuration = (duration: string) => {
    try {
      // Parse ISO 8601 duration (PT30M00S)
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
      }
      return duration;
    } catch {
      return duration;
    }
  };

  const getMatchFrames = (matchId: string) => {
    return frames.filter(f => f.matchId === matchId).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Frame Management</h1>
              <p className="text-gray-600">Create and manage individual frames within matches</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/matches">
              <Button variant="outline">
                <Trophy className="h-4 w-4 mr-2" />
                Matches
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Frame
            </Button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Create Frame Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Frame</CardTitle>
              <CardDescription>Add a frame result to an existing match</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Match Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Match</label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {matches.filter(m => m.status !== 'COMPLETED').map(match => (
                    <div
                      key={match.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.matchId === match.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleMatchSelect(match.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {match.player1Name} vs {match.player2Name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {match.round} • {match.tournamentName || 'Tournament'}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {getMatchFrames(match.id)} frames
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {matches.filter(m => m.status !== 'COMPLETED').length === 0 && (
                  <p className="text-gray-500 text-sm">No active matches available. Create a match first.</p>
                )}
              </div>

              {/* Player Selection (only show if match is selected) */}
              {selectedMatch && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Frame Winner</label>
                    <div className="space-y-2">
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.winnerId === selectedMatch.player1Id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePlayerSelection(selectedMatch.player1Id, 'winner')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedMatch.player1Name}</span>
                          {formData.winnerId === selectedMatch.player1Id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.winnerId === selectedMatch.player2Id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePlayerSelection(selectedMatch.player2Id, 'winner')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedMatch.player2Name}</span>
                          {formData.winnerId === selectedMatch.player2Id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Frame Loser</label>
                    <div className="space-y-2">
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.loserId === selectedMatch.player1Id 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePlayerSelection(selectedMatch.player1Id, 'loser')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedMatch.player1Name}</span>
                          {formData.loserId === selectedMatch.player1Id && (
                            <div className="h-4 w-4 bg-red-600 rounded-full" />
                          )}
                        </div>
                      </div>
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.loserId === selectedMatch.player2Id 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePlayerSelection(selectedMatch.player2Id, 'loser')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedMatch.player2Name}</span>
                          {formData.loserId === selectedMatch.player2Id && (
                            <div className="h-4 w-4 bg-red-600 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Frame Details */}
              {selectedMatch && formData.winnerId && formData.loserId && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Frame Number</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 border rounded-lg"
                      value={formData.frameNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, frameNumber: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Winner Score</label>
                    <input
                      type="number"
                      min="0"
                      max="147"
                      className="w-full p-2 border rounded-lg"
                      value={formData.winnerScore}
                      onChange={(e) => setFormData(prev => ({ ...prev, winnerScore: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Loser Score</label>
                    <input
                      type="number"
                      min="0"
                      max="146"
                      className="w-full p-2 border rounded-lg"
                      value={formData.loserScore}
                      onChange={(e) => setFormData(prev => ({ ...prev, loserScore: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Highest Break</label>
                    <input
                      type="number"
                      min="0"
                      max="147"
                      className="w-full p-2 border rounded-lg"
                      value={formData.highestBreak}
                      onChange={(e) => setFormData(prev => ({ ...prev, highestBreak: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 border rounded-lg"
                      placeholder="30"
                      onChange={(e) => {
                        const minutes = parseInt(e.target.value) || 30;
                        setFormData(prev => ({ ...prev, duration: `PT${minutes}M00S` }));
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({
                      matchId: '',
                      winnerId: '',
                      loserId: '',
                      frameNumber: 1,
                      winnerScore: 0,
                      loserScore: 0,
                      duration: 'PT30M00S',
                      highestBreak: 0,
                      status: 'COMPLETED'
                    });
                    setSelectedMatch(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateFrame} 
                  disabled={loading || !formData.matchId || !formData.winnerId || !formData.loserId}
                >
                  {loading ? 'Creating...' : 'Create Frame'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Frames List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Frames ({frames.length})</span>
              <Button variant="outline" size="sm" onClick={loadFrames} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </CardTitle>
            <CardDescription>All frame results across all matches</CardDescription>
          </CardHeader>
          <CardContent>
            {frames.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No frames created yet.</p>
                <p className="text-sm">Create frames to see detailed match results and improve leaderboard accuracy.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {frames
                  .sort((a, b) => a.matchId.localeCompare(b.matchId) || a.frameNumber - b.frameNumber)
                  .map((frame) => {
                    const match = matches.find(m => m.id === frame.matchId);
                    return (
                      <div key={frame.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="font-medium">
                                Frame {frame.frameNumber}
                              </div>
                              <div className="text-sm text-gray-600">
                                {match ? `${match.player1Name} vs ${match.player2Name}` : `Match ${frame.matchId}`}
                              </div>
                              {match?.tournamentName && (
                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {match.tournamentName}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-6 mt-2">
                              <div className="flex items-center space-x-2">
                                <Trophy className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">
                                  Score: {frame.winnerScore} - {frame.loserScore}
                                </span>
                              </div>
                              {frame.highestBreak > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Zap className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm">Break: {frame.highestBreak}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-sm">{formatDuration(frame.duration)}</span>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                frame.status === 'COMPLETED' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {frame.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
