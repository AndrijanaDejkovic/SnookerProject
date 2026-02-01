import { NextResponse } from 'next/server';
import { neo4jDriver, database } from '@/lib/neo4j';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const frameId = searchParams.get('frameId');

  if (!frameId) {
    return NextResponse.json(
      { error: 'Missing required parameter: frameId' },
      { status: 400 }
    );
  }

  const session = neo4jDriver.session({ database });

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
