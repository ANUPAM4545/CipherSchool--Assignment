import { NextRequest, NextResponse } from 'next/server';
import { getAppContainer } from '@/infrastructure/di/container';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId');
    const learnerId = searchParams.get('learnerId') || 'default-learner';

    if (!problemId) {
      return NextResponse.json(
        { success: false, error: 'problemId query parameter is required' },
        { status: 400 }
      );
    }

    const container = await getAppContainer();
    const history = await container.getAttemptHistory.execute(problemId, learnerId);

    return NextResponse.json({
      success: true,
      data: history.map((a) => a.toJSON()),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch history';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
