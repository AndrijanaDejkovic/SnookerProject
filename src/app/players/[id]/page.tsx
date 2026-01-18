'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, Globe, Calendar, Users, Swords } from 'lucide-react';
import { useParams } from 'next/navigation';

interface PlayerDetail {
  id: string;
  name: string;
  country?: string;
  ranking?: number;
  rank?: number;
  totalPoints?: number;
  matches?: number;
  wins?: number;
  losses?: number;
  dateOfBirth?: string;
  professionalSince?: string;
  tournamentStats?: {
    name: string;
    year: number;
    position?: string;
  }[];
}

interface HeadToHeadStats {
  players: {
    player1: {
      id: string;
      name: string;
      nationality?: string;
    };
    player2: {
      id: string;
      name: string;
      nationality?: string;
    };
  };
  headToHeadRecord: {
    totalMatches: number;
    completedMatches: number;
    player1: {
      matchWins: number;
      matchWinRate: number;
      frameWins: number;
      frameWinRate: number;
      tournamentWins365: number;
    };
    player2: {
      matchWins: number;
      matchWinRate: number;
      frameWins: number;
      frameWinRate: number;
      tournamentWins365: number;
    };
  };
  summary: {
    matchesLeader: string;
    framesLeader: string;
    recentFormLeader: string;
  };
  metadata: {
    calculatedAt: string;
    recentFormPeriod: string;
  };
}

interface PlayerOption {
  id: string;
  name: string;
}

interface TriangularStats {
  players: {
    playerA: { id: string; name: string; nationality?: string };
    playerB: { id: string; name: string; nationality?: string };
    playerC: { id: string; name: string; nationality?: string };
  };
  headToHeadVsC: {
    playerAVsC: {
      completedMatches: number;
      matchWins: number;
      matchLosses: number;
      matchWinRate: number;
      frameWins: number;
      frameLosses: number;
      totalFrames: number;
      frameWinRate: number;
      tournamentWins365: number;
    };
    playerBVsC: {
      completedMatches: number;
      matchWins: number;
      matchLosses: number;
      matchWinRate: number;
      frameWins: number;
      frameLosses: number;
      totalFrames: number;
      frameWinRate: number;
      tournamentWins365: number;
    };
  };
  comparison: {
    betterMatchRecordVsC: string;
    betterFrameRecordVsC: string;
    moreExperienceVsC: string;
    matchWinRateDifference: number;
    frameWinRateDifference: number;
  };
  metadata: {
    calculatedAt: string;
    comparisonType: string;
    description: string;
  };
}

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;
  
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [selectedComparePlayerId, setSelectedComparePlayerId] = useState<string>('');
  const [headToHeadStats, setHeadToHeadStats] = useState<HeadToHeadStats | null>(null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [h2hError, setH2hError] = useState<string | null>(null);
  const [selectedTriangularPlayer, setSelectedTriangularPlayer] = useState<string>('');
  const [triangularStats, setTriangularStats] = useState<TriangularStats | null>(null);
  const [triangularLoading, setTriangularLoading] = useState(false);
  const [triangularError, setTriangularError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerDetail = async () => {
      try {
        setLoading(true);
        // Try to fetch player details
        const response = await fetch(`/api/neo4j/players/${playerId}`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch player details: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Debug: log the response
        console.log('Player API response:', data);
        
        // Handle response structure - now it's a single object
        // Ensure we have valid player data
        if (data && data.id) {
          setPlayer(data);
        } else {
          console.warn('Invalid player data received:', data);
          setError('Invalid player data received from server');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player details');
        console.error('Error fetching player:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAllPlayers = async () => {
      try {
        const response = await fetch(`/api/neo4j/players/create`, {
          method: 'GET',
        });
        if (response.ok) {
          const data = await response.json();
          setAllPlayers(data);
        }
      } catch (err) {
        console.warn('Failed to fetch players list:', err);
      }
    };

    if (playerId) {
      fetchPlayerDetail();
      fetchAllPlayers();
    }
  }, [playerId]);

  const handleComparePlayer = async (comparedPlayerId: string) => {
    if (!comparedPlayerId || comparedPlayerId === playerId) {
      return;
    }

    setSelectedComparePlayerId(comparedPlayerId);
    setH2hLoading(true);
    setH2hError(null);

    try {
      const response = await fetch(
        `/api/neo4j/head-to-head?player1Id=${playerId}&player2Id=${comparedPlayerId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch head-to-head statistics');
      }

      const response_data = await response.json();
      console.log('Head-to-head API response:', response_data);
      
      // Extract the actual data from the wrapped response
      const h2hData = response_data.data || response_data;
      console.log('Extracted h2h data:', h2hData);
      
      setHeadToHeadStats(h2hData);
    } catch (err) {
      setH2hError(err instanceof Error ? err.message : 'Failed to load head-to-head data');
      console.error('H2H error:', err);
    } finally {
      setH2hLoading(false);
    }
  };

  const handleTriangularComparison = async (thirdPlayerId: string) => {
    if (!thirdPlayerId || !selectedComparePlayerId || thirdPlayerId === playerId || thirdPlayerId === selectedComparePlayerId) {
      return;
    }

    setSelectedTriangularPlayer(thirdPlayerId);
    setTriangularLoading(true);
    setTriangularError(null);

    try {
      const response = await fetch(
        `/api/neo4j/triangular-comparison?playerAId=${playerId}&playerBId=${selectedComparePlayerId}&playerCId=${thirdPlayerId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch triangular comparison');
      }

      const response_data = await response.json();
      console.log('Triangular comparison API response:', response_data);
      
      const triangularData = response_data.data || response_data;
      console.log('Extracted triangular data:', triangularData);
      
      setTriangularStats(triangularData);
    } catch (err) {
      setTriangularError(err instanceof Error ? err.message : 'Failed to load triangular comparison');
      console.error('Triangular error:', err);
    } finally {
      setTriangularLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-green-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link href="/players" className="flex items-center space-x-3 hover:opacity-80 transition">
              <ArrowLeft className="w-6 h-6 text-green-700" />
              <div>
                <h1 className="text-2xl font-bold text-green-800">WORLD SNOOKER</h1>
                <p className="text-sm text-gray-600">Player Profile</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            <p className="ml-4 text-gray-600">Loading player details...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Player</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Link href="/players">
              <Button>Back to Players</Button>
            </Link>
          </div>
        )}

        {/* Player Details */}
        {!loading && !error && player && (
          <>
            {/* Player Header Card */}
            <div className="bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg p-8 mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-5xl font-bold mb-2">{player.name}</h1>
                  {player.country && (
                    <div className="flex items-center space-x-2">
                      <Globe className="w-5 h-5" />
                      <span className="text-lg text-green-100">{player.country}</span>
                    </div>
                  )}
                  {player.dateOfBirth && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Calendar className="w-5 h-5" />
                      <span className="text-lg text-green-100">Born: {new Date(player.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                  )}
                  {player.professionalSince && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Trophy className="w-5 h-5" />
                      <span className="text-lg text-green-100">Professional since: {player.professionalSince}</span>
                    </div>
                  )}
                </div>
                {(player.rank || player.ranking) && (
                  <div className="text-right">
                    <div className="text-6xl font-bold">#{player.rank || player.ranking}</div>
                    <p className="text-green-100 text-lg">Current Ranking</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {player.totalPoints !== undefined && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-700 flex items-center">
                      <Trophy className="w-8 h-8 mr-2" />
                      {player.totalPoints}
                    </div>
                  </CardContent>
                </Card>
              )}

              {player.matches !== undefined && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Matches Played</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-700 flex items-center">
                      <Calendar className="w-8 h-8 mr-2" />
                      {player.matches}
                    </div>
                  </CardContent>
                </Card>
              )}

              {player.wins !== undefined && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Wins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {player.wins}
                    </div>
                  </CardContent>
                </Card>
              )}

              {player.losses !== undefined && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Losses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {player.losses}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Head-to-Head Comparison Section */}
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Swords className="w-5 h-5 mr-2 text-blue-600" />
                    Head-to-Head Comparison
                  </CardTitle>
                  <CardDescription>
                    Compare this player against another
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Player to Compare:
                    </label>
                    <select
                      value={selectedComparePlayerId}
                      onChange={(e) => handleComparePlayer(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">-- Choose a player --</option>
                      {allPlayers
                        .filter((p) => p.id !== playerId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {h2hLoading && (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                      <p className="ml-4 text-gray-600">Loading head-to-head data...</p>
                    </div>
                  )}

                  {h2hError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                      {h2hError}
                    </div>
                  )}

                  {headToHeadStats && !h2hLoading && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {headToHeadStats.headToHeadRecord?.player1?.matchWins ?? 0}
                          </p>
                          <p className="text-xs text-gray-600">
                            {headToHeadStats.players?.player1?.name ?? 'Player 1'} Wins
                          </p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-gray-600">
                            {headToHeadStats.headToHeadRecord?.player2?.matchWins ?? 0}
                          </p>
                          <p className="text-xs text-gray-600">
                            {headToHeadStats.players?.player2?.name ?? 'Player 2'} Wins
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {headToHeadStats.headToHeadRecord?.player1?.frameWins ?? 0}
                          </p>
                          <p className="text-xs text-gray-600">
                            {headToHeadStats.players?.player1?.name ?? 'Player 1'} Frames
                          </p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">
                            {headToHeadStats.headToHeadRecord?.player2?.frameWins ?? 0}
                          </p>
                          <p className="text-xs text-gray-600">
                            {headToHeadStats.players?.player2?.name ?? 'Player 2'} Frames
                          </p>
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-300">
                        <p className="text-sm text-gray-600">
                          Total Matches: <span className="font-bold text-lg">
                            {headToHeadStats.headToHeadRecord?.totalMatches ?? 0}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Total Frames: <span className="font-bold text-lg">
                            {(headToHeadStats.headToHeadRecord?.player1?.frameWins ?? 0) + 
                             (headToHeadStats.headToHeadRecord?.player2?.frameWins ?? 0)}
                          </span>
                        </p>
                      </div>

                      {/* Win Rates */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-600">Match Win Rate</p>
                          <p className="text-xl font-bold text-blue-600 mt-1">
                            {(headToHeadStats.headToHeadRecord?.player1?.matchWinRate ?? 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600">{headToHeadStats.players?.player1?.name ?? 'Player 1'}</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">Match Win Rate</p>
                          <p className="text-xl font-bold text-gray-600 mt-1">
                            {(headToHeadStats.headToHeadRecord?.player2?.matchWinRate ?? 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600">{headToHeadStats.players?.player2?.name ?? 'Player 2'}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-gray-600">Frame Win Rate</p>
                          <p className="text-xl font-bold text-green-600 mt-1">
                            {(headToHeadStats.headToHeadRecord?.player1?.frameWinRate ?? 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600">{headToHeadStats.players?.player1?.name ?? 'Player 1'}</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-gray-600">Frame Win Rate</p>
                          <p className="text-xl font-bold text-yellow-600 mt-1">
                            {(headToHeadStats.headToHeadRecord?.player2?.frameWinRate ?? 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600">{headToHeadStats.players?.player2?.name ?? 'Player 2'}</p>
                        </div>
                      </div>

                      {/* Summary Section */}
                      <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-gray-700 font-medium">Matches Leader:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {headToHeadStats.summary?.matchesLeader ?? 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-gray-700 font-medium">Frames Leader:</span>
                            <span className="text-lg font-bold text-green-600">
                              {headToHeadStats.summary?.framesLeader ?? 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-gray-700 font-medium">Recent Form Leader (365 days):</span>
                            <span className="text-lg font-bold text-purple-600">
                              {headToHeadStats.summary?.recentFormLeader ?? 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Triangular Comparison Section */}
                      <div className="mt-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Triangular Comparison</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Select a third player to see how {player.name} and {headToHeadStats.players?.player2?.name} each perform against them.
                        </p>
                        
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Third Player to Compare
                          </label>
                          <select
                            value={selectedTriangularPlayer}
                            onChange={(e) => {
                              handleTriangularComparison(e.target.value);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">Select a player...</option>
                            {allPlayers
                              .filter(p => p.id !== playerId && p.id !== selectedComparePlayerId)
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        {triangularLoading && (
                          <div className="text-center p-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Loading triangular comparison...</p>
                          </div>
                        )}

                        {triangularError && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700">
                            {triangularError}
                          </div>
                        )}

                        {triangularStats && (
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                            <h4 className="text-md font-bold text-gray-900 mb-4">
                              Comparison vs {triangularStats.players?.playerC?.name}
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Player A Stats */}
                              <div className="bg-white rounded-lg p-4 border border-blue-200">
                                <h5 className="font-bold text-blue-600 mb-4">{triangularStats.players?.playerA?.name}</h5>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Match Win Rate vs {triangularStats.players?.playerC?.name}:</span>
                                    <span className="font-bold text-blue-600">{triangularStats.headToHeadVsC?.playerAVsC?.matchWinRate?.toFixed(1) ?? 0}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Match Record:</span>
                                    <span className="font-bold">{triangularStats.headToHeadVsC?.playerAVsC?.matchWins ?? 0}-{triangularStats.headToHeadVsC?.playerAVsC?.matchLosses ?? 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Frame Win Rate:</span>
                                    <span className="font-bold text-green-600">{triangularStats.headToHeadVsC?.playerAVsC?.frameWinRate?.toFixed(1) ?? 0}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Frames:</span>
                                    <span className="font-bold">{triangularStats.headToHeadVsC?.playerAVsC?.frameWins ?? 0}-{triangularStats.headToHeadVsC?.playerAVsC?.frameLosses ?? 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Tournaments Won (365d):</span>
                                    <span className="font-bold text-purple-600">{triangularStats.headToHeadVsC?.playerAVsC?.tournamentWins365 ?? 0}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Player B Stats */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <h5 className="font-bold text-gray-600 mb-4">{triangularStats.players?.playerB?.name}</h5>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Match Win Rate vs {triangularStats.players?.playerC?.name}:</span>
                                    <span className="font-bold text-gray-600">{triangularStats.headToHeadVsC?.playerBVsC?.matchWinRate?.toFixed(1) ?? 0}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Match Record:</span>
                                    <span className="font-bold">{triangularStats.headToHeadVsC?.playerBVsC?.matchWins ?? 0}-{triangularStats.headToHeadVsC?.playerBVsC?.matchLosses ?? 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Frame Win Rate:</span>
                                    <span className="font-bold text-yellow-600">{triangularStats.headToHeadVsC?.playerBVsC?.frameWinRate?.toFixed(1) ?? 0}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Frames:</span>
                                    <span className="font-bold">{triangularStats.headToHeadVsC?.playerBVsC?.frameWins ?? 0}-{triangularStats.headToHeadVsC?.playerBVsC?.frameLosses ?? 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-700">Tournaments Won (365d):</span>
                                    <span className="font-bold text-purple-600">{triangularStats.headToHeadVsC?.playerBVsC?.tournamentWins365 ?? 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Comparison Insights */}
                            <div className="mt-6 bg-white rounded-lg p-4 border border-purple-200">
                              <h5 className="font-bold text-gray-900 mb-3">Comparison Insights</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                                  <span className="text-gray-700">Better Match Record vs {triangularStats.players?.playerC?.name}:</span>
                                  <span className="font-bold text-indigo-600">{triangularStats.comparison?.betterMatchRecordVsC ?? 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                                  <span className="text-gray-700">Better Frame Record vs {triangularStats.players?.playerC?.name}:</span>
                                  <span className="font-bold text-green-600">{triangularStats.comparison?.betterFrameRecordVsC ?? 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                                  <span className="text-gray-700">More Experience vs {triangularStats.players?.playerC?.name}:</span>
                                  <span className="font-bold text-purple-600">{triangularStats.comparison?.moreExperienceVsC ?? 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tournament History */}
            {player.tournamentStats && player.tournamentStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                    Tournament History
                  </CardTitle>
                  <CardDescription>
                    Tournaments participated in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {player.tournamentStats.map((tournament, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-900">{tournament.name}</p>
                          <p className="text-sm text-gray-600">Year: {tournament.year}</p>
                        </div>
                        {tournament.position && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                            {tournament.position}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Back Button */}
            <div className="mt-8">
              <Link href="/players">
                <Button variant="outline" className="flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Players
                </Button>
              </Link>
            </div>
          </>
        )}

        {!loading && !error && !player && (
          <div className="bg-gray-100 rounded-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">Player Not Found</h2>
            <p className="text-gray-500 mb-6">The player you&apos;re looking for does not exist.</p>
            <Link href="/players">
              <Button>Back to Players</Button>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-green-800 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p>&copy; 2026 World Snooker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
