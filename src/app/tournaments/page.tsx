'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, MapPin, DollarSign, Calendar } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  location?: string;
  prizePool: number;
  totalMatches: number;
  finishedMatches: number;
  status: 'FINISHED' | 'ONGOING' | 'UPCOMING';
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'FINISHED' | 'ONGOING' | 'UPCOMING'>('ALL');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/neo4j/tournaments/all');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tournaments');
        }

        const data = await response.json();
        console.log('Tournaments API response:', data);
        
        const tournamentsData = data.data || data;
        setTournaments(tournamentsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
        console.error('Error fetching tournaments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const filteredTournaments = filter === 'ALL' 
    ? tournaments 
    : tournaments.filter(t => t.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FINISHED':
        return 'bg-gray-100 text-gray-800';
      case 'ONGOING':
        return 'bg-green-100 text-green-800';
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'FINISHED':
        return '✓ Finished';
      case 'ONGOING':
        return '● Ongoing';
      case 'UPCOMING':
        return '⏳ Upcoming';
      default:
        return 'Unknown';
    }
  };

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
                <p className="text-sm text-gray-600">Tournaments</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Filter Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          {(['ALL', 'FINISHED', 'ONGOING', 'UPCOMING'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            <p className="ml-4 text-gray-600">Loading tournaments...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Tournaments</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tournaments Grid */}
        {!loading && !error && (
          <>
            {filteredTournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-600 mb-2">No tournaments found</h2>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.map(tournament => (
                  <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
                    <Card className="h-full hover:shadow-lg transition cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg text-gray-900">{tournament.name}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {tournament.year}
                            </CardDescription>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${getStatusColor(tournament.status)}`}>
                            {getStatusLabel(tournament.status)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {tournament.location && (
                          <div className="flex items-center space-x-2 text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{tournament.location}</span>
                          </div>
                        )}
                        
                        {tournament.prizePool > 0 && (
                          <div className="flex items-center space-x-2 text-gray-700">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">${tournament.prizePool.toLocaleString()}</span>
                          </div>
                        )}

                        {tournament.startDate && (
                          <div className="flex items-center space-x-2 text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              {new Date(tournament.startDate).toLocaleDateString()}
                              {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString()}`}
                            </span>
                          </div>
                        )}

                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-green-600">{tournament.finishedMatches}</span>
                            <span className="text-gray-500"> / {tournament.totalMatches} matches completed</span>
                          </p>
                        </div>

                        <Button className="w-full mt-4 bg-green-700 hover:bg-green-800">
                          View Matches
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
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
