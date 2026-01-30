'use client';

import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Always register the Escape key listener (hooks must run in same order)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface PlayerFormProps {
  player?: {id: string; name: string; nationality?: string; country?: string; dateOfBirth?: string} | null;
  onSubmit: (data: {name: string; nationality?: string; dateOfBirth?: string}) => void;
  onClose: () => void;
}

export function PlayerForm({ player, onSubmit, onClose }: PlayerFormProps) {
  const [formData, setFormData] = useState({
    name: player?.name || '',
    nationality: player?.nationality || player?.country || '',
    dateOfBirth: player?.dateOfBirth || new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation to match backend requirements
    if (!formData.name || !formData.nationality || !formData.dateOfBirth) {
      alert('Missing required fields: name, nationality, dateOfBirth');
      setLoading(false);
      return;
    }

    try {
      let url = '/api/neo4j/players/create';
      let method = 'POST';
      const bodyPayload: any = { name: formData.name, nationality: formData.nationality, dateOfBirth: formData.dateOfBirth };
      
      if (player?.id) {
        url = '/api/neo4j/players/update';
        method = 'PUT';
        bodyPayload.playerId = player.id;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      
      if (response.ok) {
        await onSubmit(bodyPayload);
        onClose();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err?.error || 'Failed to save player');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Player Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nationality
        </label>
        <input
          type="text"
          required
          value={formData.nationality}
          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date of Birth
        </label>
        <input
          type="date"
          required
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Player'}
        </button>
      </div>
    </form>
  );
}

interface MatchFormProps {
  match?: {id: string; date: string; bestOf: number; status: string; player1Id?: string; player2Id?: string; tournamentId?: string; round?: string} | null;
  onSubmit: (data: {player1Id: string; player2Id: string; date: string; bestOf: number; tournamentId?: string; round?: string}) => void;
  onClose: () => void;
}

export function MatchForm({ match, onSubmit, onClose }: MatchFormProps) {
  // helper to safely extract ISO date string from match object
  const extractIsoDate = (m: any) => {
    if (!m) return new Date().toISOString();
    if (typeof m.date === 'string' && m.date.includes('T')) return m.date;
    if (typeof m.startTime === 'string' && m.startTime.includes('T')) return m.startTime;
    // handle Neo4j datetime objects converted to string
    if (m.startTime && typeof m.startTime.toString === 'function') {
      const s = m.startTime.toString();
      if (typeof s === 'string' && s.includes('T')) return s;
    }
    return new Date().toISOString();
  };

  const [formData, setFormData] = useState({
    player1Id: match?.player1Id || '',
    player2Id: match?.player2Id || '',
    date: extractIsoDate(match).split('T')[0],
    bestOf: match?.bestOf || 7,
    tournamentId: match?.tournamentId || '',
    round: match?.round || '',
  });
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  React.useEffect(() => {
    fetchPlayers();
    fetchTournaments();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/neo4j/players/create');
      const data = await response.json();
      // Players endpoint returns array directly
      setPlayers(Array.isArray(data) ? data : data.players || data.data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/neo4j/tournaments/all');
      const data = await response.json();
      setTournaments(Array.isArray(data) ? data : data.tournaments || data.data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation to match backend requirements
    if (!formData.tournamentId || !formData.round || !formData.bestOf) {
      alert('Missing required fields: tournamentId, round, bestOf');
      setLoading(false);
      return;
    }

    try {
      let url = '/api/neo4j/matches/create';
      let method = 'POST';
      const bodyPayload: any = {
        player1Id: formData.player1Id,
        player2Id: formData.player2Id,
        startTime: formData.date ? `${formData.date}T00:00:00Z` : undefined,
        bestOf: formData.bestOf,
        tournamentId: formData.tournamentId,
        round: formData.round
      };
      
      if (match?.id) {
        url = '/api/neo4j/matches/update';
        method = 'PUT';
        bodyPayload.matchId = match.id;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      
      if (response.ok) {
        await onSubmit(bodyPayload);
        onClose();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err?.error || 'Failed to save match');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tournament</label>
        <select
          required
          value={formData.tournamentId}
          onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a tournament</option>
          {tournaments.map((t: any) => (
            <option key={t.id || t.name} value={t.id || t.id}>{t.name || t.id}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
        <input
          type="text"
          required
          value={formData.round}
          onChange={(e) => setFormData({ ...formData, round: e.target.value })}
          placeholder="e.g. Quarter-Final"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Player 1</label>
        <select
          value={formData.player1Id}
          onChange={(e) => setFormData({ ...formData, player1Id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a player</option>
          {players.map((p: {id: string; name: string}) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Player 2</label>
        <select
          value={formData.player2Id}
          onChange={(e) => setFormData({ ...formData, player2Id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a player</option>
          {players.map((p: {id: string; name: string}) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Best Of</label>
        <input
          type="number"
          min={1}
          required
          value={formData.bestOf}
          onChange={(e) => setFormData({ ...formData, bestOf: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save Match'}</button>
      </div>
    </form>
  );
}

interface TournamentFormProps {
  tournament?: {
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
  } | null;
  onSubmit: (data: {name: string; location?: string; type?: string; venue?: string; startDate?: string; endDate?: string; city?: string; country?: string; prizePool?: number; status?: string; maxRounds?: number}) => void;
  onClose: () => void;
}

export function TournamentForm({ tournament, onSubmit, onClose }: TournamentFormProps) {
  const [formData, setFormData] = useState({
    name: tournament?.name || '',
    location: tournament?.location || '',
    type: tournament?.type || '',
    venue: tournament?.venue || '',
    startDate: tournament?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    endDate: tournament?.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    city: tournament?.city || '',
    country: tournament?.country || '',
    prizePool: tournament?.prizePool ?? 0,
    status: tournament?.status || 'UPCOMING',
    maxRounds: tournament?.maxRounds ?? 1,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation to match backend requirements
    if (!formData.name || !formData.type || !formData.startDate || !formData.endDate || !formData.venue) {
      alert('Missing required fields: name, type, startDate, endDate, venue');
      setLoading(false);
      return;
    }

    try {
      let url = '/api/neo4j/tournaments/create';
      let method = 'POST';
      const payload = {
        name: formData.name,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        venue: formData.venue,
        city: formData.city,
        country: formData.country,
        prizePool: Number(formData.prizePool) || 0,
        status: formData.status,
        maxRounds: Number(formData.maxRounds) || 1,
      } as const;

      if (tournament?.id) {
        url = '/api/neo4j/tournaments/update';
        method = 'PUT';
        // include tournamentId for update endpoint
        (payload as any).tournamentId = tournament.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await onSubmit(payload as any);
        onClose();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err?.error || 'Failed to save tournament');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tournament Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          required
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select type</option>
          <option value="RANKING">RANKING</option>
          <option value="INVITATIONAL">INVITATIONAL</option>
          <option value="AMATEUR">AMATEUR</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
        <input
          type="text"
          required
          value={formData.venue}
          onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Start Date
        </label>
        <input
          type="date"
          required
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          End Date
        </label>
        <input
          type="date"
          required
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
        <input
          type="text"
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prize Pool</label>
        <input
          type="number"
          min={0}
          value={formData.prizePool}
          onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="UPCOMING">UPCOMING</option>
          <option value="ONGOING">ONGOING</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Rounds</label>
        <input
          type="number"
          min={1}
          value={formData.maxRounds}
          onChange={(e) => setFormData({ ...formData, maxRounds: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Tournament'}
        </button>
      </div>
    </form>
  );
}

// Frame Form Component
interface FrameFormProps {
  onSubmit: (frameData: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function FrameForm({ onSubmit, onCancel, initialData }: FrameFormProps) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    matchId: initialData?.matchId || '',
    frameNumber: initialData?.frameNumber || 1,
    winnerId: initialData?.winnerId || '',
    winnerScore: initialData?.winnerScore || 0,
    loserScore: initialData?.loserScore || 0,
    highestBreak: initialData?.highestBreak || 0,
    minutes: Math.floor((initialData?.duration || 0) / 60),
    seconds: (initialData?.duration || 0) % 60,
    status: initialData?.status || 'COMPLETED',
  });

  React.useEffect(() => {
    fetchMatches();
    fetchPlayers();
  }, []);

  const fetchMatches = async () => {
    try {
      // We'll create this endpoint to get all matches
      const response = await fetch('/api/neo4j/matches/all');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/neo4j/players/all');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedMatch = matches.find(m => m.id === formData.matchId);
      if (!selectedMatch) {
        throw new Error('Selected match not found');
      }

      // Determine loser ID based on winner ID
      const loserId = formData.winnerId === selectedMatch.player1Id 
        ? selectedMatch.player2Id 
        : selectedMatch.player1Id;

      const frameData = {
        matchId: formData.matchId,
        winnerId: formData.winnerId,
        loserId: loserId,
        frameNumber: formData.frameNumber,
        winnerScore: formData.winnerScore,
        loserScore: formData.loserScore,
        highestBreak: formData.highestBreak,
        duration: `PT${formData.minutes}M${formData.seconds}S`, // ISO 8601 duration format
        status: formData.status,
      };
      
      await onSubmit(frameData);
    } catch (error) {
      console.error('Error submitting frame:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMatch = matches.find(m => m.id === formData.matchId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="matchId" className="block text-sm font-medium text-gray-700 mb-2">
          Match *
        </label>
        <select
          id="matchId"
          required
          value={formData.matchId}
          onChange={(e) => setFormData({ ...formData, matchId: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a match</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.displayName || `${match.player1Name} vs ${match.player2Name}`} ({match.date})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="frameNumber" className="block text-sm font-medium text-gray-700 mb-2">
          Frame Number *
        </label>
        <input
          id="frameNumber"
          type="number"
          min="1"
          required
          value={formData.frameNumber}
          onChange={(e) => setFormData({ ...formData, frameNumber: parseInt(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="winnerId" className="block text-sm font-medium text-gray-700 mb-2">
          Frame Winner *
        </label>
        <select
          id="winnerId"
          required
          value={formData.winnerId}
          onChange={(e) => setFormData({ ...formData, winnerId: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select winner</option>
          {selectedMatch && (
            <>
              <option value={selectedMatch.player1Id}>{selectedMatch.player1Name}</option>
              <option value={selectedMatch.player2Id}>{selectedMatch.player2Name}</option>
            </>
          )}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="winnerScore" className="block text-sm font-medium text-gray-700 mb-2">
            Winner Score
          </label>
          <input
            id="winnerScore"
            type="number"
            min="0"
            value={formData.winnerScore}
            onChange={(e) => setFormData({ ...formData, winnerScore: parseInt(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="loserScore" className="block text-sm font-medium text-gray-700 mb-2">
            Loser Score
          </label>
          <input
            id="loserScore"
            type="number"
            min="0"
            value={formData.loserScore}
            onChange={(e) => setFormData({ ...formData, loserScore: parseInt(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="highestBreak" className="block text-sm font-medium text-gray-700 mb-2">
          Highest Break
        </label>
        <input
          id="highestBreak"
          type="number"
          min="0"
          value={formData.highestBreak}
          onChange={(e) => setFormData({ ...formData, highestBreak: parseInt(e.target.value) || 0 })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="minutes" className="block text-sm font-medium text-gray-700 mb-2">
            Duration (Minutes)
          </label>
          <input
            id="minutes"
            type="number"
            min="0"
            value={formData.minutes}
            onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="seconds" className="block text-sm font-medium text-gray-700 mb-2">
            Duration (Seconds)
          </label>
          <input
            id="seconds"
            type="number"
            min="0"
            max="59"
            value={formData.seconds}
            onChange={(e) => setFormData({ ...formData, seconds: parseInt(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Frame'}
        </button>
      </div>
    </form>
  );
}
