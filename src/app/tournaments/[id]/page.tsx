'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, MapPin, DollarSign, Calendar, Swords } from 'lucide-react';
import { useParams } from 'next/navigation';

interface Match {
  id: string;
  bestOf: number;
  winnerId?: string;
  status: string;
  player1: {
    id: string;
    name: string;
  };
  player2: {
    id: string;
    name: string;
  };
  frames: {
    player1: number;
    player2: number;
    total: number;
  };
}

interface TournamentDetail {
  tournament: {
    id: string;
    name: string;
    year: number;
    startDate?: string;
    endDate?: string;
    location?: string;
    prizePool: number;
  };
  matches: Match[];
}

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournamentMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/neo4j/tournaments/${tournamentId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch tournament details');
        }

        const responseData = await response.json();
        console.log('Tournament detail API response:', responseData);

        const tournamentData = responseData.data || responseData;
        setData(tournamentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournament details');
        console.error('Error fetching tournament:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournamentMatches();
    }
  }, [tournamentId]);

  const getStatusBadge = (status: string) => {
    const colors = {
      FINISHED: 'bg-gray-200 text-gray-800',
      ONGOING: 'bg-green-200 text-green-800',
      UPCOMING: 'bg-blue-200 text-blue-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-200 text-gray-800';
  };

  const getWinnerDisplay = (match: Match) => {
    if (!match.winnerId) return null;
    if (match.winnerId === match.player1.id) {
      return match.player1.name;
    } else if (match.winnerId === match.player2.id) {
      return match.player2.name;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-green-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link href="/tournaments" className="flex items-center space-x-3 hover:opacity-80 transition">
              <ArrowLeft className="w-6 h-6 text-green-700" />
              <div>
                <h1 className="text-2xl font-bold text-green-800">WORLD SNOOKER</h1>
                <p className="text-sm text-gray-600">Tournament Details</p>
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
            <p className="ml-4 text-gray-600">Loading tournament details...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Tournament</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Link href="/tournaments">
              <Button>Back to Tournaments</Button>
            </Link>
          </div>
        )}

        {/* Tournament Details */}
        {!loading && !error && data && (
          <>
            {/* Tournament Header Card */}
            <div className="bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg p-8 mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-5xl font-bold mb-2">{data.tournament.name}</h1>
                  <div className="flex items-center space-x-4 text-green-100">
                    <span className="text-lg font-semibold">Year: {data.tournament.year}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.tournament.location && (
                  <div className="bg-green-600 bg-opacity-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-5 h-5" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <p className="text-lg font-bold">{data.tournament.location}</p>
                  </div>
                )}

                {data.tournament.prizePool > 0 && (
                  <div className="bg-green-600 bg-opacity-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm font-medium">Prize Pool</span>
                    </div>
                    <p className="text-lg font-bold">${data.tournament.prizePool.toLocaleString()}</p>
                  </div>
                )}

                {data.tournament.startDate && (
                  <div className="bg-green-600 bg-opacity-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="text-sm font-medium">Start Date</span>
                    </div>
                    <p className="text-lg font-bold">
                      {new Date(data.tournament.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="bg-green-600 bg-opacity-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Swords className="w-5 h-5" />
                    <span className="text-sm font-medium">Total Matches</span>
                  </div>
                  <p className="text-lg font-bold">{data.matches.length}</p>
                </div>
              </div>
            </div>

            {/* Matches Section */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Matches</h2>

              {data.matches.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No matches yet</h3>
                      <p className="text-gray-500">Matches will be added as the tournament progresses</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.matches.map(match => (
                    <Card key={match.id} className="overflow-hidden hover:shadow-lg transition">
                      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-gray-600">Match {match.id}</CardTitle>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(match.status)}`}>
                            {match.status}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-6">
                        {/* Match Score */}
                        <div className="flex items-center justify-between mb-6">
                          {/* Player 1 */}
                          <div className="flex-1">
                            <Link
                              href={`/players/${match.player1.id}`}
                              className="font-semibold text-gray-900 hover:text-green-700 transition"
                            >
                              {match.player1.name}
                            </Link>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                              {match.frames.player1}
                            </p>
                          </div>

                          {/* VS */}
                          <div className="px-4 py-2 mx-2 bg-gray-100 rounded-lg font-bold text-gray-600 text-center">
                            VS
                          </div>

                          {/* Player 2 */}
                          <div className="flex-1 text-right">
                            <Link
                              href={`/players/${match.player2.id}`}
                              className="font-semibold text-gray-900 hover:text-green-700 transition"
                            >
                              {match.player2.name}
                            </Link>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                              {match.frames.player2}
                            </p>
                          </div>
                        </div>

                        {/* Match Details */}
                        <div className="space-y-2 border-t border-gray-200 pt-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Best Of:</span>
                            <span className="font-semibold text-gray-900">{match.bestOf}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Frames:</span>
                            <span className="font-semibold text-gray-900">{match.frames.total}</span>
                          </div>
                          {getWinnerDisplay(match) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Winner:</span>
                              <span className="font-semibold text-green-600">{getWinnerDisplay(match)}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Links */}
                        <div className="flex gap-2 mt-6">
                          <Link href={`/players/${match.player1.id}`} className="flex-1">
                            <Button variant="outline" className="w-full text-xs">
                              {match.player1.name}
                            </Button>
                          </Link>
                          <Link href={`/players/${match.player2.id}`} className="flex-1">
                            <Button variant="outline" className="w-full text-xs">
                              {match.player2.name}
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Back Button */}
            <div className="mt-8">
              <Link href="/tournaments">
                <Button variant="outline" className="flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Tournaments
                </Button>
              </Link>
            </div>
          </>
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
