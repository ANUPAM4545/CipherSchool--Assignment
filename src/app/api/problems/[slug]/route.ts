import { NextRequest, NextResponse } from 'next/server';
import { getAppContainer } from '../../../../infrastructure/di/container';
import { EntityNotFoundError } from '../../../../domain/index';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const container = await getAppContainer();
    const problem = await container.getProblem.execute(params.slug);
    return NextResponse.json({
      success: true,
      data: problem.toClientJSON(),
    });
  } catch (error: unknown) {
    if (error instanceof EntityNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch problem';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
