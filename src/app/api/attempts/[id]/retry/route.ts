import { NextRequest, NextResponse } from 'next/server';
import { getAppContainer } from '@/infrastructure/di/container';
import { DomainError } from '@/domain/exceptions/DomainExceptions';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = await getAppContainer();
    const newAttempt = await container.retryAttempt.execute(params.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Created new attempt for deliberate retry',
        data: newAttempt.toJSON(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : 'Retry creation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
