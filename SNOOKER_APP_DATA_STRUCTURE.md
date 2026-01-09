# Snooker App Data Structure & Architecture

## 📋 Application Overview

A comprehensive snooker application with the following features:
- **Head-to-Head Statistics** (Neo4j for relationship data)
- **Global Leaderboard** (Neo4j for complex rankings)
- **Tournament Leaderboards** (Neo4j for tournament-specific data)
- **Live Scores** (Redis for real-time caching)
- **Player Statistics & Relationships** (Neo4j for graph data)

---

## 🗂️ Database Architecture

### Neo4j (Graph Database) - Primary Data Storage
**Use Cases:**
- Player profiles and relationships
- Match history and head-to-head records
- Tournament structures
- Complex statistical relationships
- Ranking calculations

### Redis (Cache/Session Store) - Real-time Data
**Use Cases:**
- Live match scores
- Session management
- Temporary leaderboard caching
- Real-time notifications
- API response caching

---

## 📊 Neo4j Data Structure

### Required Dependencies
```bash
npm install neo4j-driver
npm install --save-dev @types/node
```

### Node Types

#### 1. **Player Node**
```cypher
CREATE (p:Player {
  id: 'uuid-string',
  name: 'John Smith',
  email: 'john@example.com',
  nationality: 'England',
  dateOfBirth: date('1990-05-15'),
  professionalSince: date('2010-01-01'),
  currentRanking: 12,
  totalMatches: 250,
  matchesWon: 180,
  matchesLost: 70,
  winRate: 0.72,
  highestBreak: 147,
  centuries: 45,
  createdAt: datetime(),
  updatedAt: datetime()
})
```

#### 2. **Tournament Node**
```cypher
CREATE (t:Tournament {
  id: 'uuid-string',
  name: 'World Championship 2024',
  type: 'RANKING', // RANKING, INVITATIONAL, AMATEUR
  startDate: date('2024-04-01'),
  endDate: date('2024-04-17'),
  venue: 'Crucible Theatre',
  prizePool: 2500000,
  status: 'COMPLETED', // UPCOMING, ONGOING, COMPLETED
  maxRounds: 7,
  createdAt: datetime()
})
```

#### 3. **Match Node**
```cypher
CREATE (m:Match {
  id: 'uuid-string',
  matchNumber: 1,
  round: 'FINAL', // QUALIFYING, FIRST_ROUND, SECOND_ROUND, etc.
  bestOf: 35, // Best of X frames
  status: 'COMPLETED', // SCHEDULED, ONGOING, COMPLETED, CANCELLED
  startTime: datetime(),
  endTime: datetime(),
  venue: 'Crucible Theatre',
  tableNumber: 1
})
```

#### 4. **Frame Node**
```cypher
CREATE (f:Frame {
  id: 'uuid-string',
  frameNumber: 1,
  winnerScore: 75,
  loserScore: 23,
  duration: duration('PT45M30S'), // 45 minutes 30 seconds
  highestBreak: 75,
  status: 'COMPLETED'
})
```

### Relationship Types

#### 1. **PLAYED_AGAINST**
```cypher
// Head-to-head relationship
(p1:Player)-[r:PLAYED_AGAINST {
  totalMatches: 15,
  player1Wins: 9,
  player2Wins: 6,
  lastPlayed: date('2024-03-15'),
  averageFrameDifference: 2.3
}]->(p2:Player)
```

#### 2. **PARTICIPATED_IN**
```cypher
(p:Player)-[r:PARTICIPATED_IN {
  finalPosition: 1, // Tournament finishing position
  prize: 500000,
  matchesPlayed: 7,
  matchesWon: 7,
  framesWon: 45,
  framesLost: 15
}]->(t:Tournament)
```

#### 3. **PLAYED_IN**
```cypher
(m:Match)-[r:PLAYED_IN]->(t:Tournament)
```

#### 4. **COMPETED**
```cypher
(p:Player)-[r:COMPETED {
  finalScore: 18, // Final frame score
  won: true,
  framesWon: 18,
  framesLost: 12,
  highestBreak: 134,
  centuries: 3
}]->(m:Match)
```

#### 5. **WON_FRAME**
```cypher
(p:Player)-[r:WON_FRAME {
  score: 75,
  opponentScore: 23,
  breaks: [45, 30], // Array of breaks in this frame
  duration: duration('PT12M45S')
}]->(f:Frame)
```

#### 6. **CONTAINS_FRAME**
```cypher
(m:Match)-[r:CONTAINS_FRAME]->(f:Frame)
```

---

## 🔄 Redis Data Structure

### Required Dependencies
```bash
npm install redis
```

### Key Patterns

#### 1. **Live Match Scores**
```typescript
// Key: live:match:{matchId}
interface LiveMatch {
  matchId: string;
  player1: {
    id: string;
    name: string;
    score: number; // Current frame score
    framesWon: number;
  };
  player2: {
    id: string;
    name: string;
    score: number;
    framesWon: number;
  };
  currentFrame: number;
  status: 'ONGOING' | 'BREAK' | 'FINISHED';
  lastUpdate: string; // ISO timestamp
  spectators: number;
}

// Redis Commands:
// SET live:match:uuid123 '{"matchId":"uuid123",...}' EX 7200
// GET live:match:uuid123
```

#### 2. **Global Leaderboard Cache**
```typescript
// Key: leaderboard:global
// Using Redis Sorted Sets for efficient ranking
// ZADD leaderboard:global 1850 "player1"  // Score: 1850, Member: player1
// ZREVRANGE leaderboard:global 0 99 WITHSCORES  // Top 100 players

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  points: number;
  position: number;
  change: number; // Position change from last update
}
```

#### 3. **Tournament Leaderboard Cache**
```typescript
// Key: leaderboard:tournament:{tournamentId}
// ZADD leaderboard:tournament:worldchamp2024 1000 "player1"
```

#### 4. **Live Statistics Cache**
```typescript
// Key: stats:live:{playerId}
interface LivePlayerStats {
  playerId: string;
  currentMatch?: {
    matchId: string;
    opponent: string;
    score: string; // "3-2" format
  };
  recentForm: number[]; // Last 10 match results (1 for win, 0 for loss)
  rankingPoints: number;
  position: number;
  lastUpdated: string;
}
```

#### 5. **Session Management**
```typescript
// Key: session:{sessionId}
interface UserSession {
  userId: string;
  playerId?: string; // If user is a player
  role: 'PLAYER' | 'SPECTATOR' | 'ADMIN';
  preferences: {
    favoritePlayer?: string;
    notifications: boolean;
  };
  lastActivity: string;
}
```

#### 6. **Real-time Notifications**
```typescript
// Key: notifications:{userId}
interface Notification {
  id: string;
  type: 'MATCH_START' | 'MATCH_END' | 'RANKING_UPDATE';
  message: string;
  playerId?: string;
  matchId?: string;
  timestamp: string;
  read: boolean;
}
```

---

## 🔍 Common Queries

### Neo4j Queries

#### Head-to-Head Statistics
```cypher
// Get head-to-head record between two players
MATCH (p1:Player {id: $player1Id})-[r:PLAYED_AGAINST]-(p2:Player {id: $player2Id})
RETURN p1.name, p2.name, r.totalMatches, r.player1Wins, r.player2Wins, r.lastPlayed
```

#### Create Player
```cypher
// Create a new player
CREATE (p:Player {
  id: $playerId,
  name: $name,
  email: $email,
  nationality: $nationality,
  dateOfBirth: date($dateOfBirth),
  currentRanking: $ranking,
  totalMatches: 0,
  matchesWon: 0,
  matchesLost: 0,
  winRate: 0.0,
  highestBreak: 0,
  centuries: 0,
  createdAt: datetime(),
  updatedAt: datetime()
})
RETURN p
```

#### Global Leaderboard
```cypher
// Get top 50 players by win rate (minimum 20 matches)
MATCH (p:Player)
WHERE p.totalMatches >= 20
RETURN p.name, p.winRate, p.totalMatches, p.matchesWon, p.currentRanking
ORDER BY p.winRate DESC
LIMIT 50
```

#### Tournament Leaderboard
```cypher
// Get tournament standings
MATCH (p:Player)-[r:PARTICIPATED_IN]->(t:Tournament {id: $tournamentId})
RETURN p.name, r.finalPosition, r.matchesWon, r.framesWon, r.prize
ORDER BY r.finalPosition ASC
```

#### Player Match History
```cypher
// Get recent matches for a player
MATCH (p:Player {id: $playerId})-[r:COMPETED]->(m:Match)-[:PLAYED_IN]->(t:Tournament)
OPTIONAL MATCH (m)<-[:COMPETED]-(opponent:Player)
WHERE opponent.id <> $playerId
RETURN m.id, t.name, opponent.name, r.won, r.finalScore, m.startTime
ORDER BY m.startTime DESC
LIMIT 20
```

#### Create Match with Results
```cypher
// Create a match and link players
MATCH (p1:Player {id: $player1Id}), (p2:Player {id: $player2Id}), (t:Tournament {id: $tournamentId})
CREATE (m:Match {
  id: $matchId,
  matchNumber: $matchNumber,
  round: $round,
  bestOf: $bestOf,
  status: 'COMPLETED',
  startTime: datetime($startTime),
  endTime: datetime($endTime),
  venue: $venue,
  tableNumber: $tableNumber
})
CREATE (m)-[:PLAYED_IN]->(t)
CREATE (p1)-[:COMPETED {
  finalScore: $player1Score,
  won: $player1Won,
  framesWon: $player1Frames,
  framesLost: $player2Frames,
  highestBreak: $player1HighBreak,
  centuries: $player1Centuries
}]->(m)
CREATE (p2)-[:COMPETED {
  finalScore: $player2Score,
  won: $player2Won,
  framesWon: $player2Frames,
  framesLost: $player1Frames,
  highestBreak: $player2HighBreak,
  centuries: $player2Centuries
}]->(m)
RETURN m
```

#### Update Player Statistics
```cypher
// Update player stats after a match
MATCH (p:Player {id: $playerId})
SET p.totalMatches = p.totalMatches + 1,
    p.matchesWon = p.matchesWon + $wonIncrement,
    p.matchesLost = p.matchesLost + $lossIncrement,
    p.winRate = toFloat(p.matchesWon) / toFloat(p.totalMatches),
    p.updatedAt = datetime()
RETURN p
```

### Redis Operations

#### Update Live Match Score
```typescript
// Update live match score
await redisClient.setEx(
  `live:match:${matchId}`, 
  7200, // 2 hours expiry
  JSON.stringify(liveMatchData)
);
```

#### Get Live Match
```typescript
// Get live match data
const matchData = await redisClient.get(`live:match:${matchId}`);
if (matchData) {
  return JSON.parse(matchData) as LiveMatch;
}
```

#### Update Global Leaderboard
```typescript
// Add player to global leaderboard
await redisClient.zAdd('leaderboard:global', {
  score: playerPoints,
  value: playerId
});

// Get top 10 from global leaderboard
const topPlayers = await redisClient.zRangeWithScores(
  'leaderboard:global', 
  0, 
  9, 
  { REV: true }
);
```

#### Tournament Leaderboard
```typescript
// Update tournament leaderboard
await redisClient.zAdd(`leaderboard:tournament:${tournamentId}`, {
  score: playerScore,
  value: playerId
});

// Get tournament top players
const tournamentTop = await redisClient.zRangeWithScores(
  `leaderboard:tournament:${tournamentId}`,
  0,
  -1,
  { REV: true }
);
```

#### Cache Player Statistics
```typescript
// Cache player statistics
await redisClient.setEx(
  `stats:player:${playerId}`,
  3600, // 1 hour expiry
  JSON.stringify(playerStats)
);

// Get cached player stats
const cachedStats = await redisClient.get(`stats:player:${playerId}`);
if (cachedStats) {
  return JSON.parse(cachedStats) as LivePlayerStats;
}
```

#### Session Management
```typescript
// Create user session
await redisClient.setEx(
  `session:${sessionId}`,
  86400, // 24 hours
  JSON.stringify(sessionData)
);

// Get user session
const session = await redisClient.get(`session:${sessionId}`);
if (session) {
  return JSON.parse(session) as UserSession;
}

// Delete session (logout)
await redisClient.del(`session:${sessionId}`);
```

#### Notifications
```typescript
// Add notification for user
await redisClient.lPush(
  `notifications:${userId}`,
  JSON.stringify(notification)
);

// Get user notifications (latest 20)
const notifications = await redisClient.lRange(
  `notifications:${userId}`,
  0,
  19
);

// Mark notification as read (update specific notification)
const notificationList = await redisClient.lRange(`notifications:${userId}`, 0, -1);
// Update and replace the list with updated notifications
```

#### Real-time Updates with Pub/Sub
```typescript
// Publisher: Broadcast live score update
await redisClient.publish('live-scores', JSON.stringify({
  matchId,
  player1Score,
  player2Score,
  frame: currentFrame
}));

// Subscriber: Listen for live score updates
redisClient.subscribe('live-scores', (message) => {
  const scoreUpdate = JSON.parse(message);
  // Broadcast to WebSocket clients
  broadcastToClients(scoreUpdate);
});
```

---

## 📈 Performance Optimization

### Neo4j Indexes
```cypher
// Create indexes for better query performance
CREATE INDEX player_id IF NOT EXISTS FOR (p:Player) ON (p.id);
CREATE INDEX player_ranking IF NOT EXISTS FOR (p:Player) ON (p.currentRanking);
CREATE INDEX tournament_date IF NOT EXISTS FOR (t:Tournament) ON (t.startDate);
CREATE INDEX match_status IF NOT EXISTS FOR (m:Match) ON (m.status);
```

### Redis Best Practices
- Use appropriate expiry times (TTL) for different data types
- Implement cache warming strategies for leaderboards  
- Use Redis pub/sub for real-time notifications
- Monitor memory usage and implement eviction policies
- Use Redis transactions (MULTI/EXEC) for atomic operations

---

## 🚀 Service Layer Examples

### Neo4j Service
```typescript
import { neo4jDriver } from './neo4j';

export class Neo4jService {
  async runQuery(query: string, parameters: any = {}) {
    const session = neo4jDriver.session();
    try {
      const result = await session.run(query, parameters);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  async getHeadToHead(player1Id: string, player2Id: string) {
    const query = `
      MATCH (p1:Player {id: $player1Id})-[r:PLAYED_AGAINST]-(p2:Player {id: $player2Id})
      RETURN p1.name as player1Name, p2.name as player2Name, 
             r.totalMatches as totalMatches, r.player1Wins as player1Wins, 
             r.player2Wins as player2Wins, r.lastPlayed as lastPlayed
    `;
    
    const result = await this.runQuery(query, { player1Id, player2Id });
    return result[0] || null;
  }

  async createPlayer(playerData: any) {
    const query = `
      CREATE (p:Player {
        id: $id,
        name: $name,
        email: $email,
        nationality: $nationality,
        dateOfBirth: date($dateOfBirth),
        currentRanking: $ranking,
        totalMatches: 0,
        matchesWon: 0,
        matchesLost: 0,
        winRate: 0.0,
        highestBreak: 0,
        centuries: 0,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN p
    `;
    
    return await this.runQuery(query, playerData);
  }

  async updatePlayerStats(playerId: string, matchWon: boolean) {
    const query = `
      MATCH (p:Player {id: $playerId})
      SET p.totalMatches = p.totalMatches + 1,
          p.matchesWon = p.matchesWon + $wonIncrement,
          p.matchesLost = p.matchesLost + $lossIncrement,
          p.winRate = toFloat(p.matchesWon) / toFloat(p.totalMatches),
          p.updatedAt = datetime()
      RETURN p
    `;
    
    return await this.runQuery(query, {
      playerId,
      wonIncrement: matchWon ? 1 : 0,
      lossIncrement: matchWon ? 0 : 1
    });
  }
}
```

### Redis Service
```typescript
import { redisClient } from './redis';

export class RedisService {
  async setLiveMatch(matchId: string, matchData: LiveMatch) {
    await redisClient.setEx(
      `live:match:${matchId}`,
      7200, // 2 hours
      JSON.stringify(matchData)
    );
  }

  async getLiveMatch(matchId: string): Promise<LiveMatch | null> {
    const data = await redisClient.get(`live:match:${matchId}`);
    return data ? JSON.parse(data) : null;
  }

  async updateLeaderboard(playerId: string, points: number) {
    await redisClient.zAdd('leaderboard:global', {
      score: points,
      value: playerId
    });
  }

  async getTopPlayers(limit: number = 10) {
    return await redisClient.zRangeWithScores(
      'leaderboard:global',
      0,
      limit - 1,
      { REV: true }
    );
  }

  async cachePlayerStats(playerId: string, stats: LivePlayerStats) {
    await redisClient.setEx(
      `stats:player:${playerId}`,
      3600, // 1 hour
      JSON.stringify(stats)
    );
  }

  async getCachedPlayerStats(playerId: string): Promise<LivePlayerStats | null> {
    const data = await redisClient.get(`stats:player:${playerId}`);
    return data ? JSON.parse(data) : null;
  }

  async publishLiveUpdate(channel: string, data: any) {
    await redisClient.publish(channel, JSON.stringify(data));
  }

  subscribeToUpdates(channel: string, callback: (data: any) => void) {
    redisClient.subscribe(channel, (message) => {
      callback(JSON.parse(message));
    });
  }
}
```

### Combined Application Service
```typescript
export class SnookerAppService {
  constructor(
    private neo4jService: Neo4jService,
    private redisService: RedisService
  ) {}

  async getPlayerProfile(playerId: string) {
    // Get permanent data from Neo4j
    const playerQuery = `
      MATCH (p:Player {id: $playerId})
      RETURN p
    `;
    const [playerData] = await this.neo4jService.runQuery(playerQuery, { playerId });

    // Get live stats from Redis cache
    const liveStats = await this.redisService.getCachedPlayerStats(playerId);

    return {
      ...playerData.p.properties,
      liveStats
    };
  }

  async recordMatchResult(matchData: any) {
    // Store permanent match data in Neo4j
    const matchQuery = `
      MATCH (p1:Player {id: $player1Id}), (p2:Player {id: $player2Id}), (t:Tournament {id: $tournamentId})
      CREATE (m:Match {
        id: $matchId,
        matchNumber: $matchNumber,
        round: $round,
        bestOf: $bestOf,
        status: 'COMPLETED',
        startTime: datetime($startTime),
        endTime: datetime($endTime)
      })
      CREATE (m)-[:PLAYED_IN]->(t)
      CREATE (p1)-[:COMPETED {
        finalScore: $player1Score,
        won: $player1Won,
        framesWon: $player1Frames,
        framesLost: $player2Frames
      }]->(m)
      CREATE (p2)-[:COMPETED {
        finalScore: $player2Score,
        won: $player2Won,
        framesWon: $player2Frames,
        framesLost: $player1Frames
      }]->(m)
      RETURN m
    `;

    await this.neo4jService.runQuery(matchQuery, matchData);

    // Update player statistics
    await this.neo4jService.updatePlayerStats(matchData.player1Id, matchData.player1Won);
    await this.neo4jService.updatePlayerStats(matchData.player2Id, matchData.player2Won);

    // Update leaderboards in Redis
    await this.updateLeaderboards(matchData);

    // Remove live match data
    await redisClient.del(`live:match:${matchData.matchId}`);
  }

  private async updateLeaderboards(matchData: any) {
    // Update global leaderboard based on new results
    // Implementation depends on your ranking system
  }
}
```

---

## 🔄 Data Flow Examples

### 1. Live Match Updates
```
Match Event → Update Neo4j (permanent storage) → Update Redis Cache → Notify Subscribers
```

### 2. Leaderboard Updates
```
Match Completion → Update Player Stats in Neo4j → Recalculate Rankings → Update Redis Leaderboard Cache
```

### 3. Head-to-Head Queries
```
User Request → Check Redis Cache → If miss: Query Neo4j → Cache Result → Return Data
```

---

This structure provides a solid foundation for your snooker application with efficient data storage and retrieval patterns for both real-time and historical data.
