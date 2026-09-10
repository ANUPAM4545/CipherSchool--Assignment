import { NextRequest, NextResponse } from 'next/server';
import { getAppContainer } from '../../../../../infrastructure/di/container';
import { StructuredTextPayload, CodeSubmissionPayload, ValidationError, DomainError } from '../../../../../domain/index';


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    let payload;
    if (body.format === 'CODE' || body.sourceCode !== undefined) {
      payload = new CodeSubmissionPayload({
        language: body.language,
        sourceCode: body.sourceCode || '',
        entryPoint: body.entryPoint,
        customInput: body.customInput,
      });
    } else {
      payload = new StructuredTextPayload({
        requirementsUnderstanding: body.requirementsUnderstanding || '',
        assumptionsAndConstraints: body.assumptionsAndConstraints || '',
        classesAndEntities: body.classesAndEntities || '',
        responsibilities: body.responsibilities || '',
        relationshipsAndInterfaces: body.relationshipsAndInterfaces || '',
        patternsAndTradeoffs: body.patternsAndTradeoffs || '',
        edgeCasesAndReasoning: body.edgeCasesAndReasoning || '',
      });
    }

    const container = await getAppContainer();
    const attempt = await container.submitSolution.execute({
      attemptId: params.id,
      payload,
    });

    return NextResponse.json({
      success: true,
      message: 'Solution persisted successfully in SUBMITTED state',
      data: attempt.toJSON(),
    });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    if (error instanceof DomainError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : 'Submission failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
