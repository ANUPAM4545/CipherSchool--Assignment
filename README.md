# CipherSchools Low-Level Design (LLD) Practice Platform

An interactive, domain-driven Low-Level System Design (LLD) practice platform built as a **Modular Monolith** adhering to Clean Architecture and Domain-Driven Design (DDD). The platform is an **industry-level, submission-ready prototype** engineered to guide software engineers through deliberate practice of object-oriented architecture, class responsibilities, design patterns, and trade-offs through real cognitive feedback grounded in candidate submissions.

---

## Problem

In technical recruitment and engineering progression, Low-Level Design (LLD) and Object-Oriented Design (OOD) interviews assess whether an engineer can translate ambiguous requirements into clean, extensible, and maintainable software. However, while algorithmic practice has been industrialized by platforms like LeetCode and HackerRank, **LLD practice remains broken**:

1. **No Binary Oracle**: LLD problems do not have a single binary pass/fail answer. Multiple valid designs exist, each making different trade-offs.
2. **Unstructured Essay Trap**: When learners write open-ended essays, they routinely omit class boundaries, interface definitions, and edge cases.
3. **Black-Box AI Scoring**: Standard LLM chats output arbitrary numbers (e.g. "8/10") with generic praise rather than actionable critique grounded in actual design choices.
4. **Lack of Iterative Progression**: Learning happens during revision, but existing tools lack first-class attempt lineage and retry workflows.

---

## Solution

The platform provides a deliberate engineering practice loop structured as an explicit Finite State Machine:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Choose Problem  │ ────> │ Think & Design  │ ────> │ Submit Solution │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
         ▲                                                   │ (Durable Persistence)
         │                                                   ▼
┌────────┴────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Iterate/Retry  │ <──── │ Review Feedback │ <──── │   EVALUATING    │
│  (Attempt N+1)  │       │ (Side Reviewer) │       │ (Stage 1 & 2)   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Choose Problem**: Select from curated system design challenges (Vending Machine, Parking Lot, Elevator System, Library Management, Movie Ticket Booking) or coding practice problems.
2. **Think & Design**: Study functional requirements, constraints, and fixed rubric criteria.
3. **Structured Submission**: Draft architectural solutions across a 7-dimension canvas (Requirements, Assumptions, Entities, Responsibilities, Interfaces, Patterns & Trade-offs, Edge Cases).
4. **Durable Persistence Barrier**: Submissions are validated and stored in SQLite in state `SUBMITTED` *before* evaluation commences, preventing data loss on network or timeout errors.
5. **Two-Stage Hybrid Evaluation**:
   - **Stage 1 (Deterministic Validation)**: Sub-50ms structural checks verify non-empty invariants and character thresholds.
   - **Stage 2 (Real Gemini AI Evaluation)**: The cognitive engine analyzes the actual submission against the 8-dimension rubric and problem spec.
6. **Review Feedback**: An interactive side-panel inspector presents total score, executive summary, and 8 criteria cards citing verbatim quotes from the learner's submission.
7. **Iterate & Retry**: Spawns Attempt #2 linked via `parentAttemptId` to Attempt #1, pre-filling prior text for targeted refinement.

---

## Key Features

- **7-Dimension Architectural Canvas**: Decomposes system design into standard FAANG-style interview sections.
- **Real Gemini AI Evaluation**: Zero mock or fake evaluation data in production. Every score and critique is generated dynamically by Google Gemini (`gemini-3.1-flash-lite`).
- **Discriminative Scorer Calibration**: Explicit scoring anchors (1–3 Inadequate, 4–5 Rudimentary, 6–7 Competent, 8–9 Production-Grade, 10 Exemplary) prevent LLM score clustering and grade inflation.
- **Evidence-Grounded Critique**: Every rubric item includes verbatim submission quotes, architectural concerns, and actionable recommendations.
- **Side-by-Side Review Inspector**: Sticky review panel with 1-click filter chips (`Needs Work`, `Competent`, `Exemplary`), micro score gauges, 1-click suggestion copy, and card expand/collapse.
- **Durable Attempt Lineage**: Chronological audit trail of attempts with parent-child relationships.
- **Coding Practice Extension**: Supports code execution practice (JavaScript & Python) with deterministic sandbox execution as the authoritative correctness oracle and AI-assisted Big-O complexity analysis.

---

## Architecture

The system is organized as a **Clean Modular Monolith** where dependencies flow inward toward the pure domain layer:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER (Next.js 14)                     │
│    Problem Catalog  │  Practice Workspace  │  Side Reviewer Inspector   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ invokes
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (Use Cases)                      │
│   GetProblemsUseCase    │ StartAttemptUseCase   │ SubmitSolutionUseCase │
│   EvaluateAttemptUseCase│ GetAttemptHistoryUseCase │ RetryAttemptUseCase│
│   ExecuteCodeUseCase                                                    │
└──────────────────┬─────────────────────────────────────┬────────────────┘
                   │ depends on                          │ depends on
                   ▼                                     ▼
┌────────────────────────────────────┐ ┌──────────────────────────────────┐
│            DOMAIN LAYER            │ │       INFRASTRUCTURE PORTS       │
│  Aggregates: Problem, Attempt      │ │  IProblemRepository              │
│  Entities: Submission, Evaluation  │ │  IAttemptRepository              │
│  Value Objects: CriterionFeedback  │ │  ISubmissionRepository           │
│  State Machine: AttemptStateMachine│ │  IEvaluationRepository           │
│  Payloads: StructuredTextPayload,  │ │  IEvaluator                      │
│            CodeSubmissionPayload   │ │  IDeterministicValidator         │
│  Contracts: ExecutionResult        │ │  ICodeExecutionAdapter           │
└────────────────────────────────────┘ └─────────────────▲────────────────┘
                                                         │ implements
                                       ┌─────────────────┴────────────────┐
                                       │     INFRASTRUCTURE ADAPTERS      │
                                       │  SqliteProblemRepository         │
                                       │  SqliteAttemptRepository         │
                                       │  SqliteSubmissionRepository      │
                                       │  SqliteEvaluationRepository      │
                                       │  DeterministicValidator          │
                                       │  GeminiAIEvaluator (LLD)         │
                                       │  CodingAIEvaluator (Code Review) │
                                       │  CompositeEvaluator              │
                                       │  JavaScriptExecutionAdapter      │
                                       │  PythonExecutionAdapter          │
                                       └──────────────────────────────────┘
```

**Domain Invariant**: The domain layer contains **zero external imports** from Next.js, SQLite, or AI SDKs. All external infrastructure is decoupled behind domain repository interfaces and ports.

---

## Evaluation Pipeline

The platform strictly separates **objective validation** from **subjective cognitive reasoning**:

| Evaluation Stage | Component | Latency | Responsibility | Failure Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1: Deterministic** | `DeterministicValidator` | < 50ms | Character minimums, non-empty invariants, state guards. | Fast-fails attempt with descriptive client error. |
| **Stage 2: Cognitive AI** | `GeminiAIEvaluator` | 2–5s | 8 rubric dimensions (SRP, Coupling/Cohesion, Patterns, Extensibility, etc.). | Preserves submission, transitions state to `FAILED`, never returns fake mock data. |
| **Coding Correctness** | Sandboxed Execution Runner | 50–200ms | Authoritative truth: test assertions, runtime limits, exit codes. | AI cannot override test failures or runtime errors. |
| **Coding Quality** | `CodingAIEvaluator` | 2–4s | Big-O time/space analysis, idiomatic usage, optimization suggestions. | Labeled *"AI-Analyzed Complexity"*. Degrades gracefully if AI is unavailable. |

---

## Tech Stack

Directly verified from `package.json`:

- **Runtime & Framework**: [Next.js](https://nextjs.org/) `^14.2.24` (App Router, Server Components & Route Handlers)
- **Language**: [TypeScript](https://www.typescriptlang.org/) `^5.7.3` (Strict Mode)
- **UI Library**: [React](https://react.dev/) `^18.3.1`
- **Database Engine**: [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) `^11.8.1` (WAL mode enabled)
- **Testing Engine**: [Vitest](https://vitest.dev/) `^2.1.8`
- **Cognitive AI Provider**: Google Gemini API via native fetch (`gemini-3.1-flash-lite`)

---

## Project Structure

```
cipherschool/
├── README.md                          # Main project documentation
├── RESEARCH_NOTE.md                   # LLD evaluation research and market gap analysis
├── DESIGN_NOTE.md                     # System design, class models, and state machine specs
├── AI_USAGE.md                        # Log of 5 critical AI-assisted architectural decisions
├── SECURITY.md                        # Security policy and execution boundary disclosures
├── LICENSE                            # MIT License
├── package.json                       # Dependencies and npm scripts
├── tsconfig.json                      # TypeScript configuration
├── vitest.config.ts                   # Vitest configuration
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI workflow (typecheck, test, build)
├── src/
│   ├── domain/                        # PURE DOMAIN LAYER (Zero external dependencies)
│   │   ├── entities/                  # Problem, Attempt, Submission, Evaluation, CriterionFeedback
│   │   ├── state-machine/             # AttemptStateMachine (Strict guarded lifecycle transitions)
│   │   ├── payloads/                  # StructuredTextPayload (7 dimensions), CodeSubmissionPayload
│   │   ├── contracts/                 # ISubmissionPayload, IEvaluator, ICodeExecutionAdapter
│   │   ├── repositories/              # IProblemRepository, IAttemptRepository, etc.
│   │   └── exceptions/                # DomainExceptions (InvalidStateTransition, ValidationError)
│   ├── application/                   # APPLICATION LAYER (Use Cases)
│   │   └── use-cases/                 # StartAttempt, SubmitSolution, EvaluateAttempt, RetryAttempt, etc.
│   ├── infrastructure/                # INFRASTRUCTURE ADAPTERS (Ports & Adapters)
│   │   ├── db/                        # SQLite connection, schema migrations, problem seeds
│   │   ├── repositories/              # SqliteProblemRepository, SqliteAttemptRepository, etc.
│   │   ├── evaluators/                # DeterministicValidator, GeminiAIEvaluator, CodingAIEvaluator
│   │   ├── execution/                 # JavaScriptExecutionAdapter, PythonExecutionAdapter
│   │   └── di/                        # Dependency Injection container (getAppContainer)
│   ├── components/                    # UI COMPONENTS
│   │   ├── PracticeWorkspace.tsx      # Split-screen workspace, canvas, and sticky side inspector
│   │   └── sampleTemplates.ts         # Pre-filled architectures for immediate interactive testing
│   └── app/                           # NEXT.JS APP ROUTER
│       ├── page.tsx                   # Problem catalog landing view
│       ├── globals.css                # Design system tokens and styling
│       ├── problems/[slug]/           # Dynamic problem practice workspace
│       └── api/                       # REST API route handlers
└── tests/                             # AUTOMATED TEST SUITE (14 test files, 82 tests)
    ├── domain/                        # Attempt, AttemptStateMachine, Payloads
    ├── application/                   # Use Cases (Start, Submit, Evaluate, Retry, Coding)
    ├── infrastructure/                # Repositories, Evaluators, Code Execution Sandbox, Failures
    └── extensibility/                 # ChangeTestA (Diagrams), ChangeTestB (Rule-based Evaluator)
```

---

## Getting Started

### Prerequisites
- **Node.js**: v20.x LTS (recommended) or v18.x+
- **npm**: v9.x or v10.x+
- **Python**: 3.9+ (optional, only required if executing Python solutions locally)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/ANUPAM4545/CipherSchool--Assignment.git
cd CipherSchool--Assignment
npm ci
```

---

## Environment Variables

Copy the example environment configuration:
```bash
cp .env.example .env.local
```

Configure your `.env.local` file:
```env
# Gemini AI Evaluator API Key (Server-Side Only - Never prefix with NEXT_PUBLIC_)
GEMINI_API_KEY=your_gemini_api_key_here

# Model used for cognitive evaluation
GEMINI_MODEL=gemini-3.1-flash-lite

# Node Environment
NODE_ENV=development
```

> **Security Note**: Never commit `.env.local` or expose your `GEMINI_API_KEY`. The platform strictly reads keys on the server side.

---

## Running the Application

### Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Run
```bash
npm run build
npm start
```

---

## Testing

The repository contains an automated test suite covering domain entities, state machines, repositories, evaluators, failure handling, and extensibility proofs:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript typecheck
npm run typecheck
```

**Test Suite Verification Results**:
- **Test Files**: 14 passed (14)
- **Total Tests**: 82 passed (82)
- **Coverage Areas**:
  - `AttemptStateMachine` (Guarded transitions, invalid transition rejections, audit timestamps)
  - `StructuredTextPayload` & `CodeSubmissionPayload` (Validation invariants, hashing)
  - `SqliteRepositories` (ACID transactions, relational persistence, schema integrity)
  - `GeminiAIEvaluator` & `CodingAIEvaluator` (Prompt formatting, JSON schema validation, error handling)
  - `FailureHandling` (Graceful degradation, AI timeout recovery, zero mock policy)
  - `CodeExecutionService` (Timeouts, infinite loop termination, assertion evaluation)
  - `ChangeTestA` (Extensibility: adding ClassDiagramPayload without core use-case changes)
  - `ChangeTestB` (Extensibility: adding RuleBasedEvaluator and HumanEvaluator)

---

## AI Usage

The development of this platform utilized AI tools under strict architectural oversight. All AI recommendations were subjected to critical senior-engineering evaluation. Key decisions are documented in [`AI_USAGE.md`](./AI_USAGE.md), including:

1. **Monolithic Architecture vs. Microservices**: Rejected distributed microservice proposals in favor of a clean modular monolith to avoid operational overhead.
2. **Submission Structure**: Rejected single unconstrained textareas in favor of a 7-dimension structured canvas mirroring FAANG interviews.
3. **Deterministic vs. AI Separation**: Rejected sending raw inputs to AI for basic validation; implemented sub-50ms deterministic pre-checks before cognitive evaluation.
4. **Evidence-Grounded Feedback**: Rejected arbitrary scalar scores in favor of a mandatory evidence-citation rubric.
5. **Attempt Lineage**: Rejected mutating attempts in-place; modeled attempts as immutable records linked via parent-child lineage.

---

## Design Decisions & Trade-offs

1. **Modular Monolith over Microservices**: Selected Next.js App Router with domain separation. Keeps development lightweight, eliminates distributed network latency, and adheres to the assignment scope.
2. **SQLite with WAL Mode**: Embedded SQLite (`better-sqlite3`) eliminates external database dependencies while providing full ACID transactions and high read concurrency via Write-Ahead Logging (WAL).
3. **Pre-Evaluation Persistence Barrier**: Persisting submissions in SQLite before invoking the Gemini API guarantees zero data loss if an external API timeout or rate-limit error occurs.
4. **Authoritative Deterministic Execution for Code**: When evaluating coding submissions, deterministic unit test results are authoritative. The AI is restricted to qualitative review and cannot override test outcomes.
5. **Zero Mock Policy**: Evaluation results shown to users are strictly generated from real Gemini API requests grounded in candidate submissions.

---

## Limitations

As an **industry-level, submission-ready prototype** developed for a 2-day assignment, the system has the following deliberate limitations:

1. **Single-Node Persistence**: SQLite WAL mode supports high concurrency on a single server, but is not designed for multi-region active-active clusters.
2. **Code Execution Isolation**: Code execution uses ephemeral temporary directories and process timeouts (`SIGKILL`). While suitable for prototype practice, multi-tenant public environments should utilize microVM isolation (such as Firecracker or gVisor).
3. **Language Scope**: Currently supports JavaScript (Node.js) and Python for coding practice. Additional languages can be added by implementing `ICodeExecutionAdapter`.
4. **Synchronous LLM Request Window**: Evaluations wait synchronously on the server route handler (up to 45s). For massive enterprise scale, background worker queues (e.g. BullMQ) would be preferred.

---

## Future Improvements

- **Visual Architecture Diagrams**: Extend `SubmissionPayload` to support interactive UML and C4 diagram canvases (proven via `ChangeTestA`).
- **Human-in-the-Loop Mentorship**: Enable senior engineers to review and override AI rubric scores (proven via `ChangeTestB`).
- **Community Solution Comparisons**: Allow learners to compare architectural trade-offs with community solutions after completing an attempt.
