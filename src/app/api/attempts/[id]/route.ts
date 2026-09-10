import { NextRequest, NextResponse } from 'next/server';
import { getAppContainer } from '../../../../infrastructure/di/container';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = await getAppContainer();
    const attempt = await container.attemptRepo.findById(params.id);

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
