import { NextRequest, NextResponse } from 'next/server';
import { getRepositoryContainer } from '@/infrastructure/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repos = await getRepositoryContainer();
    const attempt = await repos.attemptRepo.findById(params.id);

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: `Attempt '${params.id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: attempt.toJSON(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attempt';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
