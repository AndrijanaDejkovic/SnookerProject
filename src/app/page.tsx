import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Users, Trophy, Play, Menu, Search, Calendar } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Header Bar */}
      <div className="bg-green-800 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-sm">
          <div>Official Snooker App</div>
          <div className="flex items-center space-x-4">
            <span>Live Scores</span>
            <span>•</span>
            <span>Latest News</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white shadow-lg border-b-2 border-green-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-800">WORLD SNOOKER</h1>
                <p className="text-sm text-gray-600">Official Tournament App</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/live" className="text-gray-700 hover:text-green-700 font-medium">
                LIVE SCORES
              </Link>
              <Link href="/players" className="text-gray-700 hover:text-green-700 font-medium">
                PLAYERS
              </Link>
              <Link href="/tournaments" className="text-gray-700 hover:text-green-700 font-medium">
                TOURNAMENTS
              </Link>
              <Link href="/matches" className="text-gray-700 hover:text-green-700 font-medium">
                MATCHES
              </Link>
              <Link href="/leaderboard" className="text-gray-700 hover:text-green-700 font-medium">
                LEADERBOARD
              </Link>
              <Link href="/admin" className="text-gray-700 hover:text-green-700 font-medium">
                ADMIN
              </Link>
              <Button className="bg-green-700 hover:bg-green-800">
                <Search className="w-4 h-4 mr-2" />
                SEARCH
              </Button>
            </nav>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Menu className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Background Image */}
      <div className="relative h-96 bg-gradient-to-r from-green-900 via-green-800 to-green-700 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-cover bg-center" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.1'%3E%3Ccircle fill='%23ffffff' cx='50' cy='50' r='40'/%3E%3Ccircle fill='%23ffffff' cx='20' cy='20' r='15'/%3E%3Ccircle fill='%23ffffff' cx='80' cy='80' r='15'/%3E%3Ccircle fill='%23ffffff' cx='80' cy='20' r='10'/%3E%3Ccircle fill='%23ffffff' cx='20' cy='80' r='10'/%3E%3C/g%3E%3C/svg%3E")`
               }}>
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              WORLD OF
              <br />
              <span className="text-yellow-400">SNOOKER</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-2xl">
              Follow live matches, track your favorite players, and stay updated with the latest tournament results
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/live">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg">
                  <Play className="mr-2 h-6 w-6" />
                  WATCH LIVE NOW
                </Button>
              </Link>
              <Link href="/tournaments">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-green-800 px-8 py-3 text-lg">
                  <Calendar className="mr-2 h-6 w-6" />
                  VIEW TOURNAMENTS
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Latest News/Featured Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">LATEST FROM THE TABLE</h2>
          
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Play className="mr-2 h-5 w-5 text-green-600" />
                Live Matches
              </CardTitle>
              <CardDescription>
                Watch real-time snooker matches and live scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/live">
                <Button className="w-full">View Live Matches</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-yellow-600" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                View player rankings and tournament winners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/leaderboard">
                <Button className="w-full">View Rankings</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-blue-600" />
                Players
              </CardTitle>
              <CardDescription>
                Browse player profiles and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/players">
                <Button className="w-full" variant="outline">Browse Players</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-yellow-600" />
                Tournaments
              </CardTitle>
              <CardDescription>
                View current and past tournament results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tournaments">
                <Button className="w-full" variant="outline">View Tournaments</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        </section>

        {/* Stats Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Platform Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">500+</div>
              <p className="text-gray-600">Registered Players</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">1000+</div>
              <p className="text-gray-600">Matches Played</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">50+</div>
              <p className="text-gray-600">Tournaments</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p>&copy; 2026 World Snooker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
