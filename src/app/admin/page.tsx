'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Modal, PlayerForm, MatchForm, TournamentForm, FrameForm } from '@/components/admin/forms';

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
        onEdit={async (match) => {
          try {
            const res = await fetch(`/api/neo4j/matches/${encodeURIComponent(match.id)}`);
            const json = await res.json();
            const full = json.data || json.match || json;
            setEditingMatch(full || match);
          } catch (err) {
            console.error('Failed to fetch match details:', err);
            setEditingMatch(match);
          }
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
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
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                No matches found
              </td>
            </tr>
          ) : (
            matches.map((match: Match) => (
              <tr key={match.id}>
                <td className="px-6 py-4 text-sm font-mono text-gray-600">
                  {match.id}
                </td>
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
      const response = await fetch(`/api/neo4j/tournaments/delete?tournamentId=${encodeURIComponent(tournamentId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Tournament deleted successfully!');
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Error deleting tournament');
      }
    } catch (error) {
      console.error('Delete tournament error:', error);
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
  const [frames, setFrames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFrame, setEditingFrame] = useState<any>(null);

  React.useEffect(() => {
    fetchFrames();
  }, []);

  const fetchFrames = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/frames/all');
      if (response.ok) {
        const data = await response.json();
        setFrames(data.frames || []);
      }
    } catch (error) {
      console.error('Error fetching frames:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFrame = () => {
    setEditingFrame(null);
    setShowModal(true);
  };

  const handleEditFrame = (frame: any) => {
    setEditingFrame(frame);
    setShowModal(true);
  };

  const handleSaveFrame = async (frameData: any) => {
    try {
      const url = editingFrame 
        ? '/api/neo4j/frames/update'
        : '/api/neo4j/frames/create';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFrame ? { ...frameData, id: editingFrame.id } : frameData),
      });

      const result = await response.json();
      
      if (response.ok && result.success !== false) {
        setShowModal(false);
        setEditingFrame(null);
        fetchFrames();
      } else {
        console.error('Error saving frame:', result.error || 'Unknown error');
        alert('Error saving frame: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving frame:', error);
      alert('Error saving frame: ' + error);
    }
  };

  const handleDeleteFrame = async (frameId: string) => {
    if (!confirm('Are you sure you want to delete this frame?')) return;

    try {
      const response = await fetch('/api/neo4j/frames/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: frameId }),
      });

      if (response.ok) {
        fetchFrames();
      }
    } catch (error) {
      console.error('Error deleting frame:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Frames Management</h2>
        <button
          onClick={handleAddFrame}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Frame
        </button>
      </div>

      <FramesTable 
        frames={frames}
        loading={loading}
        onEdit={handleEditFrame}
        onDelete={handleDeleteFrame}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingFrame ? 'Edit Frame' : 'Add New Frame'}
      >
        <FrameForm
          initialData={editingFrame}
          onSubmit={handleSaveFrame}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}

function FramesTable({ frames, loading, onEdit, onDelete }: {
  frames: any[];
  loading: boolean;
  onEdit: (frame: any) => void;
  onDelete: (frameId: string) => void;
}) {
  if (loading) {
    return <div className="text-center py-4">Loading frames...</div>;
  }

  const formatDuration = (duration: any) => {
    if (!duration) return '-';
    let totalSeconds = 0;

    // Handle Neo4j duration object (may have Integer-like properties) or ISO string
    if (typeof duration === 'object' && duration !== null && ('seconds' in duration || 'minutes' in duration)) {
      // seconds field might be a Neo4j Integer or a plain number/string
      const secsField: any = (duration as any).seconds;
      const minsField: any = (duration as any).minutes;

      const secs = (secsField !== undefined && secsField !== null)
        ? (typeof secsField === 'object' && typeof secsField.toNumber === 'function' ? secsField.toNumber() : Number(secsField))
        : 0;

      const mins = (minsField !== undefined && minsField !== null)
        ? (typeof minsField === 'object' && typeof minsField.toNumber === 'function' ? minsField.toNumber() : Number(minsField))
        : 0;

      totalSeconds = mins * 60 + secs;

    } else if (typeof duration === 'string' && duration.startsWith('PT')) {
      // ISO 8601 duration format: PT10M30S
      const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const minutes = parseInt(match[1] || '0', 10);
        const seconds = parseInt(match[2] || '0', 10);
        totalSeconds = minutes * 60 + seconds;
      }
    } else if (typeof duration === 'number') {
      // Plain number in seconds
      totalSeconds = duration;
    } else {
      // Fallback: try to coerce to number
      const asNum = Number(duration);
      totalSeconds = Number.isFinite(asNum) ? asNum : 0;
    }

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tournament</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frame #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Break</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {frames.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                No frames found. Click "Add Frame" to create one.
              </td>
            </tr>
          ) : (
            frames.map((frame) => (
              <tr key={frame.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {frame.tournamentName || 'No Tournament'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="text-sm font-medium">{frame.player1Name} vs {frame.player2Name}</div>
                  <div className="text-xs text-gray-500">ID: {frame.matchId}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {frame.frameNumber}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {frame.winnerName || 'TBD'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {frame.winnerScore || 0} - {frame.loserScore || 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {frame.highestBreak || 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {frame.duration ? formatDuration(frame.duration) : '-'}
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => onEdit(frame)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(frame.id)}
                    className="text-red-600 hover:text-red-800 font-medium"
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
