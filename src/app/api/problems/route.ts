import { NextResponse } from 'next/server';
import { getAppContainer } from '../../../infrastructure/di/container';

export async function GET() {
  try {
    const container = await getAppContainer();
    const problems = await container.getProblems.execute();
    return NextResponse.json({
      success: true,
      data: problems.map((p) => p.toClientJSON()),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch problems';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
