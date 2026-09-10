'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { SAMPLE_TEMPLATES, SampleArchitectureTemplate } from './sampleTemplates';

interface CodingExampleData {
  input: string;
  output: string;
  explanation?: string;
}

interface TestCaseClientData {
  id?: string;
  testCaseId?: string;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  explanation?: string;
  executionTimeMs?: number;
  status?: 'PASSED' | 'FAILED';
  error?: string;
  isHidden: boolean;
}

interface CodingProblemConfigClient {
  entryPoint: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: CodingExampleData[];
  visibleTestCases: TestCaseClientData[];
  hiddenTestCasesCount?: number;
  starterCode: Record<string, string>;
  allowedLanguages: string[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

interface ProblemData {
  id: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type?: 'LLD' | 'CODING';
  shortDescription: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  constraints: string[];
  conceptsPracticed: string[];
  rubricDimensions: string[];
  codingConfig?: CodingProblemConfigClient;
}

interface CriterionFeedbackData {
  criterion: string;
  score: number;
  rating: 'NEEDS_WORK' | 'COMPETENT' | 'EXEMPLARY';
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

interface EvaluationData {
  id: string;
  attemptId: string;
  evaluatorId: string;
  totalScore: number;
  maxTotalScore: number;
  averageScore: number;
  overallRating: 'NEEDS_WORK' | 'COMPETENT' | 'EXEMPLARY';
  summary: string;
  criteria: CriterionFeedbackData[];
  evaluatedAt: string;
}

interface ExecutionResultClient {
  status: string;
  allPassed: boolean;
  compileSuccess: boolean;
  runtimeSuccess: boolean;
  testsPassed: number;
  testsFailed: number;
  totalTests: number;
  visibleSummary?: { passed: number; total: number };
  hiddenSummary?: { passed: number; total: number };
  executionTimeMs: number;
  memoryUsageKb?: number;
  stdout: string;
  stderr: string;
  errorType?: string;
  testCaseResults: TestCaseClientData[];
}

interface AttemptData {
  id: string;
  problemId: string;
  learnerId: string;
  attemptNumber: number;
  parentAttemptId?: string;
  state: 'DRAFT' | 'SUBMITTED' | 'EVALUATING' | 'COMPLETED' | 'FAILED';
  submission?: {
    id: string;
    format: string;
    payload: Record<string, any>;
    submittedAt: string;
    contentHash: string;
  } | null;
  prefilledPayload?: Record<string, any> | null;
  evaluation?: EvaluationData | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  problem: ProblemData;
  initialAttempt: AttemptData;
  initialHistory: AttemptData[];
}

const getCriterionIcon = (criterion: string): string => {
  const lower = criterion.toLowerCase();
  if (lower.includes('requirement')) return '🎯';
  if (lower.includes('class') || lower.includes('responsibilit')) return '🧩';
  if (lower.includes('coupling') || lower.includes('cohesion')) return '🔗';
  if (lower.includes('interface') || lower.includes('encapsulation')) return '🛡️';
  if (lower.includes('pattern') || lower.includes('abstraction')) return '🏛️';
  if (lower.includes('extensib') || lower.includes('evolution')) return '⚡';
  if (lower.includes('edge') || lower.includes('test')) return '🧪';
  if (lower.includes('explanation') || lower.includes('quality of')) return '📝';
  if (lower.includes('algorithm') || lower.includes('correctness')) return '🧠';
  if (lower.includes('time') || lower.includes('complexity')) return '⏱️';
  if (lower.includes('space') || lower.includes('memory')) return '💾';
  if (lower.includes('idiomatic')) return '⚡';
  if (lower.includes('alternatives') || lower.includes('optimization')) return '🚀';
  return '✨';
};

export default function PracticeWorkspace({
  problem,
  initialAttempt,
  initialHistory,
}: Props) {
  const isCoding = problem.type === 'CODING';

  const [activeTab, setActiveTab] = useState<'spec' | 'rubric' | 'history'>('spec');
  const [attempt, setAttempt] = useState<AttemptData>(initialAttempt);
  const [history, setHistory] = useState<AttemptData[]>(initialHistory);

  // LLD Structured Form State
  const initialPayload = (initialAttempt.prefilledPayload ||
    initialAttempt.submission?.payload ||
    {}) as Partial<SampleArchitectureTemplate>;

  const [formData, setFormData] = useState<SampleArchitectureTemplate>({
    requirementsUnderstanding: initialPayload.requirementsUnderstanding || '',
    assumptionsAndConstraints: initialPayload.assumptionsAndConstraints || '',
    classesAndEntities: initialPayload.classesAndEntities || '',
    responsibilities: initialPayload.responsibilities || '',
    relationshipsAndInterfaces: initialPayload.relationshipsAndInterfaces || '',
    patternsAndTradeoffs: initialPayload.patternsAndTradeoffs || '',
    edgeCasesAndReasoning: initialPayload.edgeCasesAndReasoning || '',
  });

  // Coding Workspace State
  const defaultLanguage = (problem.codingConfig?.allowedLanguages?.[0] as 'javascript' | 'python') || 'javascript';
  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'python'>(
    (initialAttempt.submission?.payload?.language as any) || defaultLanguage
  );

  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({
    javascript:
      (initialAttempt.submission?.payload?.language === 'javascript'
        ? initialAttempt.submission?.payload?.sourceCode
        : '') ||
      problem.codingConfig?.starterCode?.javascript ||
      '// Write your JavaScript solution here\n',
    python:
      (initialAttempt.submission?.payload?.language === 'python'
        ? initialAttempt.submission?.payload?.sourceCode
        : '') ||
      problem.codingConfig?.starterCode?.python ||
      '# Write your Python solution here\n',
  });

  const currentSourceCode = codeByLanguage[selectedLanguage] || '';

  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResultClient | null>(null);
  const [activeTestIndex, setActiveTestIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Layout Controls for AI Reviewer Side Panel
  const [activeLeftTab, setActiveLeftTab] = useState<'solution' | 'spec'>('solution');
  const [layoutMode, setLayoutMode] = useState<'split' | 'three-col'>('split');
  const [isAiReviewerOpen, setIsAiReviewerOpen] = useState<boolean>(true);

  const latestCompletedWithEval = useMemo(() => {
    return history.find((h) => h.evaluation);
  }, [history]);

  const displayEvaluation = attempt.evaluation || (attempt.state === 'DRAFT' ? latestCompletedWithEval?.evaluation : null);
  const isCurrentlyEvaluating = isEvaluating || attempt.state === 'EVALUATING';
  const hasSideReview = Boolean(displayEvaluation || isCurrentlyEvaluating);

  const [criteriaFilter, setCriteriaFilter] = useState<'ALL' | 'NEEDS_WORK' | 'COMPETENT' | 'EXEMPLARY'>('ALL');

  const ratingCounts = useMemo(() => {
    if (!displayEvaluation) return { exemplary: 0, competent: 0, needsWork: 0, total: 0 };
    return {
      total: displayEvaluation.criteria.length,
      exemplary: displayEvaluation.criteria.filter((c) => c.rating === 'EXEMPLARY').length,
      competent: displayEvaluation.criteria.filter((c) => c.rating === 'COMPETENT').length,
      needsWork: displayEvaluation.criteria.filter((c) => c.rating === 'NEEDS_WORK').length,
    };
  }, [displayEvaluation]);

  const filteredCriteria = useMemo(() => {
    if (!displayEvaluation) return [];
    if (criteriaFilter === 'ALL') return displayEvaluation.criteria;
    return displayEvaluation.criteria.filter((c) => c.rating === criteriaFilter);
  }, [displayEvaluation, criteriaFilter]);

  const [collapsedCriteria, setCollapsedCriteria] = useState<Record<string, boolean>>({});
  const [copiedCriterion, setCopiedCriterion] = useState<string | null>(null);

  const toggleCriterionCollapse = (criterionName: string) => {
    setCollapsedCriteria((prev) => ({
      ...prev,
      [criterionName]: !prev[criterionName],
    }));
  };

  const areAllCollapsed = useMemo(() => {
    if (!displayEvaluation || displayEvaluation.criteria.length === 0) return false;
    return displayEvaluation.criteria.every((c) => collapsedCriteria[c.criterion]);
  }, [displayEvaluation, collapsedCriteria]);

  const handleToggleAllCriteria = () => {
    if (!displayEvaluation) return;
    if (areAllCollapsed) {
      setCollapsedCriteria({});
    } else {
      const all: Record<string, boolean> = {};
      displayEvaluation.criteria.forEach((c) => {
        all[c.criterion] = true;
      });
      setCollapsedCriteria(all);
    }
  };

  const handleCopySuggestion = (text: string, criterionName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCriterion(criterionName);
      setTimeout(() => {
        setCopiedCriterion((curr) => (curr === criterionName ? null : curr));
      }, 2000);
    }
  };

  const gridColumns = useMemo(() => {
    if (!hasSideReview || !isAiReviewerOpen) {
      return 'minmax(320px, 460px) 1fr';
    }
    if (layoutMode === 'three-col') {
      return 'minmax(280px, 340px) minmax(420px, 1fr) minmax(380px, 460px)';
    }
    // split mode: Left is either solution or spec, Right is AI Reviewer
    return 'minmax(420px, 1.15fr) minmax(380px, 1fr)';
  }, [hasSideReview, isAiReviewerOpen, layoutMode]);

  const difficultyMeta = {
    EASY: { label: 'Beginner', dot: '#10b981', bg: '#f0fdf4', text: '#15803d', border: 'rgba(21, 128, 61, 0.2)' },
    MEDIUM: { label: 'Intermediate', dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: 'rgba(180, 83, 9, 0.2)' },
    HARD: { label: 'Advanced', dot: '#e11d48', bg: '#fff1f2', text: '#be123c', border: 'rgba(190, 18, 60, 0.2)' },
  };

  const stateMeta = {
    DRAFT: { label: 'Draft', dot: '#71717a', bg: '#f4f4f5', text: '#52525b', border: 'rgba(0,0,0,0.08)' },
    SUBMITTED: { label: 'Submitted', dot: '#4f46e5', bg: '#eef2ff', text: '#4338ca', border: 'rgba(79, 70, 229, 0.2)' },
    EVALUATING: { label: 'Evaluating', dot: '#0284c7', bg: '#f0f9ff', text: '#0369a1', border: 'rgba(2, 132, 199, 0.2)' },
    COMPLETED: { label: 'Completed', dot: '#059669', bg: '#f0fdf4', text: '#15803d', border: 'rgba(5, 150, 105, 0.2)' },
    FAILED: { label: 'Failed', dot: '#e11d48', bg: '#fff1f2', text: '#be123c', border: 'rgba(225, 29, 72, 0.2)' },
  };

  const handleSourceCodeChange = (newCode: string) => {
    setCodeByLanguage((prev) => ({ ...prev, [selectedLanguage]: newCode }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleResetCode = () => {
    const starter = problem.codingConfig?.starterCode?.[selectedLanguage] || '';
    if (starter) {
      handleSourceCodeChange(starter);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const updated = val.substring(0, start) + '  ' + val.substring(end);
      handleSourceCodeChange(updated);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Run Code (Visible Tests Only, Fast Deterministic Execution)
  const handleRunCode = async () => {
    setIsRunningCode(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/attempts/${attempt.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage,
          sourceCode: currentSourceCode,
          entryPoint: problem.codingConfig?.entryPoint,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.errors?.join('; ') || data.error || 'Execution failed');
      }

      setExecutionResult(data.data);
      setActiveTestIndex(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      setErrorMessage(msg);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Submit Solution (Visible + Hidden Tests + Full AI Evaluation)
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let targetAttemptId = attempt.id;

      // If current attempt is already COMPLETED, automatically fork the next iteration attempt
      if (attempt.state === 'COMPLETED') {
        const retryRes = await fetch(`/api/attempts/${attempt.id}/retry`, {
          method: 'POST',
        });
        const retryData = await retryRes.json();
        if (!retryRes.ok || !retryData.success) {
          throw new Error(retryData.error || 'Failed to initiate next iteration attempt');
        }
        targetAttemptId = retryData.data.id;
        setAttempt(retryData.data);
      }

      // 1. Persist Submission
      const payloadBody = isCoding
        ? {
            format: 'CODE',
            language: selectedLanguage,
            sourceCode: currentSourceCode,
            entryPoint: problem.codingConfig?.entryPoint,
          }
        : {
            format: 'STRUCTURED_TEXT',
            ...formData,
          };

      const submitRes = await fetch(`/api/attempts/${targetAttemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.success) {
        throw new Error(
          submitData.errors?.join('; ') || submitData.error || 'Submission failed'
        );
      }

      setAttempt(submitData.data);
      setIsSubmitting(false);
      setIsEvaluating(true);

      // 2. Trigger Evaluation Pipeline
      const evalRes = await fetch(`/api/attempts/${targetAttemptId}/evaluate`, {
        method: 'POST',
      });
      const evalData = await evalRes.json();

      if (!evalRes.ok || !evalData.success) {
        throw new Error(evalData.error || 'Evaluation failed');
      }

      setAttempt(evalData.data);

      // Refresh history
      const histRes = await fetch(
        `/api/attempts/history?problemId=${problem.id}&learnerId=${attempt.learnerId}`
      );
      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.success) {
          setHistory(histData.data);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
      setIsEvaluating(false);
    }
  };

  const handleRetry = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/attempts/${attempt.id}/retry`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create retry attempt');
      }

      const newAttempt: AttemptData = data.data;
      setAttempt(newAttempt);
      setExecutionResult(null);

      // Re-seed starter code if coding problem
      if (isCoding && (newAttempt.prefilledPayload?.sourceCode || newAttempt.submission?.payload?.sourceCode)) {
        handleSourceCodeChange(
          (newAttempt.prefilledPayload?.sourceCode || newAttempt.submission?.payload?.sourceCode) as string
        );
      } else if (!isCoding && newAttempt.prefilledPayload) {
        setFormData(newAttempt.prefilledPayload as any);
      }

      const histRes = await fetch(
        `/api/attempts/history?problemId=${problem.id}&learnerId=${attempt.learnerId}`
      );
      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.success) {
          setHistory(histData.data);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry failed';
      setErrorMessage(msg);
    }
  };

  const lineNumbers = useMemo(() => {
    const lines = currentSourceCode.split('\n').length;
    return Array.from({ length: Math.max(12, lines) }, (_, i) => i + 1);
  }, [currentSourceCode]);

  const renderProblemSpec = () => (
    <div
      style={{
        borderRadius: 'var(--radius-card)',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Problem Description
        </h2>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {problem.shortDescription}
        </p>

        {/* Coding Examples (if coding problem) */}
        {isCoding && problem.codingConfig?.examples && problem.codingConfig.examples.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Examples
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {problem.codingConfig.examples.map((ex, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-inner)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Example {idx + 1}:
                  </div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    <strong>Input:</strong> {ex.input}
                  </div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    <strong>Output:</strong> {ex.output}
                  </div>
                  {ex.explanation && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <em>{ex.explanation}</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Requirements
          </h3>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {problem.functionalRequirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Constraints */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Constraints
          </h3>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {problem.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        {/* Concepts Practiced */}
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Concepts Evaluated
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {problem.conceptsPracticed.map((c, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAiReviewerSidePanel = () => (
    <div
      className="ai-reviewer-side-panel"
      style={{
        position: 'sticky',
        top: '1.25rem',
        maxHeight: 'calc(100vh - 2.5rem)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        paddingRight: '2px',
      }}
    >
      {/* Side Panel Header Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: 'var(--radius-inner)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              AI Reviewer
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              {displayEvaluation
                ? `Attempt #${attempt.attemptNumber} · ${displayEvaluation.criteria.length} Dimensions`
                : 'Gemini Evaluator'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setLayoutMode(layoutMode === 'split' ? 'three-col' : 'split')}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            title={layoutMode === 'split' ? 'Switch to 3-Column View' : 'Switch to Split View'}
          >
            {layoutMode === 'split' ? '🔀 3 Columns' : '📄 Split View'}
          </button>

          <button
            type="button"
            onClick={() => setIsAiReviewerOpen(false)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Collapse AI Reviewer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Evaluating State */}
      {isCurrentlyEvaluating && (
        <div
          style={{
            padding: '2rem 1.5rem',
            borderRadius: 'var(--radius-card)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              margin: '0 auto 1rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            ⏳
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Evaluating Solution...
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Gemini is evaluating your submission against all rubric dimensions and analyzing technical depth.
          </p>
        </div>
      )}

      {/* Completed Evaluation Results */}
      {displayEvaluation && (
        <>
          {/* Executive Summary Card */}
          <div
            style={{
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}
          >
            {/* Top Score Accent Bar */}
            <div
              style={{
                height: '4px',
                width: '100%',
                background:
                  displayEvaluation.overallRating === 'EXEMPLARY'
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : displayEvaluation.overallRating === 'COMPETENT'
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                    : 'linear-gradient(90deg, #f43f5e, #e11d48)',
              }}
            />

            <div style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                    }}
                  >
                    Evaluation Outcome
                  </div>
                  <h2
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      marginTop: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>Design Rating:</span>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        backgroundColor:
                          displayEvaluation.overallRating === 'EXEMPLARY'
                            ? 'var(--accent-emerald-bg)'
                            : displayEvaluation.overallRating === 'COMPETENT'
                            ? 'var(--accent-amber-bg)'
                            : 'var(--accent-rose-bg)',
                        color:
                          displayEvaluation.overallRating === 'EXEMPLARY'
                            ? 'var(--accent-emerald)'
                            : displayEvaluation.overallRating === 'COMPETENT'
                            ? 'var(--accent-amber)'
                            : 'var(--accent-rose)',
                        border: `1px solid ${
                          displayEvaluation.overallRating === 'EXEMPLARY'
                            ? 'var(--accent-emerald-border)'
                            : displayEvaluation.overallRating === 'COMPETENT'
                            ? 'var(--accent-amber-border)'
                            : 'var(--accent-rose-border)'
                        }`,
                      }}
                    >
                      {displayEvaluation.overallRating}
                    </span>
                  </h2>
                </div>

                {/* Score Box */}
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-inner)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'center',
                    minWidth: '100px',
                  }}
                >
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {displayEvaluation.totalScore}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {' '}/ {displayEvaluation.maxTotalScore}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Avg: {displayEvaluation.averageScore} / 10
                  </div>
                </div>
              </div>

              {/* Visual Score Progress Bar */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-pill)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (displayEvaluation.totalScore / displayEvaluation.maxTotalScore) * 100)}%`,
                      background:
                        displayEvaluation.overallRating === 'EXEMPLARY'
                          ? 'linear-gradient(90deg, #10b981, #059669)'
                          : displayEvaluation.overallRating === 'COMPETENT'
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #f43f5e, #e11d48)',
                      borderRadius: 'var(--radius-pill)',
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>

              {/* Quick Dimension Breakdown Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {ratingCounts.exemplary > 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--accent-emerald-bg)',
                      border: '1px solid var(--accent-emerald-border)',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      color: 'var(--accent-emerald)',
                    }}
                  >
                    <span>✓</span> {ratingCounts.exemplary} Exemplary
                  </div>
                )}
                {ratingCounts.competent > 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--accent-amber-bg)',
                      border: '1px solid var(--accent-amber-border)',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      color: 'var(--accent-amber)',
                    }}
                  >
                    <span>⚡</span> {ratingCounts.competent} Competent
                  </div>
                )}
                {ratingCounts.needsWork > 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--accent-rose-bg)',
                      border: '1px solid var(--accent-rose-border)',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      color: 'var(--accent-rose)',
                    }}
                  >
                    <span>⚠️</span> {ratingCounts.needsWork} Needs Work
                  </div>
                )}
              </div>

              {/* Executive Summary Block */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-inner)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  marginBottom: '1.25rem',
                }}
              >
                {displayEvaluation.summary}
              </div>

              <button
                type="button"
                onClick={handleRetry}
                className="btn-pill-primary"
                style={{
                  width: '100%',
                  padding: '11px 18px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>↻</span> Iterate Solution (Attempt #{attempt.attemptNumber + 1})
              </button>
            </div>
          </div>

          {/* Criteria Breakdown Header & Filter Bar */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Criteria Breakdown ({displayEvaluation.criteria.length})
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Grounded in actual submission code & design
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAllCriteria}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
                title={areAllCollapsed ? 'Expand all criteria cards' : 'Collapse all criteria cards'}
              >
                <span>{areAllCollapsed ? '⤢' : '⤡'}</span>
                <span>{areAllCollapsed ? 'Expand All' : 'Collapse All'}</span>
              </button>
            </div>

            {/* Filter Chips Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCriteriaFilter('ALL')}
                style={{
                  padding: '4px 11px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: criteriaFilter === 'ALL' ? 'var(--accent-black)' : 'var(--bg-surface)',
                  color: criteriaFilter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                  border: criteriaFilter === 'ALL' ? '1px solid var(--accent-black)' : '1px solid var(--border-medium)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: criteriaFilter === 'ALL' ? 'var(--shadow-button)' : 'none',
                }}
              >
                All ({ratingCounts.total})
              </button>

              {ratingCounts.needsWork > 0 && (
                <button
                  type="button"
                  onClick={() => setCriteriaFilter(criteriaFilter === 'NEEDS_WORK' ? 'ALL' : 'NEEDS_WORK')}
                  style={{
                    padding: '4px 11px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: criteriaFilter === 'NEEDS_WORK' ? '#e11d48' : 'var(--bg-surface)',
                    color: criteriaFilter === 'NEEDS_WORK' ? '#ffffff' : '#be123c',
                    border: criteriaFilter === 'NEEDS_WORK' ? '1px solid #e11d48' : '1px solid rgba(225, 29, 72, 0.25)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ⚠️ Needs Work ({ratingCounts.needsWork})
                </button>
              )}

              {ratingCounts.competent > 0 && (
                <button
                  type="button"
                  onClick={() => setCriteriaFilter(criteriaFilter === 'COMPETENT' ? 'ALL' : 'COMPETENT')}
                  style={{
                    padding: '4px 11px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: criteriaFilter === 'COMPETENT' ? '#d97706' : 'var(--bg-surface)',
                    color: criteriaFilter === 'COMPETENT' ? '#ffffff' : '#b45309',
                    border: criteriaFilter === 'COMPETENT' ? '1px solid #d97706' : '1px solid rgba(217, 119, 6, 0.25)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ⚡ Competent ({ratingCounts.competent})
                </button>
              )}

              {ratingCounts.exemplary > 0 && (
                <button
                  type="button"
                  onClick={() => setCriteriaFilter(criteriaFilter === 'EXEMPLARY' ? 'ALL' : 'EXEMPLARY')}
                  style={{
                    padding: '4px 11px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: criteriaFilter === 'EXEMPLARY' ? '#059669' : 'var(--bg-surface)',
                    color: criteriaFilter === 'EXEMPLARY' ? '#ffffff' : '#15803d',
                    border: criteriaFilter === 'EXEMPLARY' ? '1px solid #059669' : '1px solid rgba(5, 150, 105, 0.25)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ✓ Exemplary ({ratingCounts.exemplary})
                </button>
              )}
            </div>
          </div>

          {/* Criteria Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filteredCriteria.map((c, idx) => {
              const ratingMeta =
                c.rating === 'EXEMPLARY'
                  ? {
                      bg: 'var(--accent-emerald-bg)',
                      text: 'var(--accent-emerald)',
                      border: 'var(--accent-emerald-border)',
                      gradient: 'linear-gradient(90deg, #10b981, #059669)',
                      dot: '#10b981',
                      statusDesc: 'Exceeds standard',
                    }
                  : c.rating === 'COMPETENT'
                  ? {
                      bg: 'var(--accent-amber-bg)',
                      text: 'var(--accent-amber)',
                      border: 'var(--accent-amber-border)',
                      gradient: 'linear-gradient(90deg, #f59e0b, #d97706)',
                      dot: '#f59e0b',
                      statusDesc: 'Meets baseline',
                    }
                  : {
                      bg: 'var(--accent-rose-bg)',
                      text: 'var(--accent-rose)',
                      border: 'var(--accent-rose-border)',
                      gradient: 'linear-gradient(90deg, #f43f5e, #e11d48)',
                      dot: '#f43f5e',
                      statusDesc: 'Action required',
                    };

              const icon = getCriterionIcon(c.criterion);
              const isCollapsed = Boolean(collapsedCriteria[c.criterion]);
              const isCopied = copiedCriterion === c.criterion;

              return (
                <div
                  key={c.criterion}
                  className="ai-criteria-card rubric-card-cascade"
                  style={{
                    animationDelay: `${idx * 0.04}s`,
                  }}
                >
                  {/* Top Color Accent Line */}
                  <div
                    style={{
                      height: '3px',
                      width: '100%',
                      background: ratingMeta.gradient,
                    }}
                  />

                  <div style={{ padding: '1.25rem 1.35rem' }}>
                    {/* Interactive Card Header */}
                    <div
                      onClick={() => toggleCriterionCollapse(c.criterion)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Rounded Icon Badge */}
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: ratingMeta.bg,
                            border: `1px solid ${ratingMeta.border}`,
                            fontSize: '1.15rem',
                            flexShrink: 0,
                          }}
                        >
                          {icon}
                        </div>

                        <div>
                          <h4
                            style={{
                              fontSize: '0.975rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              letterSpacing: '-0.01em',
                              margin: 0,
                            }}
                          >
                            {c.criterion}
                          </h4>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                            Dimension Assessment • {ratingMeta.statusDesc}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Rating Pill with glowing dot */}
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: ratingMeta.bg,
                            color: ratingMeta.text,
                            border: `1px solid ${ratingMeta.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: ratingMeta.dot,
                            }}
                          />
                          {c.rating}
                        </span>

                        {/* Score Badge */}
                        <div
                          style={{
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '2px',
                          }}
                        >
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {c.score}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            / 10
                          </span>
                        </div>

                        {/* Expand/Collapse Chevron Button */}
                        <button
                          type="button"
                          aria-label={isCollapsed ? 'Expand criterion details' : 'Collapse criterion details'}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            transition: 'transform 0.2s ease, color 0.15s ease',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          }}
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* Micro Score Gauge Bar */}
                    <div style={{ marginTop: '0.75rem', marginBottom: isCollapsed ? '0.5rem' : '1rem' }}>
                      <div
                        style={{
                          height: '3px',
                          width: '100%',
                          backgroundColor: 'var(--bg-subtle)',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${c.score * 10}%`,
                            background: ratingMeta.gradient,
                            borderRadius: '9999px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Collapsed State Teaser */}
                    {isCollapsed ? (
                      <div
                        onClick={() => toggleCriterionCollapse(c.criterion)}
                        style={{
                          fontSize: '0.775rem',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-subtle)',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                          <span style={{ fontWeight: 600 }}>Note:</span> {c.concern}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-black)', fontWeight: 600, flexShrink: 0 }}>
                          View Details →
                        </span>
                      </div>
                    ) : (
                      /* Expanded Content Editorial Flow */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Grounded Evidence Section */}
                        <div className="ai-evidence-box">
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              marginBottom: '5px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                              }}
                            >
                              <span style={{ fontSize: '0.8rem' }}>💬</span> Submission Excerpt
                            </div>
                            {c.confidence && (
                              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {Math.round(c.confidence * 100)}% Grounded
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '0.85rem',
                              lineHeight: 1.55,
                              color: 'var(--text-secondary)',
                              fontStyle: 'italic',
                              paddingLeft: '6px',
                            }}
                          >
                            &ldquo;{c.evidence}&rdquo;
                          </div>
                        </div>

                        {/* Architectural / Algorithmic Concern */}
                        <div className={c.rating === 'NEEDS_WORK' ? 'ai-concern-box-needs-work' : 'ai-concern-box'}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: c.rating === 'NEEDS_WORK' ? '#be123c' : '#b45309',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              marginBottom: '3px',
                            }}
                          >
                            <span>⚠️</span> {isCoding ? 'Algorithmic Observation' : 'Architectural Concern'}
                          </div>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              lineHeight: 1.5,
                              color: c.rating === 'NEEDS_WORK' ? '#881337' : '#78350f',
                            }}
                          >
                            {c.concern}
                          </div>
                        </div>

                        {/* Pedagogical Suggestion / Actionable Recommendation */}
                        <div className="ai-suggestion-box">
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              marginBottom: '3px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#047857',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              <span>💡</span> Recommended Action
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySuggestion(c.suggestion, c.criterion);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.675rem',
                                fontWeight: 600,
                                backgroundColor: isCopied ? '#059669' : 'rgba(16, 185, 129, 0.12)',
                                color: isCopied ? '#ffffff' : '#047857',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Copy suggestion to clipboard to use in your next draft"
                            >
                              <span>{isCopied ? '✓' : '📋'}</span>
                              <span>{isCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              lineHeight: 1.5,
                              color: '#064e3b',
                            }}
                          >
                            {c.suggestion}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.25rem 1.5rem 4rem 1.5rem' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-card)',
              transition: 'all 0.2s ease',
            }}
            title="Back to Catalog"
          >
            ←
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: isCoding ? '#e0e7ff' : '#f1f5f9',
                  color: isCoding ? '#4338ca' : '#475569',
                  border: isCoding ? '1px solid rgba(67, 56, 202, 0.2)' : '1px solid rgba(71, 85, 105, 0.2)',
                }}
              >
                {isCoding ? 'CODING PRACTICE' : 'LLD PRACTICE'}
              </span>

              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: difficultyMeta[problem.difficulty].bg,
                  color: difficultyMeta[problem.difficulty].text,
                  border: `1px solid ${difficultyMeta[problem.difficulty].border}`,
                }}
              >
                {difficultyMeta[problem.difficulty].label}
              </span>
            </div>

            <h1
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                marginTop: '4px',
              }}
            >
              {problem.title}
            </h1>
          </div>
        </div>

        {/* Right Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: stateMeta[attempt.state].bg,
              color: stateMeta[attempt.state].text,
              border: `1px solid ${stateMeta[attempt.state].border}`,
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: stateMeta[attempt.state].dot,
              }}
            />
            Attempt #{attempt.attemptNumber} · {stateMeta[attempt.state].label}
          </div>

          {hasSideReview && !isAiReviewerOpen && (
            <button
              type="button"
              onClick={() => setIsAiReviewerOpen(true)}
              className="btn-pill-secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.825rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <span>🤖</span> AI Review {displayEvaluation ? `(${displayEvaluation.totalScore}/${displayEvaluation.maxTotalScore})` : ''}
            </button>
          )}

          <button
            onClick={() => setActiveTab(activeTab === 'history' ? 'spec' : 'history')}
            className="btn-pill-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {/* History Drawer */}
      {activeTab === 'history' && (
        <div
          style={{
            marginBottom: '1.75rem',
            padding: '1.25rem',
            borderRadius: 'var(--radius-card)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Attempt Progression &amp; Lineage
            </h3>
            <button
              onClick={() => setActiveTab('spec')}
              style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Close ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-inner)',
                  backgroundColor: att.id === attempt.id ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                  border: att.id === attempt.id ? '1px solid var(--border-medium)' : '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Attempt #{att.attemptNumber} {att.id === attempt.id ? '(Active)' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(att.createdAt).toLocaleString()} {att.parentAttemptId ? `➔ Derived from Attempt #${att.attemptNumber - 1}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: stateMeta[att.state].bg,
                      color: stateMeta[att.state].text,
                    }}
                  >
                    {stateMeta[att.state].label}
                  </span>

                  {att.evaluation && (
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      Score: {att.evaluation.totalScore} / {att.evaluation.maxTotalScore}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div
        className="practice-workspace-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Problem Specification (in 3-column mode or standard 2-column mode) */}
        {(!hasSideReview || !isAiReviewerOpen || layoutMode === 'three-col') && renderProblemSpec()}

        {/* Workspace Column (Editor / Design Prompts) */}
        <div>
          {/* Tabs for Split Mode */}
          {hasSideReview && isAiReviewerOpen && layoutMode === 'split' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '4px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveLeftTab('solution')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: activeLeftTab === 'solution' ? 'var(--bg-surface)' : 'transparent',
                    color: activeLeftTab === 'solution' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    boxShadow: activeLeftTab === 'solution' ? 'var(--shadow-card)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  ✍️ {isCoding ? 'Code Solution' : 'Submitted Design'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeftTab('spec')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: activeLeftTab === 'spec' ? 'var(--bg-surface)' : 'transparent',
                    color: activeLeftTab === 'spec' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    boxShadow: activeLeftTab === 'spec' ? 'var(--shadow-card)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  📋 Problem Spec
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLayoutMode('three-col')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card)',
                }}
                title="Show Problem Spec, Solution, and AI Reviewer in 3 columns"
              >
                🔀 3 Columns
              </button>
            </div>
          )}

          {hasSideReview && isAiReviewerOpen && layoutMode === 'split' && activeLeftTab === 'spec' ? (
            renderProblemSpec()
          ) : (
            <>
          {/* ============================================================ */}
          {/* CODING PRACTICE WORKSPACE (EDITOR + RUNNER) */}
          {/* ============================================================ */}
          {isCoding ? (
            <div
              style={{
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
                marginBottom: '1.5rem',
              }}
            >
              {/* Code Editor Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                {/* Language Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Language:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('javascript')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: selectedLanguage === 'javascript' ? 'var(--accent-black)' : 'transparent',
                        color: selectedLanguage === 'javascript' ? '#ffffff' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid var(--border-medium)',
                        cursor: 'pointer',
                      }}
                    >
                      JavaScript
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('python')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: selectedLanguage === 'python' ? 'var(--accent-black)' : 'transparent',
                        color: selectedLanguage === 'python' ? '#ffffff' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid var(--border-medium)',
                        cursor: 'pointer',
                      }}
                    >
                      Python 3
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleResetCode}
                    style={{
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                    title="Reset to starter template"
                  >
                    Reset Template
                  </button>
                </div>
              </div>

              {/* Code Area with Line Numbers */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#18181b',
                  color: '#f4f4f5',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.9rem',
                  minHeight: '340px',
                  maxHeight: '520px',
                  overflow: 'auto',
                }}
              >
                {/* Line Numbers */}
                <div
                  style={{
                    padding: '1rem 0.75rem',
                    textAlign: 'right',
                    userSelect: 'none',
                    color: '#71717a',
                    borderRight: '1px solid #27272a',
                    lineHeight: '1.5rem',
                    minWidth: '42px',
                  }}
                >
                  {lineNumbers.map((num) => (
                    <div key={num}>{num}</div>
                  ))}
                </div>

                {/* Textarea Input */}
                <textarea
                  value={currentSourceCode}
                  onChange={(e) => handleSourceCodeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  placeholder={`Write your ${selectedLanguage} implementation here...`}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    backgroundColor: 'transparent',
                    color: '#f4f4f5',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: '1.5rem',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    whiteSpace: 'pre',
                    tabSize: 2,
                  }}
                />
              </div>

              {/* Action Bar: Run Code & Submit */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderTop: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-surface)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Function: <code style={{ fontWeight: 700 }}>{problem.codingConfig?.entryPoint}</code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleRunCode}
                    disabled={isRunningCode || isSubmitting || isEvaluating}
                    className="btn-pill-secondary"
                    style={{
                      padding: '9px 18px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {isRunningCode ? 'Executing Tests...' : 'Run Code ▶'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isRunningCode || isSubmitting || isEvaluating}
                    className="btn-pill-primary"
                    style={{
                      padding: '9px 22px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {isSubmitting
                      ? 'Persisting...'
                      : isEvaluating
                      ? 'AI Evaluating...'
                      : attempt.state === 'COMPLETED'
                      ? `Submit Iteration (Attempt #${attempt.attemptNumber + 1}) ➔`
                      : 'Submit Solution ➔'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* LLD PRACTICE WORKSPACE (EXISTING 7 STRUCTURED QUESTIONS)     */
            /* ============================================================ */
            <div
              style={{
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-card)',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Structured LLD Design Prompts
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const template = SAMPLE_TEMPLATES[problem.slug];
                    if (template) setFormData(template);
                  }}
                  className="btn-pill-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Load Starter Template
                </button>
              </div>

              {/* 7 Prompts */}
              {[
                { key: 'requirementsUnderstanding', label: '1. Requirements Understanding & Scope Definition' },
                { key: 'assumptionsAndConstraints', label: '2. Assumptions, Scale & Constraints' },
                { key: 'classesAndEntities', label: '3. Core Classes, Entities & State Attributes' },
                { key: 'responsibilities', label: '4. Class Responsibilities (Single Responsibility Principle)' },
                { key: 'relationshipsAndInterfaces', label: '5. Relationships, Interfaces & Abstractions' },
                { key: 'patternsAndTradeoffs', label: '6. Design Patterns Applied & Architectural Trade-offs' },
                { key: 'edgeCasesAndReasoning', label: '7. Edge Cases, Concurrency & Testability Strategy' },
              ].map(({ key, label }) => (
                <div key={key} style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {label}
                  </label>
                  <textarea
                    rows={3}
                    value={formData[key as keyof SampleArchitectureTemplate]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-inner)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isEvaluating}
                  className="btn-pill-primary"
                  style={{ padding: '10px 24px', fontSize: '0.925rem' }}
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : isEvaluating
                    ? 'Evaluating...'
                    : attempt.state === 'COMPLETED'
                    ? `Submit Iteration (Attempt #${attempt.attemptNumber + 1}) ➔`
                    : 'Submit LLD Solution ➔'}
                </button>
              </div>
            </div>
          )}

          {/* Error Message Toast / Alert */}
          {errorMessage && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-inner)',
                backgroundColor: 'var(--accent-rose-bg)',
                border: '1px solid var(--accent-rose-border)',
                color: 'var(--accent-rose)',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--accent-rose)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  marginLeft: '1rem',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Deterministic Execution Result Panel (From "Run Code" or "Submit") */}
          {isCoding && executionResult && (
            <div
              style={{
                marginBottom: '1.75rem',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: executionResult.allPassed ? 'var(--accent-emerald-bg)' : '#fff1f2',
                  borderBottom: `1px solid ${executionResult.allPassed ? 'var(--accent-emerald-border)' : 'rgba(225, 29, 72, 0.2)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: executionResult.allPassed ? 'var(--accent-emerald)' : '#be123c',
                    }}
                  >
                    {executionResult.allPassed
                      ? `✓ All ${executionResult.totalTests} Tests Passed (100%)`
                      : `✕ ${executionResult.testsFailed} of ${executionResult.totalTests} Tests Failed`}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    · Execution Time: {executionResult.executionTimeMs} ms
                  </span>
                </div>

                {/* Safe Hidden Tests Badge */}
                {executionResult.hiddenSummary && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'rgba(0,0,0,0.06)',
                      color: 'var(--text-primary)',
                    }}
                    title="Hidden tests are validated server-side without leaking secret inputs"
                  >
                    🔒 Hidden Tests: {executionResult.hiddenSummary.passed}/{executionResult.hiddenSummary.total} Passed
                  </span>
                )}
              </div>

              {/* Test Case Tabs */}
              {executionResult.testCaseResults && executionResult.testCaseResults.length > 0 && (
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {executionResult.testCaseResults.map((tc, idx) => (
                      <button
                        key={tc.testCaseId || tc.id || idx}
                        type="button"
                        onClick={() => setActiveTestIndex(idx)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: activeTestIndex === idx ? 'var(--bg-subtle)' : 'transparent',
                          border: activeTestIndex === idx ? '1px solid var(--border-medium)' : '1px solid var(--border-subtle)',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: tc.status === 'PASSED' ? 'var(--accent-emerald)' : '#be123c',
                        }}
                      >
                        <span>{tc.status === 'PASSED' ? '✓' : '✕'}</span>
                        <span>{tc.isHidden ? `Hidden Test #${idx + 1}` : `Test Case #${idx + 1}`}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Test Case Details */}
                  {executionResult.testCaseResults[activeTestIndex] && (
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-inner)',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                      }}
                    >
                      {executionResult.testCaseResults[activeTestIndex].isHidden ? (
                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          🔒 <strong>Hidden Test Case:</strong> Executed strictly server-side to prevent solution gaming. Input and expected outputs are withheld by security policy.
                          <div style={{ marginTop: '6px', fontStyle: 'normal' }}>
                            Status: <strong>{executionResult.testCaseResults[activeTestIndex].status}</strong>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Input: </span>
                            <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {executionResult.testCaseResults[activeTestIndex].input}
                            </code>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Expected Output: </span>
                            <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {executionResult.testCaseResults[activeTestIndex].expectedOutput}
                            </code>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Actual Output: </span>
                            <code
                              style={{
                                fontFamily: 'monospace',
                                color:
                                  executionResult.testCaseResults[activeTestIndex].status === 'PASSED'
                                    ? 'var(--accent-emerald)'
                                    : '#be123c',
                                fontWeight: 700,
                              }}
                            >
                              {executionResult.testCaseResults[activeTestIndex].actualOutput || 'N/A'}
                            </code>
                          </div>
                          {executionResult.testCaseResults[activeTestIndex].error && (
                            <div style={{ color: '#be123c', marginTop: '4px' }}>
                              <strong>Error:</strong> {executionResult.testCaseResults[activeTestIndex].error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stderr if any */}
                  {executionResult.stderr && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-inner)',
                        backgroundColor: '#fff1f2',
                        border: '1px solid rgba(225, 29, 72, 0.2)',
                        color: '#be123c',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {executionResult.stderr}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Failure Alert */}
          {attempt.state === 'FAILED' && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1.25rem 1.5rem',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--accent-rose-bg)',
                border: '1px solid var(--accent-rose-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--accent-rose)', fontSize: '0.95rem' }}>
                  Evaluation could not be completed.
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {attempt.failureReason || 'The evaluation engine encountered an issue.'} Your submitted solution remains safely preserved.
                </div>
              </div>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--accent-rose)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Retry Evaluation ➔
              </button>
            </div>
          )}
            </>
          )}
        </div>

        {/* Right Column: AI Reviewer Side Panel */}
        {hasSideReview && isAiReviewerOpen && renderAiReviewerSidePanel()}
      </div>
    </div>
  );
}
