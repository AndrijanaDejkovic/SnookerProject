'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  nationality?: string;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface Match {
  id: string;
  tournament: string;
  players: string;
  round: string;
  bestOf: number;
  status: string;
  startTime: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    player1Id: '',
    player2Id: '',
    tournamentId: '',
    round: '',
    bestOf: 7,
    startTime: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch matches
      const matchesRes = await fetch('/api/neo4j/matches/create');
      const matchesData = await matchesRes.json();
      setMatches(matchesData.data || []);

      // Fetch players
      const playersRes = await fetch('/api/neo4j/players/create');
      const playersData = await playersRes.json();
      setPlayers(Array.isArray(playersData) ? playersData : playersData.data || []);

      // Fetch tournaments
      const tournamentsRes = await fetch('/api/neo4j/tournaments/all');
      const tournamentsData = await tournamentsRes.json();
      setTournaments(tournamentsData.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player1Id || !formData.player2Id || !formData.tournamentId || !formData.round) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.player1Id === formData.player2Id) {
      alert('Please select different players');
      return;
    }

    try {
      const response = await fetch('/api/neo4j/matches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1Id: formData.player1Id,
          player2Id: formData.player2Id,
          tournamentId: formData.tournamentId,
          round: formData.round,
          bestOf: formData.bestOf,
          startTime: `${formData.startTime}:00Z`
        })
      });

      if (response.ok) {
        alert('Match created successfully!');
        setShowCreateForm(false);
        setFormData({
          player1Id: '',
          player2Id: '',
          tournamentId: '',
          round: '',
          bestOf: 7,
          startTime: new Date().toISOString().slice(0, 16)
        });
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create match');
      }
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Error creating match');
    }
  };

  const handleFinishMatch = async (matchId: string, winnerId: string) => {
    if (!winnerId) {
      alert('Please select a winner');
      return;
    }

    try {
      const response = await fetch('/api/neo4j/matches/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          winner: winnerId,
          status: 'COMPLETED'
        })
      });

      if (response.ok) {
        alert('Match completed successfully!');
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update match');
      }
    } catch (error) {
      console.error('Error updating match:', error);
      alert('Error updating match');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">🎯 Matches</h1>
            <div className="flex gap-4">
              <Link href="/leaderboard" className="text-blue-600 hover:text-blue-800 font-medium">
                📊 Leaderboard
              </Link>
              <Link href="/admin" className="text-blue-600 hover:text-blue-800 font-medium">
                ⚙️ Admin Panel
              </Link>
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
                🏠 Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Match Button */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Tournament Matches</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            {showCreateForm ? 'Cancel' : '+ Create New Match'}
          </button>
        </div>

        {/* Create Match Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">Create New Match</h3>
            <form onSubmit={handleCreateMatch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tournament</label>
                <select
                  required
                  value={formData.tournamentId}
                  onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Tournament</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
                <select
                  required
                  value={formData.round}
                  onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Round</option>
                  <option value="Quarter-Final">Quarter-Final</option>
                  <option value="Semi-Final">Semi-Final</option>
                  <option value="Final">Final</option>
                  <option value="Round 1">Round 1</option>
                  <option value="Round 2">Round 2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player 1</label>
                <select
                  required
                  value={formData.player1Id}
                  onChange={(e) => setFormData({ ...formData, player1Id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Player 1</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.nationality})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player 2</label>
                <select
                  required
                  value={formData.player2Id}
                  onChange={(e) => setFormData({ ...formData, player2Id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Player 2</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} disabled={p.id === formData.player1Id}>
                      {p.name} ({p.nationality})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Best Of</label>
                <select
                  value={formData.bestOf}
                  onChange={(e) => setFormData({ ...formData, bestOf: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                  <option value={9}>Best of 9</option>
                  <option value={11}>Best of 11</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 mr-2"
                >
                  Create Match
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Matches Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tournament</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Players</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Of</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No matches found. Create your first match!
                  </td>
                </tr>
              ) : (
                matches.map((match) => (
                  <tr key={match.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{match.tournament}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{match.players}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{match.round}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{match.bestOf}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        match.status === 'COMPLETED'
                          ? 'bg-gray-100 text-gray-800'
                          : match.status === 'ONGOING'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {match.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(match.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {match.status !== 'COMPLETED' && (
                        <MatchWinnerSelector
                          matchId={match.id}
                          players={players}
                          onWinnerSelected={handleFinishMatch}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function MatchWinnerSelector({ 
  matchId, 
  players, 
  onWinnerSelected 
}: { 
  matchId: string; 
  players: Player[]; 
  onWinnerSelected: (matchId: string, winnerId: string) => void;
}) {
  const [selectedWinner, setSelectedWinner] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWinner) {
      onWinnerSelected(matchId, selectedWinner);
      setShowForm(false);
      setSelectedWinner('');
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
      >
        Set Winner
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <select
        value={selectedWinner}
        onChange={(e) => setSelectedWinner(e.target.value)}
        className="text-xs border rounded px-2 py-1"
        required
      >
        <option value="">Select Winner</option>
        {players.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
      >
        ✕
      </button>
    </form>
  );
}
