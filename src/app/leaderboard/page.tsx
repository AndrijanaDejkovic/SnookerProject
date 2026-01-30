'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  nationality: string;
  ranking: number;
  tournamentsWon: number;
  totalPrize: number;
  tournamentsPlayed: number;
  totalMatches: number;
  totalFrames: number;
}

interface LeaderboardResponse {
  success: boolean;
  cached: boolean;
  count: number;
  totalPlayers: number;
  data: LeaderboardEntry[];
  metadata?: {
    calculatedAt: string;
    basedOnLast365Days: boolean;
    rankingCriteria: string[];
  };
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [limit, setLimit] = useState(50);
  const [searchPlayer, setSearchPlayer] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, [limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/redis/leaderboard?limit=${limit}`);
      const data: LeaderboardResponse = await response.json();
      
      if (data.success) {
        setLeaderboard(data.data);
        setMetadata(data.metadata || null);
      } else {
        console.error('Failed to fetch leaderboard:', data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLeaderboard = async () => {
    try {
      setRefreshing(true);
      
      // Clear cache first
      await fetch('/api/redis/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_all' })
      });

      // Fetch fresh data
      await fetchLeaderboard();
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
      alert('Failed to refresh leaderboard');
    } finally {
      setRefreshing(false);
    }
  };

  const searchPlayerRank = async () => {
    if (!searchPlayer.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/redis/leaderboard?playerId=${encodeURIComponent(searchPlayer)}`);
      const data: LeaderboardResponse = await response.json();
      
      if (data.success && data.data.length > 0) {
        setLeaderboard(data.data);
        setMetadata(data.metadata || null);
      } else {
        alert('Player not found in rankings');
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error searching player:', error);
      alert('Error searching for player');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏆';
    if (rank <= 50) return '⭐';
    return '👤';
  };

  const getFlag = (nationality: string) => {
    const flags: { [key: string]: string } = {
      'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
      'Ireland': '🇮🇪',
      'Australia': '🇦🇺',
      'China': '🇨🇳',
      'Germany': '🇩🇪',
      'Belgium': '🇧🇪'
    };
    return flags[nationality] || '🌍';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">📊 Global Leaderboard</h1>
            <div className="flex gap-4">
              <Link href="/matches" className="text-blue-600 hover:text-blue-800 font-medium">
                🎯 Matches
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
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search Player */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search player by ID or name..."
                value={searchPlayer}
                onChange={(e) => setSearchPlayer(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && searchPlayerRank()}
              />
              <button
                onClick={searchPlayerRank}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                disabled={!searchPlayer.trim()}
              >
                🔍 Search
              </button>
              <button
                onClick={fetchLeaderboard}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                📋 Show All
              </button>
            </div>

            {/* Limit and Refresh */}
            <div className="flex gap-2 items-center">
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
              
              <button
                onClick={refreshLeaderboard}
                disabled={refreshing}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <strong>Last Updated:</strong> {new Date(metadata.calculatedAt).toLocaleString()}
                </div>
                <div>
                  <strong>Data Period:</strong> {metadata.basedOnLast365Days ? 'Last 365 days' : 'All time'}
                </div>
                <div>
                  <strong>Ranking Criteria:</strong> Tournaments Won → Prize Money → Name
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Player Rankings ({leaderboard.length} players)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tournaments Won</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Prize</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tournaments Played</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Matches</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Frames</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      <div className="text-lg">No players found</div>
                      <div className="text-sm mt-2">Try refreshing the leaderboard or create some tournament data</div>
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((player) => (
                    <tr key={player.playerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{getRankBadge(player.ranking)}</span>
                          <span className="text-lg font-bold text-gray-900">#{player.ranking}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{player.playerName}</div>
                        <div className="text-xs text-gray-500">{player.playerId.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className="mr-2">{getFlag(player.nationality)}</span>
                          {player.nationality}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          player.tournamentsWon > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          🏆 {player.tournamentsWon}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <div className="font-medium text-gray-900">
                          ${player.totalPrize.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {player.tournamentsPlayed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {player.totalMatches}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {player.totalFrames}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {leaderboard.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 text-center text-sm text-gray-500">
              💡 Rankings are based on tournaments won, then total prize money earned in the last 365 days
            </div>
          )}
        </div>

        {/* Instructions */}
        {leaderboard.every(p => p.tournamentsWon === 0) && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">🏁 Test Tournament Winners</h3>
            <p className="text-yellow-700">
              All players currently have 0 tournament wins. To test the ranking system:
            </p>
            <ol className="list-decimal list-inside mt-2 text-yellow-700 space-y-1">
              <li>Go to the <Link href="/matches" className="underline font-medium">Matches page</Link></li>
              <li>Create a Final match for a tournament</li>
              <li>Set a winner for that match</li>
              <li>Come back here and refresh the leaderboard</li>
              <li>The winner should now have 1 tournament win and rank higher!</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
