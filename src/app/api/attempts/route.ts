import { NextRequest, NextResponse } from 'next/server';
import { getAppContainer } from '../../../infrastructure/di/container';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemId, learnerId = 'default-learner' } = body;

    if (!problemId) {
      return NextResponse.json(
        { success: false, error: 'problemId is required' },
        { status: 400 }
      );
    }

    const container = await getAppContainer();
    const attempt = await container.startAttempt.execute({ problemId, learnerId });

    return NextResponse.json(
      { success: true, data: attempt.toJSON() },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start attempt';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
