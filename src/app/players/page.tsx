'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, Calendar, Users } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  ranking?: number;
  country?: string;
  totalPoints?: number;
  matches?: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/neo4j/players/create', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch players: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle both array and object responses
        const playersList = Array.isArray(data) ? data : data.players || data.data || [];
        setPlayers(playersList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load players');
        console.error('Error fetching players:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-green-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition">
              <ArrowLeft className="w-6 h-6 text-green-700" />
              <div>
                <h1 className="text-2xl font-bold text-green-800">WORLD SNOOKER</h1>
                <p className="text-sm text-gray-600">Players Directory</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Players</h1>
          <p className="text-lg text-gray-600">Browse all registered snooker players and view their profiles</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            <p className="ml-4 text-gray-600">Loading players...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Players</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        )}

        {/* Players Grid */}
        {!loading && !error && (
          <>
            {players.length === 0 ? (
              <div className="bg-gray-100 rounded-lg p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-600 mb-2">No Players Found</h2>
                <p className="text-gray-500">There are currently no players in the system.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.map((player) => (
                  <Link key={player.id} href={`/players/${player.id}`}>
                    <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer hover:border-green-700">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl text-gray-900">{player.name}</CardTitle>
                            {player.country && (
                              <CardDescription className="text-gray-600 mt-1">
                                {player.country}
                              </CardDescription>
                            )}
                          </div>
                          {player.ranking && (
                            <div className="bg-green-100 text-green-800 rounded-full w-12 h-12 flex items-center justify-center font-bold">
                              #{player.ranking}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {player.totalPoints !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 flex items-center">
                                <Trophy className="w-4 h-4 mr-2 text-yellow-600" />
                                Points
                              </span>
                              <span className="font-semibold text-gray-900">{player.totalPoints}</span>
                            </div>
                          )}
                          {player.matches !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                                Matches
                              </span>
                              <span className="font-semibold text-gray-900">{player.matches}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Results Summary */}
            <div className="mt-12 bg-green-50 rounded-lg p-6 text-center border border-green-200">
              <p className="text-lg text-gray-700">
                Showing <span className="font-bold text-green-800">{players.length}</span> player{players.length !== 1 ? 's' : ''}
              </p>
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
