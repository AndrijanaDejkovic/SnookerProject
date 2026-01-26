import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function GET() {
  const session = neo4jDriver.session({ database });

  try {
    const result = await session.run(
      `
      MATCH (t:Tournament)
      WITH t
      OPTIONAL MATCH (m:Match)-[:PLAYED_IN]->(t)
      WITH t, count(m) as totalMatches,
           sum(CASE WHEN m.status = 'FINISHED' THEN 1 ELSE 0 END) as finishedMatches
      
      RETURN 
        t.id as id,
        t.name as name,
        t.year as year,
        t.startDate as startDate,
        t.endDate as endDate,
        t.location as location,
        t.prizePool as prizePool,
        totalMatches,
        finishedMatches,
        CASE 
          WHEN t.endDate < date() THEN 'FINISHED'
          WHEN t.startDate > date() THEN 'UPCOMING'
          ELSE 'ONGOING'
        END as status
      ORDER BY t.startDate DESC
      `
    );

    const tournaments = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      year: record.get('year'),
      startDate: record.get('startDate')?.toString() || null,
      endDate: record.get('endDate')?.toString() || null,
      location: record.get('location'),
      prizePool: record.get('prizePool')?.toNumber?.() ?? 0,
      totalMatches: record.get('totalMatches')?.toNumber?.() ?? 0,
      finishedMatches: record.get('finishedMatches')?.toNumber?.() ?? 0,
      status: record.get('status'),
    }));

    console.log('Fetched tournaments:', tournaments);

    return NextResponse.json({
      success: true,
      data: tournaments
    });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch tournaments',
        details: error instanceof Error ? error.stack : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
