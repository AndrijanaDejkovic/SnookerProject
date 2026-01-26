'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Modal, PlayerForm, MatchForm, TournamentForm } from '@/components/admin/forms';

interface Match {
  id: string;
  startTime: string;
  bestOf: number;
  status: string;
  players?: string;
  player1Id?: string;
  player2Id?: string;
  player1Name?: string;
  player2Name?: string;
  winner?: string;
  matchNumber?: number;
  round?: string;
  venue?: string;
  tournament?: string;
  date: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'tournaments' | 'frames'>('players');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'players', label: 'Players', icon: '👥' },
              { id: 'matches', label: 'Matches', icon: '🎯' },
              { id: 'tournaments', label: 'Tournaments', icon: '🏆' },
              { id: 'frames', label: 'Frames', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'players' | 'matches' | 'tournaments' | 'frames')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'players' && <PlayersSection />}
        {activeTab === 'matches' && <MatchesSection />}
        {activeTab === 'tournaments' && <TournamentsSection />}
        {activeTab === 'frames' && <FramesSection />}
      </main>
    </div>
  );
}

// Players Section
function PlayersSection() {
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<{id: string; name: string; country?: string} | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Players Management</h2>
        <button
          onClick={() => {
            setEditingPlayer(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add New Player
        </button>
      </div>
      <PlayersTable 
        key={refreshKey}
        onEdit={(player) => {
          setEditingPlayer(player);
          setShowModal(true);
        }}
        onRefresh={() => setRefreshKey(prev => prev + 1)}
      />
      
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPlayer(null);
        }}
        title={editingPlayer ? 'Edit Player' : 'Add New Player'}
      >
        <PlayerForm
          player={editingPlayer}
          onSubmit={() => {
            setRefreshKey(prev => prev + 1);
            setShowModal(false);
            setEditingPlayer(null);
          }}
          onClose={() => {
            setShowModal(false);
            setEditingPlayer(null);
          }}
        />
      </Modal>
    </div>
  );
}

function PlayersTable({ onEdit, onRefresh }: { onEdit: (player: {id: string; name: string; country?: string}) => void; onRefresh: () => void }) {
  const [players, setPlayers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/neo4j/players/create');
      const data = await response.json();
      // Players endpoint returns array directly
      setPlayers(Array.isArray(data) ? data : data.players || data.data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    try {
      const response = await fetch(`/api/neo4j/players/delete?playerId=${encodeURIComponent(playerId)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Player deleted successfully!');
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Error deleting player');
      }
    } catch (error) {
      console.error('Delete player error:', error);
      alert('Error deleting player');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {players.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                No players found
              </td>
            </tr>
          ) : (
            players.map((player: {id: string; name: string; country?: string}) => (
              <tr key={player.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{player.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{player.country || 'N/A'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => onEdit(player)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(player.id)}
                    className="text-red-600 hover:text-red-900 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Matches Section
function MatchesSection() {
  const [showModal, setShowModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Matches Management</h2>
        <button
          onClick={() => {
            setEditingMatch(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add New Match
        </button>
      </div>
      <MatchesTable 
        key={refreshKey}
        onEdit={(match) => {
          setEditingMatch(match);
          setShowModal(true);
        }}
        onRefresh={() => setRefreshKey(prev => prev + 1)}
      />
      
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMatch(null);
        }}
        title={editingMatch ? 'Edit Match' : 'Add New Match'}
      >
        <MatchForm
          match={editingMatch}
          onSubmit={() => {
            setRefreshKey(prev => prev + 1);
            setShowModal(false);
            setEditingMatch(null);
          }}
          onClose={() => {
            setShowModal(false);
            setEditingMatch(null);
          }}
        />
      </Modal>
    </div>
  );
}

function MatchesTable({ onEdit, onRefresh }: { onEdit: (match: Match) => void; onRefresh: () => void }) {
  const [matches, setMatches] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/neo4j/matches/create');
      const data = await response.json();
      // Matches endpoint returns { success, data, count }
      setMatches(data.data || data.matches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;
    try {
      const response = await fetch(`/api/neo4j/matches/delete?matchId=${encodeURIComponent(matchId)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Match deleted successfully!');
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Error deleting match');
      }
    } catch (error) {
      console.error('Delete match error:', error);
      alert('Error deleting match');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Players</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Of</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matches.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                No matches found
              </td>
            </tr>
          ) : (
            matches.map((match: Match) => (
              <tr key={match.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {match.startTime ? new Date(match.startTime).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{match.players || 'Unknown vs Unknown'}</td>
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
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => onEdit(match)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="text-red-600 hover:text-red-900 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Tournaments Section
function TournamentsSection() {
  const [showModal, setShowModal] = useState(false);
  // replace narrow tournament edit state with full tournament shape
  interface TournamentFull {
    id: string;
    name: string;
    location?: string;
    type?: string;
    venue?: string;
    startDate?: string;
    endDate?: string;
    city?: string;
    country?: string;
    prizePool?: number;
    status?: string;
    maxRounds?: number;
  }

  const [editingTournament, setEditingTournament] = useState<TournamentFull | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tournaments Management</h2>
        <button
          onClick={() => {
            setEditingTournament(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add New Tournament
        </button>
      </div>
      <TournamentsTable 
        key={refreshKey}
        onEdit={async (tournament) => {
          // fetch full tournament details from backend so the form is pre-filled
          try {
            const res = await fetch(`/api/neo4j/tournaments/${encodeURIComponent(tournament.id)}`);
            const json = await res.json();
            const full = json.data || json.tournament || json;
            setEditingTournament(full || tournament);
          } catch (err) {
            console.error('Failed to fetch tournament details:', err);
            setEditingTournament(tournament);
          }
          setShowModal(true);
        }}
        onRefresh={() => setRefreshKey(prev => prev + 1)}
      />
      
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTournament(null);
        }}
        title={editingTournament ? 'Edit Tournament' : 'Add New Tournament'}
      >
        <TournamentForm
          tournament={editingTournament}
          onSubmit={() => {
            setRefreshKey(prev => prev + 1);
            setShowModal(false);
            setEditingTournament(null);
          }}
          onClose={() => {
            setShowModal(false);
            setEditingTournament(null);
          }}
        />
      </Modal>
    </div>
  );
}

function TournamentsTable({ onEdit, onRefresh }: { onEdit: (tournament: {id: string; name: string; location?: string; startDate?: string; endDate?: string}) => void; onRefresh: () => void }) {
  const [tournaments, setTournaments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/neo4j/tournaments/all');
      const data = await response.json();
      // Tournaments endpoint returns { success: true, data: [...] }
      setTournaments(data.data || data.tournaments || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    try {
      const response = await fetch(`/api/neo4j/tournaments/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId }),
      });
      if (response.ok) {
        alert('Tournament deleted successfully!');
        onRefresh();
      }
    } catch {
      alert('Error deleting tournament');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tournaments.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                No tournaments found
              </td>
            </tr>
          ) : (
            tournaments.map((tournament: {id: string; name: string; location?: string; startDate?: string; status: string}) => (
              <tr key={tournament.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{tournament.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tournament.location || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    tournament.status === 'FINISHED'
                      ? 'bg-gray-100 text-gray-800'
                      : tournament.status === 'ONGOING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {tournament.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => onEdit(tournament)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tournament.id)}
                    className="text-red-600 hover:text-red-900 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Frames Section
function FramesSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Frames Management</h2>
      <FramesTable />
    </div>
  );
}

function FramesTable() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frame #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
              Frames are managed through match creation. Simulate a match on the Live Match page to generate frames.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
