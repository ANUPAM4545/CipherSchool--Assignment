import { NextRequest, NextResponse } from 'next/server';
import { getAppContainer } from '@/infrastructure/di/container';
import { CodeSubmissionPayload, ValidationError, DomainError } from '@/domain';


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const container = await getAppContainer();

    const attempt = await container.startAttempt['attemptRepo'].findById(params.id);
    if (!attempt) {
      return NextResponse.json({ success: false, error: `Attempt '${params.id}' not found` }, { status: 404 });
    }

    const problem = await container.getProblem.execute(attempt.problemId);
    if (!problem.isCoding || !problem.codingConfig) {
      return NextResponse.json(
        { success: false, error: `Problem '${problem.title}' is not a coding problem` },
        { status: 400 }
      );
    }

    const payload = new CodeSubmissionPayload({
      language: body.language,
      sourceCode: body.sourceCode || '',
      entryPoint: body.entryPoint || problem.codingConfig.entryPoint,
    });

    const structValidation = payload.validateStructure();
    if (!structValidation.isValid) {
      return NextResponse.json({ success: false, errors: structValidation.errors }, { status: 400 });
    }

    // Execute visible tests ONLY (fast feedback loop)
    const executionResult = await container.codeExecutionService.execute(
      payload,
      problem.codingConfig,
      { runVisibleOnly: true }
    );

    return NextResponse.json({
      success: true,
      data: executionResult.toSafeClientJSON(),
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    if (error instanceof DomainError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : 'Execution failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
