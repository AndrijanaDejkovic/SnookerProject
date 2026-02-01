# Technical Documentation - Database & Caching Architecture

## Neo4j Relationships

### Graph Database Structure

The application uses **Neo4j** as a graph database to store all snooker-related entities and their relationships.

---

### Node Types

1. **Player** - Professional snooker players
2. **Tournament** - Snooker tournaments (e.g., World Championship)
3. **Match** - Individual matches between two players
4. **Frame** - Individual frames within a match

---

### Relationships

#### 1. **COMPETED** - Player to Match

(player:Player)-[:COMPETED]->(match:Match)
Description: Links a player to a match they participated in

#### 2. **WON_BY** - Match to Player 

(match:Match)-[:WON_BY]->(player:Player)
Description: Links a completed match to its winner

#### 3. **PLAYED_IN** - Match to Tournament

(match:Match)-[:PLAYED_IN]->(tournament:Tournament)
Description: Links a match to the tournament it belongs to

#### 4. **CONTAINS_FRAME** - Match to Frame

(match:Match)-[:CONTAINS_FRAME]->(frame:Frame)
Description: Links a frame to the match it belongs to


#### 5. **WON_FRAME** - Player to Frame

(player:Player)-[:WON_FRAME]->(frame:Frame)
Description: Links a player to a frame they won

## Redis 

#### 1. **Global Leaderboard Cache**
```
Key: leaderboard:global:all
TTL: 300 seconds (5 minutes)
```

Purpose: 
- Cache the complete leaderboard to avoid expensive Neo4j queries
- Recalculated every 5 minutes
- Automatically cleared when a Final match completes



#### 2. **Live Match State**
```
Key: live:match:{matchId}
TTL: 7200 seconds (2 hours)

**Purpose**: 
- Store live match state for real-time updates
- Persist across WebSocket disconnections
- Clean up automatically after 2 hours

#### 3. **Live Frame State**

Key: live:match:{matchId}:frame:{frameNumber}
TTL: 7200 seconds (2 hours)

**Purpose**: 
- Track individual frame scores during live matches
- Allow frame-by-frame replay

---

### Cache Invalidation Strategy

#### Automatic Invalidation
The leaderboard cache is automatically cleared when:
- A Final match is completed (tournament winner determined)

