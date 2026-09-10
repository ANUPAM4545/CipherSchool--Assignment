# Design Note: CipherSchools LLD Practice Platform Architecture
**Project:** CipherSchools LLD Practice Platform  
**Author:** Lead Software Architect  
**Architecture Style:** Clean Architecture / Domain-Driven Modular Monolith  
**Date:** September 2026  

---

## 1. System Architecture Overview

The CipherSchools LLD Practice Platform is engineered as a **Clean Modular Monolith** adhering to Domain-Driven Design (DDD) principles and the Dependency Inversion Principle (DIP).

### 1.1 Architectural Layering

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Next.js 14)                      │
│   Catalog View  │  Practice Workspace  │  Rubric Cards  │  History View │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ calls
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER (Use Cases)                       │
│  GetProblemsUseCase   │ StartAttemptUseCase   │ SubmitSolutionUseCase   │
│  EvaluateAttemptUseCase │ GetAttemptHistoryUseCase │ RetryAttemptUseCase │
└──────────────────┬─────────────────────────────────────┬────────────────┘
                   │ depends on                          │ depends on
                   ▼                                     ▼
┌────────────────────────────────────┐ ┌──────────────────────────────────┐
│            DOMAIN LAYER            │ │       INFRASTRUCTURE PORTS       │
│  Aggregates: Problem, Attempt      │ │  IProblemRepository              │
│  Entities: Submission, Evaluation  │ │  IAttemptRepository              │
│  Value Objects: CriterionFeedback  │ │  ISubmissionRepository           │
│  FSM: AttemptStateMachine          │ │  IEvaluationRepository           │
│  Abstract: SubmissionPayload       │ │  IEvaluator                      │
│  Exceptions: DomainExceptions      │ │  IDeterministicValidator         │
└────────────────────────────────────┘ └─────────────────▲────────────────┘
                                                         │ implements
                                       ┌─────────────────┴────────────────┐
                                       │     INFRASTRUCTURE ADAPTERS      │
                                       │  SqliteProblemRepository         │
                                       │  SqliteAttemptRepository         │
                                       │  SqliteSubmissionRepository      │
                                       │  SqliteEvaluationRepository      │
                                       │  DeterministicValidator          │
                                       │  GeminiAIEvaluator               │
                                       │  CompositeEvaluator              │
                                       └──────────────────────────────────┘
```

**Architectural Law**: The Domain Layer contains **zero imports** from Next.js, SQLite, or AI SDKs. All external infrastructure enters through Interfaces (Ports & Adapters).

---

## 2. Core Domain Model & Class Responsibilities

### 2.1 Aggregates, Entities & Value Objects

| Class | Category | Primary Responsibilities | Core Invariants Enforced |
| :--- | :--- | :--- | :--- |
| **`Problem`** | Aggregate Root | Represents an LLD problem, specifications, requirements, and rubric dimensions. | Immutable ID & slug; non-empty requirements; default 8 rubric dimensions. |
| **`Attempt`** | Aggregate Root | Coordinates the practice attempt lifecycle, manages state transitions, links submission, and spawns retry attempts. | Valid state transitions only; cannot retry an attempt still in `DRAFT` or `EVALUATING`. |
| **`AttemptStateMachine`** | Domain Engine | Strictly guards state progression (`DRAFT` ➔ `SUBMITTED` ➔ `EVALUATING` ➔ `COMPLETED` / `FAILED`). | Disallows illegal transitions; records timestamped audit history. |
| **`Submission`** | Entity | Encapsulates submitted solution payload, submission timestamp, and SHA-256 content hash. | Validates payload structure; enforces matching attempt ID. |
| **`SubmissionPayload`** | Abstract Base | Contract for polymorphic submission payloads (`toEvaluationContext()`, `validateStructure()`). | Basis for **Change Test A** extensibility. |
| **`StructuredTextPayload`** | Concrete Payload | Holds the 7 structured architectural dimensions; computes word counts and hash. | Minimum section character threshold (≥ 20 chars per section). |
| **`Evaluation`** | Entity | Aggregates overall design evaluation score, summary, and rubric feedback list. | Total score and average score dynamically derived from criteria. |
| **`CriterionFeedback`** | Value Object | Immutable feedback on a specific rubric dimension. | Score bounded between 1 and 10; confidence between 0.0 and 1.0; non-empty verbatim evidence quote. |

---

## 3. Evaluation State Machine

The submission lifecycle is modeled as an explicit, verifiable Finite State Machine (FSM):

```
         ┌──────────────┐
         │    DRAFT     │ ◄── StartAttemptUseCase
         └──────┬───────┘
                │
                ▼ (submit: Persisted to SQLite)
         ┌──────────────┐
         │  SUBMITTED   │ ◄── Durable Persistence Barrier
         └──────┬───────┘
                │
                ▼ (startEvaluation)
         ┌──────────────┐
         │  EVALUATING  │
         └──────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        ▼ (success)     ▼ (timeout / error)
 ┌──────────────┐ ┌──────────────┐
 │  COMPLETED   │ │    FAILED    │
 └──────────────┘ └──────┬───────┘
                         │
                         ▼ (retryEvaluation)
                  ┌──────────────┐
                  │  EVALUATING  │
                  └──────────────┘
```

### State Invariant Rules:
1. **Durable Save Before Evaluation**: The state must become `SUBMITTED` with a successful database transaction *before* the evaluation pipeline begins.
2. **No Terminal Leaks**: An attempt in `COMPLETED` cannot transition to any other state.
3. **Safe Failure Recovery**: An attempt in `FAILED` safely preserves the learner's submission and permits idempotent retry.
4. **Invalid Transitions**: Any attempt to bypass states (e.g. `SUBMITTED` directly to `COMPLETED`) throws `InvalidStateTransitionError`.

---

## 4. Evaluation Strategy: Two-Stage Hybrid Pipeline

```
                    ┌─────────────────────────┐
                    │    Learner Submission   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   CompositeEvaluator    │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  DeterministicValidator │
                    │     (Stage 1: < 50ms)   │
                    └────────────┬────────────┘
                                 │
                    [Passes Structural Checks?]
                       │                     │
                      YES                    NO
                       │                     │
                       ▼                     ▼
        ┌─────────────────────────┐   ┌─────────────────────────┐
        │    GeminiAIEvaluator    │   │  Instant Fast-Fail      │
        │  (Stage 2: 8-Dim Rubric)│   │  (Throws ValidationError│
        └────────────┬────────────┘   │   Zero AI Token Waste)  │
                     │                └─────────────────────────┘
                     ▼
        ┌─────────────────────────┐
        │  Evaluation Aggregation │
        │  (Evidence, Score, Tips)│
        └─────────────────────────┘
```

### Fixed 8-Dimension Evaluation Rubric:
1. **Requirement Understanding**: Scope comprehension and entity mapping.
2. **Class Responsibilities**: Single Responsibility Principle (SRP) adherence.
3. **Coupling & Cohesion**: Component boundaries and dependency isolation.
4. **Encapsulation & Interfaces**: Information hiding and interface contracts.
5. **Abstraction & Pattern Fitness**: Design pattern justification vs. over-engineering.
6. **Extensibility**: Resilience to requirement changes (Open-Closed Principle).
7. **Edge Cases & Testability**: Concurrency race conditions, boundary states, and mockability.
8. **Quality of Explanation**: Articulation of architectural trade-offs.

---

## 5. Extensibility Proofs: Change Tests A & B

### 5.1 Change Test A: Submission Format Extensibility
- **Assignment Question**: *Today: Text submission. Future: Class diagram submission. Can a diagram submission be introduced without rewriting the practice flow?*
- **Solution**: The `Attempt` aggregate and `SubmitSolutionUseCase` depend strictly on the abstract `SubmissionPayload` base class:
  ```typescript
  export abstract class SubmissionPayload {
    abstract readonly format: string;
    abstract toEvaluationContext(): string;
    abstract validateStructure(): ValidationResult;
  }
  ```
- **Automated Verification (`ChangeTestA.test.ts`)**: We implemented `DiagramSubmissionPayload extends SubmissionPayload` (Mermaid class diagram + architecture notes) and proved that it passes through `SubmitSolutionUseCase` and `EvaluateAttemptUseCase` with **zero code changes** to domain entities or use cases.

### 5.2 Change Test B: Evaluator Implementation Extensibility
- **Assignment Question**: *Today: One evaluator. Future: Rule-based evaluator or human reviewer. Can another evaluator be introduced without rewriting the practice flow?*
- **Solution**: The `EvaluateAttemptUseCase` depends strictly on the `IEvaluator` strategy interface:
  ```typescript
  export interface IEvaluator {
    evaluate(submission: ISubmissionPayload, problem: Problem, attemptId: string): Promise<Evaluation>;
  }
  ```
- **Automated Verification (`ChangeTestB.test.ts`)**: We implemented `RuleBasedASTEvaluator` (static keyword/interface analyzer) and `MockHumanReviewerEvaluator` (mentor scoring & notes), proving both execute through the exact same practice flow and produce valid `Evaluation` records.

---

## 6. Persistence Architecture & Invariants

- **Storage Engine**: SQLite with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and Foreign Key enforcement (`PRAGMA foreign_keys = ON`).
- **Decoupling**: All database interactions are encapsulated behind repository interfaces (`IProblemRepository`, `IAttemptRepository`, `ISubmissionRepository`, `IEvaluationRepository`).
- **Data Integrity Guarantee**:
  - `attempts` table stores attempt metadata, state, and `parent_attempt_id` foreign key.
  - `submissions` table stores payload JSON and SHA-256 hash.
  - `evaluations` table stores criteria JSON, score calculations, and timestamp.
  - Evaluation failure never deletes or modifies the submission record.

---

## 7. Retry & Deliberate Practice Progression

When a learner clicks "Iterate & Retry":
1. `parentAttempt.createRetryAttempt(newAttemptId)` is called on the completed or failed attempt.
2. The domain model instantiates a **new `Attempt` entity**:
   - `attemptNumber = parentAttempt.attemptNumber + 1`
   - `parentAttemptId = parentAttempt.id`
   - `state = 'DRAFT'`
3. The previous submission payload is pre-loaded into the canvas.
4. The learner refines the specific concerns cited in the evaluation feedback and re-submits.
5. Attempt History displays the progression timeline, allowing side-by-side score comparison.

---

## 8. Coding Practice Extension Architecture

To expand deliberate engineering practice beyond architecture to algorithmic coding, the platform extends the core domain model:
- **Polymorphic Submission Payload**: Implements `CodeSubmissionPayload` extending `SubmissionPayload`.
- **Authoritative Deterministic Execution**: Implements `ICodeExecutionAdapter` (`JavaScriptExecutionAdapter` and `PythonExecutionAdapter`). Deterministic test assertions, execution time, and exit codes represent the authoritative ground truth for code correctness. AI cannot override failed tests or compilation errors.
- **Cognitive Code Quality Evaluation**: `CodingAIEvaluator` reviews 6 qualitative dimensions (Algorithmic Logic, Time Complexity, Space Complexity, Code Quality, Idiomatic Language, Alternatives). Big-O analysis is explicitly labeled *"AI-Analyzed Complexity"*.
- **Hidden Test Case Security**: `hiddenTestCases` are stripped before sending problem specs to the client, and execution results redact hidden inputs to preserve assessment integrity.

---

## 9. Discriminative Scorer Calibration

To prevent LLM "grade inflation" and score clustering around 7–8/10, the evaluator prompts enforce explicit scoring anchors:
- **1–3 (Inadequate / Missing)**: Omits core entities or fundamental design contracts.
- **4–5 (Rudimentary / Surface-Level)**: Generic high-level templates that list class names without method signatures or state transitions.
- **6–7 (Competent Baseline)**: Covers core functional requirements and reasonable class responsibilities, but lacks concurrency safeguards or interface segregation.
- **8–9 (Production-Grade)**: Explicit method contracts, clean design patterns, comprehensive error handling, and concurrency primitives.
- **10 (Exemplary)**: Flawless, extensible production architecture with complete defensive contracts.

---

## 10. Prototype Maturity & Security Boundaries

This implementation represents an **industry-level, submission-ready prototype** developed for a 2-day engineering assignment:
- **Process Isolation**: Code execution runs in isolated ephemeral working directories with POSIX signal timeouts (`SIGKILL`).
- **Production Boundary**: For public multi-tenant environments, hypervisor-level sandboxes (such as Firecracker microVMs or gVisor container runtimes) are recommended over process-level execution.

