import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const frameId = searchParams.get('frameId');

  if (!frameId) {
    return NextResponse.json(
      { error: 'Missing required parameter: frameId' },
      { status: 400 }
    );
  }

  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j'
  });

  try {
    const result = await session.run(
      `MATCH (f:Frame {id: $frameId})
       DETACH DELETE f
       RETURN f.id as frameId`,
      { frameId }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'Frame not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Frame ${frameId} deleted successfully`,
      frameId: frameId
    });

  } catch (error) {
    console.error('Error deleting frame:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
