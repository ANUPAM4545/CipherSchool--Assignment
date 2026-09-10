# PRD Verification & Architecture Planning Document
**Project:** CipherSchools Low-Level Design (LLD) Practice Platform  
**Role:** Lead Software Architect & Senior Full-Stack Engineer  
**Status:** Approved & Refined Architecture Specification  

---

## Table of Contents
1. [Assignment Understanding](#1-assignment-understanding)
2. [Functional Requirements (FR)](#2-functional-requirements-fr)
3. [Non-Functional Requirements (NFR)](#3-non-functional-requirements-nfr)
4. [MVP Scope & Seed Problems](#4-mvp-scope--seed-problems)
5. [Explicit Out-of-Scope Features](#5-explicit-out-of-scope-features)
6. [Learner Journey](#6-learner-journey)
7. [Submission Model Decision (Structured Text)](#7-submission-model-decision-structured-text)
8. [Evaluation Model (Rubric & Dimensions)](#8-evaluation-model-rubric--dimensions)
9. [Deterministic vs. AI Responsibilities](#9-deterministic-vs-ai-responsibilities)
10. [Evaluation State Machine](#10-evaluation-state-machine)
11. [Domain Model Proposal (Clean OOP & Invariants)](#11-domain-model-proposal-clean-oop--invariants)
12. [Important Classes, Interfaces & Responsibilities](#12-important-classes-interfaces--responsibilities)
13. [Layering & Dependency Relationships](#13-layering--dependency-relationships)
14. [Extensibility Strategy](#14-extensibility-strategy)
15. [Change Test A Analysis (Submission Abstraction)](#15-change-test-a-analysis-submission-abstraction)
16. [Change Test B Analysis (Evaluator Abstraction)](#16-change-test-b-analysis-evaluator-abstraction)
17. [Failure Handling & Persistence Invariants](#17-failure-handling--persistence-invariants)
18. [Testing Strategy](#18-testing-strategy)
19. [Required Assignment Deliverables](#19-required-assignment-deliverables)
20. [Risks & Trade-offs](#20-risks--trade-offs)
21. [7-Phase Phased Implementation Plan](#21-7-phase-phased-implementation-plan)
22. [Definition of Done (DoD)](#22-definition-of-done-dod)

---

## 1. Assignment Understanding

### 1.1 Context and Problem Statement
In technical software engineering interviews, Low-Level Design (LLD) and Object-Oriented Design (OOD) rounds are critical filters. While platforms like LeetCode and HackerRank have solved practice for Data Structures & Algorithms (DSA) through automated unit testing, **LLD practice remains broken**:
- There is **no single binary "pass/fail" test suite**; multiple valid designs can satisfy the same problem with different trade-offs.
- Learners struggle to obtain structured, actionable feedback on design qualities (separation of concerns, SOLID principles, design pattern fitness, extensibility, and interface design).
- Learners rarely get an iterative practice loop where they can refine an attempt based on grounded feedback.

### 1.2 Core Mission
The platform provides an end-to-end, iterative learning loop for LLD:
```
Choose Problem ──> Start Attempt ──> Read Requirements ──> Fill Structured Solution ──> Submit
       ▲                                                                                   │
       │                                                                                   ▼
       └──────── Retry / Iterate ◄── View History ◄── Review Feedback ◄── EVALUATING ◄── SUBMITTED
```

### 1.3 Architectural Guiding Principles
- **Domain-Driven Design (DDD) & Clean OOP**: The product is an LLD practice platform and must *exemplify* clean LLD principles in its own codebase (classes, interfaces, single responsibility, open-closed principle, explicit state machines, and real domain behaviors rather than database-shaped DTOs).
- **Anti-Overengineering**: No Kubernetes, microservices, Kafka/RabbitMQ clusters, sharded databases, or distributed systems. A clean, structured **modular monolith** with Next.js App Router and SQLite is the chosen architecture.
- **Two-Tiered Evaluation**: Strict separation between deterministic structural checks and cognitive AI evaluation.
- **Evidence-Grounded Feedback**: AI evaluation must never return arbitrary scores; it must cite concrete evidence from the learner's submission across fixed rubric dimensions.
- **Design for Change**:
  - **Change Test A**: Verified via a `SubmissionPayload` abstraction that allows a future `DiagramSubmissionPayload` without altering the practice flow.
  - **Change Test B**: Verified via an `IEvaluator` abstraction that allows future `RuleBasedEvaluator` or `HumanEvaluator` implementations without altering the practice flow.

---

## 2. Functional Requirements (FR)

| ID | Requirement | Description |
| :--- | :--- | :--- |
| **FR-1** | **Problem Catalog** | Browse curated LLD problems with clear requirements, constraints, and rubric dimensions. |
| **FR-2** | **Start Attempt** | Create a new tracked attempt for a selected problem. |
| **FR-3** | **Structured Submission** | Learners submit solutions structured across 7 dimensions: Requirements Understanding, Assumptions/Constraints, Classes/Entities, Responsibilities, Relationships/Interfaces, Patterns & Trade-offs, Edge Cases/Reasoning. |
| **FR-4** | **Pre-Evaluation Persistence** | Submissions and attempts are validated and durably persisted in SQLite in state `SUBMITTED` *before* evaluation begins, ensuring evaluator failure cannot lose learner work. |
| **FR-5** | **Deterministic Pre-Validation** | Validate required fields, structure, minimum meaningful content, valid submission state, duplicate/idempotency handling, and known deterministic rules. |
| **FR-6** | **Cognitive AI Evaluation** | Structured evaluation against an 8-dimension LLD rubric producing criterion, score, evidence, concern, suggestion, and confidence. |
| **FR-7** | **Explicit State Machine** | Guarded transitions: `SUBMITTED` ➔ `EVALUATING` ➔ `COMPLETED` or `FAILED`. Invalid transitions strictly rejected. |
| **FR-8** | **Attempt History & Progression** | Display past attempts for a problem with timestamps, scores, and evaluation breakdowns. |
| **FR-9** | **Retry & Branching** | Retrying creates a *new* attempt (e.g., Attempt #1 ➔ Feedback ➔ Retry ➔ Attempt #2) retaining `parentAttemptId` and pre-filling the previous submission. |

---

## 3. Non-Functional Requirements (NFR)

- **NFR-1: Extensibility (Open-Closed Principle)**  
  New submission formats and evaluators must be pluggable via abstract contracts (`SubmissionPayload`, `IEvaluator`) without modifying practice use cases or orchestrators.
- **NFR-2: Fault Tolerance & Data Safety**  
  Evaluation failures (API rate limits, timeouts, prompt malformations) must transition the attempt to `FAILED` with an explicit failure reason, leaving the learner's submission intact in SQLite.
- **NFR-3: Non-Blocking Submission Lifecycle**  
  Submission returns immediate acknowledgement (`SUBMITTED`) to the client. Evaluation proceeds asynchronously without holding the HTTP request indefinitely.
- **NFR-4: Groundedness & Explainability**  
  Every criterion evaluation must cite verbatim evidence from the submission. No ungrounded, purely numerical scores.
- **NFR-5: Architectural Cleanliness (Clean Architecture)**  
  Clear separation between Domain, Application (Use Cases), Infrastructure, API, and UI. Zero framework coupling in the domain layer.
- **NFR-6: Performance & Latency**  
  Deterministic pre-validation runs in `< 50ms`. Asynchronous evaluation updates the attempt status for reactive UI polling.

---

## 4. MVP Scope & Seed Problems

### 4.1 Seed Problems (5 Curated Problems)
1. **Parking Lot System**: Multiple vehicle types (Car, Bike, Truck), multi-level parking, spot allocation strategy, dynamic hourly/flat pricing strategy, concurrency control on spot allocation.
2. **Vending Machine**: State pattern (Idle, HasMoney, Dispensing, SoldOut), inventory management, coin/cash calculation and change return, cancellation handling.
3. **Elevator System**: Dispatch algorithms (SCAN, LOOK, Nearest Car), multi-car controller, floor requests, direction & state management, load capacity constraints.
4. **Library Management System**: Book search with filters (Strategy), lending policies, fine calculations, reservation queues, member management.
5. **Movie Ticket Booking System**: Show seats, locking mechanism (concurrency/expiry), payment processing, booking state machine, seat selection strategies.

---

## 5. Explicit Out-of-Scope Features

To maintain 2-day delivery focus and prevent over-engineering:
- ❌ Authentication & User management (default learner profile or session UUID).
- ❌ Full LMS features (course tracks, certificates, enrolled cohorts).
- ❌ Real-time code execution / sandbox compiler (LLD is about design & modeling, not compilation).
- ❌ Drag-and-drop UML diagram editor (handled via structured text in MVP; diagram extensibility proven via abstraction).
- ❌ Kubernetes, Microservices, Kafka/RabbitMQ message brokers, distributed caching.
- ❌ Social features, chat, public leaderboards, analytics dashboards.
- ❌ Multiple production AI providers (Gemini API is used for MVP; architecture allows future providers via `IEvaluator`).

---

## 6. Learner Journey

```
1. Choose Problem
   └─ Browse catalog (Parking Lot, Vending Machine, Elevator, etc.)
   └─ Inspect difficulty, problem context, and concepts practiced
2. Start Attempt
   └─ System creates Attempt in DRAFT / initial state
3. Read Requirements & Design
   └─ Review functional requirements, constraints, and 8 rubric dimensions
4. Fill Structured Solution
   └─ Input: Requirements understanding, Assumptions/constraints, Classes/entities,
            Responsibilities, Relationships/interfaces, Patterns & trade-offs, Edge cases
5. Submit Solution
   └─ Step 5a: Deterministic validation runs
   └─ Step 5b: Submission & attempt persisted to SQLite
   └─ Step 5c: Attempt transitions to SUBMITTED
   └─ Step 5d: Response returned to client immediately
6. Asynchronous Evaluation
   └─ Transition to EVALUATING
   └─ GeminiAIEvaluator runs structured rubric evaluation
   └─ Transition to COMPLETED (or FAILED if error occurs)
7. View Structured Feedback
   └─ Overall design summary & score
   └─ 8 Rubric cards: criterion, score, evidence quote, concern, suggestion, confidence
8. View Attempt History
   └─ List past attempts, version numbers, and scores over time
9. Retry & Iterate
   └─ Click "Retry": Creates Attempt #2 with parentAttemptId = Attempt #1 ID
   └─ Pre-fills prior submission text for targeted iterative refinement
```

---

## 7. Submission Model Decision (Structured Text)

### 7.1 Key Question 1: What does a learner need to provide for an LLD attempt to be meaningful?
An LLD attempt must capture the full spectrum of software design thinking, not just code syntax.

### 7.2 Structured Dimensions for MVP
The learner provides:
1. **Requirements Understanding**: Candidate's interpretation of core use cases and scope.
2. **Assumptions & Constraints**: Explicit boundary conditions (e.g., scale, concurrency, in-memory vs. persistent).
3. **Classes & Entities**: Core domain models, fields, enums, and data carriers.
4. **Responsibilities**: Explicit mapping of what each class owns and does (Single Responsibility Principle).
5. **Relationships & Interfaces**: Abstractions, inheritance, composition, and contract definitions.
6. **Patterns & Trade-offs**: Why a specific pattern was chosen over alternatives, and what trade-offs were accepted.
7. **Edge Cases & Reasoning**: Concurrency pitfalls, null states, boundary conditions, and testability.

### 7.3 Extensibility Contract (`SubmissionPayload`)
```typescript
export abstract class SubmissionPayload {
  abstract readonly format: 'STRUCTURED_TEXT' | 'CLASS_DIAGRAM';
  abstract toEvaluationContext(): string;
  abstract validateStructure(): { isValid: boolean; errors: string[] };
}
```
In MVP, `StructuredTextPayload extends SubmissionPayload` is fully implemented.  
`DiagramSubmissionPayload extends SubmissionPayload` is demonstrated through interface contracts and tests for **Change Test A**.

---

## 8. Evaluation Model (Rubric & Dimensions)

### 8.1 Key Question 2: What makes feedback useful when multiple LLD solutions can be valid?
Feedback must **never be dogmatic** or prescribe a single "correct" pattern. It must evaluate whether the chosen design is **internally consistent**, achieves the stated requirements, adheres to object-oriented principles, and articulates sound trade-offs.

### 8.2 Fixed LLD Evaluation Rubric (8 Dimensions)
1. **Requirement Understanding**: Did the design address all core functional requirements without missing critical features?
2. **Class Responsibilities**: Are responsibilities appropriately segregated according to SRP, or are there "God classes"?
3. **Coupling & Cohesion**: Do components exhibit high cohesion and loose coupling?
4. **Encapsulation & Interfaces**: Are state variables protected and are behaviors exposed through clean interface contracts?
5. **Abstraction & Pattern Fitness**: Are design patterns used appropriately, or is there premature over-engineering?
6. **Extensibility**: How easily can the design accommodate prospective requirement changes?
7. **Edge Cases & Testability**: Are race conditions, failure states, and boundary conditions addressed? Is the design unit-testable?
8. **Quality of Explanation**: Did the candidate clearly justify their architectural trade-offs and rationale?

### 8.3 Structured Feedback Item Schema
For every dimension, the evaluator outputs:
- `criterion`: Name of the rubric dimension
- `score`: Numeric score (1-10)
- `evidence`: Verbatim quote or direct reference from the learner's submission
- `concern`: Specific architectural issue or anti-pattern identified
- `suggestion`: Actionable, pedagogical guidance on how to fix or refactor the design
- `confidence`: Confidence score (0.0 - 1.0)

---

## 9. Deterministic vs. AI Responsibilities

| Responsibility Area | Deterministic Validator (Code-Level) | AI Evaluator (Gemini) |
| :--- | :--- | :--- |
| **Input Completeness** | Validates all 7 structured sections are present and non-empty. | Analyzes the depth, clarity, and correctness of each section. |
| **Minimum Substance** | Enforces character/word thresholds to reject trivial or blank inputs. | N/A (bypassed if deterministic checks fail). |
| **Submission State Invariants** | Rejects invalid transitions (e.g. evaluating already completed attempt). | N/A. |
| **Deduplication / Idempotency** | Checks submission hash to prevent duplicate LLM invocations. | N/A. |
| **Design Quality & SOLID** | ❌ Not handled (regex cannot evaluate OOP quality). | Evaluates adherence to SRP, OCP, LSP, ISP, DIP. |
| **Trade-off Reasoning** | ❌ Not handled. | Evaluates whether pattern justifications are sound. |
| **Evidence Extraction** | ❌ Not handled. | Identifies exact submission excerpts to ground critiques. |

---

## 10. Evaluation State Machine

```
         ┌──────────────┐
         │  (Creation)  │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  SUBMITTED   │ ◄── (Durable SQLite Commit)
         └──────┬───────┘
                │
                ▼ (Start Evaluation)
         ┌──────────────┐
         │  EVALUATING  │
         └──────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        ▼ (Success)     ▼ (Failure / Timeout)
 ┌──────────────┐ ┌──────────────┐
 │  COMPLETED   │ │    FAILED    │
 └──────────────┘ └──────┬───────┘
                         │
                         ▼ (Retry Evaluation)
                  ┌──────────────┐
                  │  EVALUATING  │
                  └──────────────┘
```

### Invariants:
- An attempt cannot transition from `SUBMITTED` directly to `COMPLETED`.
- An attempt in `COMPLETED` is terminal and immutable.
- An attempt in `FAILED` can re-enter `EVALUATING` via idempotent retry.
- Any attempt transition violating the state machine throws an explicit domain `InvalidStateTransitionException`.

---

## 11. Domain Model Proposal (Clean OOP & Invariants)

### 11.1 Aggregates and Entities
- **`Problem` (Aggregate Root)**: Represents an LLD problem with requirements, constraints, and rubric dimensions.
- **`Attempt` (Aggregate Root)**: Tracks a learner's attempt lifecycle, state transitions, versioning (`attemptNumber`, `parentAttemptId`), and holds the submission and evaluation result.
- **`Submission` (Entity)**: Contains the submitted payload (`SubmissionPayload`), submission timestamp, and idempotency hash.
- **`Evaluation` (Entity)**: Aggregates overall score, summary, and a list of `CriterionFeedback` value objects.
- **`CriterionFeedback` (Value Object)**: Immutable representation of feedback for a single rubric dimension.

---

## 12. Important Classes, Interfaces & Responsibilities

```typescript
// --- Domain Contracts ---
export interface ISubmissionPayload {
  readonly format: string;
  toEvaluationContext(): string;
  validateStructure(): { isValid: boolean; errors: string[] };
}

export interface IEvaluator {
  readonly id: string;
  readonly name: string;
  evaluate(submission: ISubmissionPayload, problem: Problem): Promise<Evaluation>;
}

// --- Repositories (Decoupled from SQLite) ---
export interface IProblemRepository {
  findById(id: string): Promise<Problem | null>;
  findBySlug(slug: string): Promise<Problem | null>;
  findAll(): Promise<Problem[]>;
}

export interface IAttemptRepository {
  save(attempt: Attempt): Promise<void>;
  findById(id: string): Promise<Attempt | null>;
  findByProblemAndLearner(problemId: string, learnerId: string): Promise<Attempt[]>;
}

export interface ISubmissionRepository {
  save(submission: Submission): Promise<void>;
  findById(id: string): Promise<Submission | null>;
}

export interface IEvaluationRepository {
  save(evaluation: Evaluation): Promise<void>;
  findByAttemptId(attemptId: string): Promise<Evaluation | null>;
}
```

---

## 13. Layering & Dependency Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│    (Next.js App Router: Catalog, Workspace, History, UI)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                       │
│  - GetProblemsUseCase          - SubmitSolutionUseCase      │
│  - GetProblemUseCase           - EvaluateAttemptUseCase     │
│  - StartAttemptUseCase         - GetAttemptHistoryUseCase   │
│  - RetryAttemptUseCase                                      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│         DOMAIN LAYER         │ │   INFRASTRUCTURE PORTS     │
│  - Entities & Aggregates     │ │  - IProblemRepository      │
│  - Value Objects & Invariants│ │  - IAttemptRepository      │
│  - SubmissionPayload         │ │  - ISubmissionRepository   │
│  - AttemptStateMachine       │ │  - IEvaluationRepository   │
│                              │ │  - IEvaluator              │
└──────────────────────────────┘ └─────────────▲──────────────┘
                                               │ implements
                                 ┌─────────────┴──────────────┐
                                 │  INFRASTRUCTURE ADAPTERS   │
                                 │  - SQLite Repositories     │
                                 │  - GeminiAIEvaluator       │
                                 │  - DeterministicValidator  │
                                 │  - CompositeEvaluator      │
                                 └────────────────────────────┘
```

**Clean Architecture Rule**: The Domain Layer has **zero dependencies** on SQLite, Next.js, or external AI SDKs.

---

## 14. Extensibility Strategy

- **Strategy Pattern (`IEvaluator`)**: Decouples evaluation engines from execution use cases.
- **Abstract Base Payload (`SubmissionPayload`)**: Decouples submission processing from text representation.
- **Factory Method**: Resolves appropriate evaluators dynamically based on configuration.
- **Composite Pattern (`CompositeEvaluator`)**: Combines deterministic validation and AI evaluation cleanly in a single pipeline.

---

## 15. Change Test A Analysis (Submission Extensibility)

> **Goal**: Today: Structured Text Submission. Future: Class Diagram Submission. Practice flow must not change.

### Verification Design:
1. `Attempt` and `SubmitSolutionUseCase` depend strictly on the abstract `SubmissionPayload`.
2. Today: `StructuredTextPayload extends SubmissionPayload`.
3. Future: `DiagramSubmissionPayload extends SubmissionPayload` (e.g. Mermaid/PlantUML source).
4. Automated Test `ChangeTestA.test.ts` proves that `SubmitSolutionUseCase` and `EvaluateAttemptUseCase` execute seamlessly with a diagram payload without modifying domain or application logic.

---

## 16. Change Test B Analysis (Evaluator Extensibility)

> **Goal**: Today: AI Evaluator. Future: Rule-based or Human Evaluator. Practice flow must not change.

### Verification Design:
1. `EvaluateAttemptUseCase` depends strictly on `IEvaluator`.
2. Today: `CompositeEvaluator(DeterministicValidator, GeminiAIEvaluator)` implements `IEvaluator`.
3. Future: `RuleBasedEvaluator` or `HumanEvaluator` implements `IEvaluator`.
4. Automated Test `ChangeTestB.test.ts` introduces a `MockRuleBasedEvaluator` and a `MockHumanEvaluator` and verifies they produce valid `Evaluation` records through the exact same practice flow.

---

## 17. Failure Handling & Persistence Invariants

1. **Durable Save First**:
   ```
   1. Validate payload structure (Deterministic)
   2. Save Attempt & Submission to SQLite (State: SUBMITTED)
   3. Acknowledge HTTP request (Return attempt ID immediately)
   4. Trigger asynchronous evaluation
   ```
2. **Evaluator Timeout / API Failure**:
   - If the AI call fails or times out: Attempt state transitions to `FAILED` with `failureReason`.
   - The learner's submission is 100% safe in SQLite.
   - The UI displays the error and enables a one-click "Retry Evaluation" button (`POST /api/attempts/:id/retry-eval`).

---

## 18. Testing Strategy

```
Tests Suite:
├── Domain & Invariants Tests:
│   ├── AttemptStateMachine.test.ts   (All valid & invalid state transitions)
│   ├── StructuredTextPayload.test.ts (Validation rules & context extraction)
│   └── Attempt.test.ts               (Creation, retry linking, versioning)
├── Evaluator Tests:
│   ├── DeterministicValidator.test.ts(Field completeness & minimum substance)
│   ├── GeminiAIEvaluator.test.ts     (Rubric prompt formatting & JSON response parsing)
│   └── CompositeEvaluator.test.ts    (Fast-fail on deterministic error, fallback on AI error)
├── Application Use Case Tests:
│   ├── SubmitSolutionUseCase.test.ts (Persistence before eval, idempotency)
│   ├── RetryAttemptUseCase.test.ts   (Attempt #1 -> Attempt #2 lineage)
│   └── GetAttemptHistoryUseCase.test.ts
└── Extensibility Proofs:
    ├── ChangeTestA.test.ts           (Diagram payload compatibility)
    └── ChangeTestB.test.ts           (New evaluator implementation compatibility)
```

---

## 19. Required Assignment Deliverables

1. `README.md`: Architecture overview, setup steps, how to run tests, and verification walkthrough.
2. `RESEARCH_NOTE.md`: Analysis of LLD learning challenges, existing tools, rubric-based evaluation research, and architectural directions.
3. `DESIGN_NOTE.md`: Comprehensive system architecture, C4 diagrams, domain models, state machine, Change Tests A & B proofs, trade-offs, and failure handling.
4. `AI_USAGE.md`: Transparent log of 3–5 meaningful AI-assisted decisions (what AI suggested, what was accepted, what was rejected, why).
5. Working Prototype: Next.js modular monolith with clean domain separation, SQLite persistence, and polished UI.
6. Automated Test Suite: Complete Vitest suite passing.

---

## 20. Risks & Trade-offs

| Risk | Trade-off / Mitigation |
| :--- | :--- |
| **LLM Output Inconsistency** | Mitigation: Strict JSON schema prompting, low temperature (0.1), explicit rubric dimensions, and mandatory verbatim evidence extraction. |
| **Evaluation Latency** | Mitigation: Instant deterministic pre-validation (< 50ms). Non-blocking submission with reactive polling in the UI. |
| **Persistence Complexity** | Decision: SQLite via lightweight database driver (`better-sqlite3` or `@libsql/client`). No heavy ORM complexity; simple repository pattern. |

---

## 21. 7-Phase Phased Implementation Plan

- **Phase 1: Project Setup + Domain Model + State Machine + Domain Tests**  
  Initialize Next.js + TypeScript + Vitest. Build core entities (`Problem`, `Attempt`, `Submission`, `Evaluation`, `CriterionFeedback`), payload abstraction, and strict state machine with comprehensive unit tests.
- **Phase 2: Repositories + SQLite Persistence + Submission Model**  
  Implement repository interfaces, SQLite tables/migrations, and persistence adapters. Test persistence invariants.
- **Phase 3: Deterministic Validation + Evaluator Abstraction + Gemini Evaluator**  
  Implement `DeterministicValidator`, `GeminiAIEvaluator` with JSON schema enforcement, and `CompositeEvaluator`. Test failure handling and parsing.
- **Phase 4: Application Use Cases + API Route Handlers**  
  Implement use cases (`GetProblems`, `GetProblem`, `StartAttempt`, `SubmitSolution`, `EvaluateAttempt`, `GetAttemptHistory`, `RetryAttempt`) and Next.js route handlers.
- **Phase 5: Problem Catalog + Practice Workspace + Submission Flow**  
  Build UI screens for Problem Catalog and Split-Screen Practice Workspace with structured 7-dimension inputs.
- **Phase 6: Evaluation Feedback + Attempt History + Retry**  
  Build Rubric Feedback view, live evaluation status tracker, Attempt History timeline, and "Retry / Iterate" action.
- **Phase 7: Integration Testing + Documentation + Final Verification**  
  Run full test suite (including Change Tests A & B). Author `RESEARCH_NOTE.md`, `DESIGN_NOTE.md`, `AI_USAGE.md`, and `README.md`. Final end-to-end verification.

---

## 22. Definition of Done (DoD)

The MVP is complete only when the following end-to-end journey works:
```
Choose Problem ➔ Start Attempt ➔ Read Requirements ➔ Fill Structured Solution ➔ Submit ➔ SUBMITTED ➔ EVALUATING ➔ COMPLETED / FAILED ➔ View Structured Feedback ➔ View Attempt History ➔ Retry ➔ Create New Attempt
```
- Automated tests pass covering all critical behaviors.
- Change Tests A and B are proven through automated tests.
- All 4 documentation deliverables (`README.md`, `RESEARCH_NOTE.md`, `DESIGN_NOTE.md`, `AI_USAGE.md`) are complete.
