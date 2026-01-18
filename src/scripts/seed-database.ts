import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

async function runQuery(query: string, params: any = {}, description: string = '') {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    console.log('\n' + '='.repeat(80));
    console.log(`📝 ${description}`);
    console.log('='.repeat(80));
    console.log('Query:', query.substring(0, 100) + '...');
    
    const result = await session.run(query, params);
    
    console.log(`✅ Success! Records returned: ${result.records.length}`);
    
    if (result.records.length > 0) {
      console.log('\nResults:');
      result.records.forEach((record, idx) => {
        console.log(`  Record ${idx + 1}:`, record.toObject());
      });
    }
    
    return result.records;
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    return [];
  } finally {
    await session.close();
  }
}

async function seedDatabase() {
  console.log('\n🎱 SNOOKER APP - DATABASE SEED SCRIPT');
  console.log('=====================================\n');

  try {
    // ============================================
    // 1️⃣ PLAYER ENTITY EXAMPLES
    // ============================================
    
    console.log('\n\n### 1️⃣ PLAYER ENTITY ###\n');

    // Example 1: Create Ronnie O'Sullivan
    await runQuery(
      `CREATE (p:Player {
        id: 'player-ronnie-001',
        name: 'Ronnie O'Sullivan',
        nationality: 'England',
        dateOfBirth: date('1975-12-05'),
        professionalSince: date('1992-07-01'),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN p`,
      {},
      'Example 1: Create Player - Ronnie O\'Sullivan'
    );

    // Example 2: Create Mark Selby
    await runQuery(
      `CREATE (p:Player {
        id: 'player-mark-001',
        name: 'Mark Selby',
        nationality: 'England',
        dateOfBirth: date('1983-06-19'),
        professionalSince: date('2000-05-01'),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN p`,
      {},
      'Example 2: Create Player - Mark Selby'
    );

    // Create additional players for relationships
    await runQuery(
      `CREATE (p:Player {
        id: 'player-john-001',
        name: 'John Higgins',
        nationality: 'Scotland',
        dateOfBirth: date('1975-05-18'),
        professionalSince: date('1992-01-01'),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN p`,
      {},
      'Create Player - John Higgins (for relationships)'
    );

    await runQuery(
      `CREATE (p:Player {
        id: 'player-neil-001',
        name: 'Neil Robertson',
        nationality: 'Australia',
        dateOfBirth: date('1982-09-11'),
        professionalSince: date('2000-01-01'),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN p`,
      {},
      'Create Player - Neil Robertson (for relationships)'
    );

    // Query: Get player by ID
    await runQuery(
      `MATCH (p:Player {id: 'player-ronnie-001'})
      RETURN p.name as playerName,
             p.nationality as nationality,
             p.dateOfBirth as dateOfBirth,
             p.professionalSince as professionalSince,
             duration.inYears(p.dateOfBirth, date()).years as age`,
      {},
      'Query: Get Player by ID - Ronnie O\'Sullivan with Age'
    );

    // Query: Get all players ordered by nationality
    await runQuery(
      `MATCH (p:Player)
      RETURN p.name as playerName,
             p.nationality as nationality,
             p.dateOfBirth as dateOfBirth
      ORDER BY p.nationality, p.name`,
      {},
      'Query: All Players Ordered by Nationality'
    );

    // ============================================
    // 2️⃣ TOURNAMENT ENTITY EXAMPLES
    // ============================================
    
    console.log('\n\n### 2️⃣ TOURNAMENT ENTITY ###\n');

    // Example 1: Create World Championship 2024
    await runQuery(
      `CREATE (t:Tournament {
        id: 'tournament-wc-2024',
        name: 'World Championship 2024',
        type: 'RANKING',
        startDate: date('2024-04-01'),
        endDate: date('2024-04-17'),
        venue: 'Crucible Theatre',
        city: 'Sheffield',
        country: 'England',
        prizePool: 2500000,
        status: 'COMPLETED',
        maxRounds: 7,
        createdAt: datetime()
      })
      RETURN t`,
      {},
      'Example 1: Create Tournament - World Championship 2024'
    );

    // Example 2: Create Masters 2024
    await runQuery(
      `CREATE (t:Tournament {
        id: 'tournament-masters-2024',
        name: 'Masters 2024',
        type: 'RANKING',
        startDate: date('2024-01-15'),
        endDate: date('2024-01-21'),
        venue: 'Alexandra Palace',
        city: 'London',
        country: 'England',
        prizePool: 848000,
        status: 'COMPLETED',
        maxRounds: 4,
        createdAt: datetime()
      })
      RETURN t`,
      {},
      'Example 2: Create Tournament - Masters 2024'
    );

    // Query: Get tournament by ID with participant count
    await runQuery(
      `MATCH (t:Tournament {id: 'tournament-wc-2024'})
      OPTIONAL MATCH (p:Player)-[:PARTICIPATED_IN]->(t)
      RETURN t.name as tournamentName,
             t.venue as venue,
             t.startDate as startDate,
             t.endDate as endDate,
             t.prizePool as prizePool,
             COUNT(p) as totalParticipants,
             t.status as status`,
      {},
      'Query: Tournament with Participant Count'
    );

    // ============================================
    // 3️⃣ MATCH ENTITY EXAMPLES
    // ============================================
    
    console.log('\n\n### 3️⃣ MATCH ENTITY ###\n');

    // Example 1: Create Match - World Championship Final
    await runQuery(
      `MATCH (t:Tournament {id: 'tournament-wc-2024'})
      CREATE (m:Match {
        id: 'match-wc-final-2024',
        matchNumber: 56,
        round: 'FINAL',
        bestOf: 35,
        status: 'COMPLETED',
        startTime: datetime('2024-04-14T14:00:00Z'),
        endTime: datetime('2024-04-15T22:30:00Z'),
        venue: 'Crucible Theatre',
        tableNumber: 1,
        winner: 'player-ronnie-001'
      })
      CREATE (m)-[:PLAYED_IN]->(t)
      RETURN m`,
      {},
      'Example 1: Create Match - World Championship Final'
    );

    // Example 2: Create Match - Semi-Final
    await runQuery(
      `MATCH (t:Tournament {id: 'tournament-wc-2024'})
      CREATE (m:Match {
        id: 'match-wc-semi-2024',
        matchNumber: 54,
        round: 'SEMI_FINAL',
        bestOf: 33,
        status: 'COMPLETED',
        startTime: datetime('2024-04-12T10:00:00Z'),
        endTime: datetime('2024-04-13T18:45:00Z'),
        venue: 'Crucible Theatre',
        tableNumber: 1,
        winner: 'player-ronnie-001'
      })
      CREATE (m)-[:PLAYED_IN]->(t)
      RETURN m`,
      {},
      'Example 2: Create Match - Semi-Final'
    );

    // Link players to match with competition results
    await runQuery(
      `MATCH (p1:Player {id: 'player-ronnie-001'})
      MATCH (p2:Player {id: 'player-mark-001'})
      MATCH (m:Match {id: 'match-wc-final-2024'})
      CREATE (p1)-[:COMPETED {
        finalScore: 18,
        won: true,
        framesWon: 18,
        framesLost: 13,
        highestBreak: 140,
        centuries: 5
      }]->(m)
      CREATE (p2)-[:COMPETED {
        finalScore: 13,
        won: false,
        framesWon: 13,
        framesLost: 18,
        highestBreak: 125,
        centuries: 3
      }]->(m)
      RETURN p1.name as player1,
             p2.name as player2,
             m.round as round,
             '18-13' as finalScore`,
      {},
      'Link Players to Match with Results - WC Final'
    );

    // Query: Match details with player information
    await runQuery(
      `MATCH (m:Match {id: 'match-wc-final-2024'})
      MATCH (m)-[:PLAYED_IN]->(t:Tournament)
      MATCH (p1:Player)-[r1:COMPETED]->(m)
      MATCH (p2:Player)-[r2:COMPETED]->(m)
      RETURN t.name as tournament,
             m.round as round,
             p1.name as player1,
             r1.framesWon as player1Frames,
             p2.name as player2,
             r2.framesWon as player2Frames,
             m.startTime as startTime,
             m.venue as venue,
             CASE WHEN r1.won THEN p1.name ELSE p2.name END as winner`,
      {},
      'Query: Match Details with Player Information'
    );

    // ============================================
    // 4️⃣ FRAME ENTITY EXAMPLES
    // ============================================
    
    console.log('\n\n### 4️⃣ FRAME ENTITY ###\n');

    // Example 1: Create Frame 1
    await runQuery(
      `MATCH (m:Match {id: 'match-wc-final-2024'})
      CREATE (f:Frame {
        id: 'frame-wc-final-2024-001',
        frameNumber: 1,
        winnerScore: 75,
        loserScore: 45,
        duration: duration('PT32M15S'),
        highestBreak: 67,
        status: 'COMPLETED'
      })
      CREATE (m)-[:CONTAINS_FRAME]->(f)
      RETURN f`,
      {},
      'Example 1: Create Frame 1'
    );

    // Example 2: Create Frame 2
    await runQuery(
      `MATCH (m:Match {id: 'match-wc-final-2024'})
      CREATE (f:Frame {
        id: 'frame-wc-final-2024-002',
        frameNumber: 2,
        winnerScore: 82,
        loserScore: 28,
        duration: duration('PT28M45S'),
        highestBreak: 82,
        status: 'COMPLETED'
      })
      CREATE (m)-[:CONTAINS_FRAME]->(f)
      RETURN f`,
      {},
      'Example 2: Create Frame 2'
    );

    // Link player to frame results
    await runQuery(
      `MATCH (p1:Player {id: 'player-ronnie-001'})
      MATCH (f:Frame {id: 'frame-wc-final-2024-001'})
      CREATE (p1)-[:WON_FRAME {
        score: 75,
        opponentScore: 45,
        breaks: [67, 8],
        duration: duration('PT32M15S')
      }]->(f)
      RETURN p1.name as winner,
             f.frameNumber as frameNumber,
             75 as score,
             45 as opponentScore`,
      {},
      'Link Player to Frame Results'
    );

    // Query: All frames in match with detailed stats
    await runQuery(
      `MATCH (m:Match {id: 'match-wc-final-2024'})
      MATCH (m)-[:CONTAINS_FRAME]->(f:Frame)
      MATCH (p:Player)-[r:WON_FRAME]->(f)
      RETURN f.frameNumber as frameNumber,
             p.name as winner,
             f.winnerScore as winningScore,
             f.loserScore as losingScore,
             f.highestBreak as highestBreak,
             f.duration as duration,
             f.status as status
      ORDER BY f.frameNumber ASC`,
      {},
      'Query: All Frames in Match with Stats'
    );

    // ============================================
    // 5️⃣ ADVANCED RELATIONSHIP QUERIES
    // ============================================
    
    console.log('\n\n### 5️⃣ ADVANCED RELATIONSHIP QUERIES ###\n');

    // Add tournament participation for rankings demo
    await runQuery(
      `MATCH (p:Player {id: 'player-ronnie-001'})
      MATCH (t:Tournament {id: 'tournament-wc-2024'})
      CREATE (p)-[:PARTICIPATED_IN {
        finalPosition: 1,
        prize: 500000,
        matchesPlayed: 7,
        matchesWon: 7,
        framesWon: 45,
        framesLost: 15
      }]->(t)
      RETURN p.name as player,
             t.name as tournament,
             'Champion' as result`,
      {},
      'Add Tournament Participation - Ronnie (World Champion)'
    );

    await runQuery(
      `MATCH (p:Player {id: 'player-mark-001'})
      MATCH (t:Tournament {id: 'tournament-wc-2024'})
      CREATE (p)-[:PARTICIPATED_IN {
        finalPosition: 2,
        prize: 200000,
        matchesPlayed: 7,
        matchesWon: 6,
        framesWon: 40,
        framesLost: 20
      }]->(t)
      RETURN p.name as player,
             t.name as tournament,
             'Runner-up' as result`,
      {},
      'Add Tournament Participation - Mark (Runner-up)'
    );

    // Query: Head-to-Head Statistics
    await runQuery(
      `MATCH (p1:Player {id: 'player-ronnie-001'})-[r:COMPETED]->(m:Match)<-[r2:COMPETED]-(p2:Player {id: 'player-mark-001'})
      WITH p1, p2, m,
           CASE WHEN m.winner = p1.id THEN 1 ELSE 0 END as p1Wins,
           CASE WHEN m.winner = p2.id THEN 1 ELSE 0 END as p2Wins
      RETURN p1.name as player1,
             p2.name as player2,
             COUNT(m) as totalMatches,
             SUM(p1Wins) as player1Wins,
             SUM(p2Wins) as player2Wins`,
      {},
      'Query: Head-to-Head Statistics'
    );

    // Query: Player statistics
    await runQuery(
      `MATCH (p:Player {id: 'player-ronnie-001'})
      OPTIONAL MATCH (p)-[competed:COMPETED]->(m:Match)
      WITH p, competed,
           CASE WHEN competed.won = true THEN 1 ELSE 0 END as wins,
           CASE WHEN competed.won = false THEN 1 ELSE 0 END as losses
      RETURN p.name as playerName,
             COUNT(competed) as totalMatches,
             SUM(wins) as matchesWon,
             SUM(losses) as matchesLost,
             CASE 
               WHEN COUNT(competed) > 0 
               THEN ROUND(toFloat(SUM(wins)) / toFloat(COUNT(competed)), 3)
               ELSE 0.0 
             END as winRate,
             SUM(competed.framesWon) as totalFramesWon,
             MAX(competed.highestBreak) as highestBreak,
             SUM(competed.centuries) as totalCenturies`,
      {},
      'Query: Player Career Statistics'
    );

    // Query: All matches in tournament
    await runQuery(
      `MATCH (t:Tournament {id: 'tournament-wc-2024'})
      MATCH (m:Match)-[:PLAYED_IN]->(t)
      MATCH (p1:Player)-[r1:COMPETED]->(m)
      MATCH (p2:Player)-[r2:COMPETED]->(m)
      WHERE r1.won = true
      RETURN m.round as round,
             p1.name as player1,
             p2.name as player2,
             CONCAT(r1.framesWon, '-', r2.framesWon) as score,
             m.startTime as date
      ORDER BY m.startTime DESC`,
      {},
      'Query: All Matches in Tournament'
    );

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
  } finally {
    await driver.close();
    process.exit(0);
  }
}

// Run the seed script
seedDatabase();
