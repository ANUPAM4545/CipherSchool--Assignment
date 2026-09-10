# AI Usage Log: Architectural Decisions & Review
**Project:** CipherSchools Low-Level Design (LLD) Practice Platform  
**Author:** Lead Software Architect & Senior Full-Stack Engineer  
**Date:** September 2026  

This document transparently records 5 critical architectural decisions made during the design and development of the platform, detailing what AI suggested, what was accepted, what was rejected, and the rationale behind each choice.

---

## Decision 1: Monolithic Architecture vs. Distributed Microservices

### What AI Suggested:
Initially, AI architectural suggestions proposed a distributed event-driven microservices setup:
- A separate `Practice Service`, `Submission Service`, and `Evaluation Service`.
- An asynchronous message queue (e.g., Apache Kafka or RabbitMQ) between submission ingestion and evaluation workers.
- A distributed Redis cache for tracking evaluation states.

### What Was Accepted:
- The concept of an **asynchronous evaluation pipeline** where submission persistence is decoupled from evaluation execution, so evaluation delays do not block user requests.

### What Was Rejected:
- All distributed microservices, Docker compose setups, Redis clusters, and external message brokers.

### Why the Decision Was Made:
The assignment explicitly states:  
> *"The product must remain an LLD/domain-design exercise. DO NOT over-engineer the system with: Kubernetes, Microservices, Multi-region architecture, Sharding, CDN architecture, Complex distributed systems. A simple monolith is acceptable."*  

Introducing distributed microservices for a 2-day prototype would introduce operational overhead, deployment friction, and distributed debugging failure points without improving the core domain model. A **Clean Modular Monolith** in Next.js with in-process asynchronous pipelines achieves identical decoupling and reliability with zero external infrastructure bloat.

---

## Decision 2: Submission Model Structure (Free Text vs. Tri-Part Canvas)

### What AI Suggested:
AI suggested using a single Markdown textarea or a rich-text WYSIWYG editor allowing candidates to freely type whatever they wanted.

### What Was Accepted:
- The idea of using structured markdown under the hood for clean LLM prompt context rendering.

### What Was Rejected:
- The unstructured single-box submission model.

### Why the Decision Was Made:
Free-form text boxes encourage ambiguous, fragmented responses where candidates routinely forget to define class responsibilities, interfaces, or concurrency edge cases.  
Instead, we implemented a **7-Dimension Structured Submission Model** (`StructuredTextPayload`):
1. Requirements Understanding
2. Assumptions & Constraints
3. Classes & Entities
4. Class Responsibilities (SRP)
5. Relationships & Interfaces
6. Design Patterns & Architectural Trade-offs
7. Edge Cases & Concurrency / Testability

This structure mirrors real-world FAANG/tier-1 technical interviews, enables deterministic pre-validation checks (< 50ms), and maps directly to standardized evaluation criteria.

---

## Decision 3: Deterministic Pre-Validation vs. Pure AI Evaluation

### What AI Suggested:
AI suggested sending all user submissions directly to the Gemini API and asking the LLM to simultaneously check completeness, validate schema, and perform quality critique.

### What Was Accepted:
- Leveraging Gemini 1.5 for cognitive, nuanced architectural critique (SOLID analysis, trade-off depth, pattern fitness).

### What Was Rejected:
- Relying on the LLM for basic structural checks (required fields, character thresholds, invalid state transitions).

### Why the Decision Was Made:
1. **Cost & Latency**: Running an LLM on an empty or 5-word submission wastes API tokens and introduces unnecessary 2-5 second delays.
2. **Determinism**: Code-level deterministic checks run in `< 2ms`, guarantee 100% reproducible validation, and immediately fast-fail bad inputs with precise error messages before entering the evaluation pipeline.
3. **Separation of Concerns**: We built `CompositeEvaluator` which runs `DeterministicValidator` at Stage 1, and only delegates to `GeminiAIEvaluator` at Stage 2 if structural invariants are satisfied.

---

## Decision 4: Grounded Rubric Feedback vs. Single Numerical Score

### What AI Suggested:
AI suggested returning an overall score from 1 to 100 with general suggestions (e.g., *"Overall Score: 85/100. Good design, but consider adding more interfaces and improving exception handling."*).

### What Was Accepted:
- Generating an overall aggregated score and executive architectural summary.

### What Was Rejected:
- Unstructured, ungrounded scoring without citations.

### Why the Decision Was Made:
Arbitrary numbers (e.g., "85/100") lack explainability. When multiple valid LLD designs exist, an arbitrary score frustrates learners.  
We enforced a **Fixed 8-Dimension Rubric Schema**:
$$\text{Criterion} \longrightarrow \text{Score} \longrightarrow \text{Evidence Quote} \longrightarrow \text{Concern} \longrightarrow \text{Suggestion} \longrightarrow \text{Confidence}$$

Every critique **must cite verbatim evidence** from the candidate's submission. If the evaluator flags a concern regarding class bloat, it must quote the specific class responsibility described by the candidate, ensuring full transparency and trust.

---

## Decision 5: Attempt Lineage & Retry Flow (In-Place Mutation vs. New Aggregate)

### What AI Suggested:
AI suggested adding an `isRetry` boolean flag to the existing `Attempt` record and overwriting the previous submission text in place when the user clicks "Retry".

### What Was Accepted:
- Pre-filling the user's previous submission text into the canvas when they choose to iterate on their design.

### What Was Rejected:
- Overwriting or mutating the previous `Attempt` record.

### Why the Decision Was Made:
In-place mutation destroys historical data and prevents the learner from comparing their design progression over time.  
We implemented the domain method `parentAttempt.createRetryAttempt(newAttemptId)`:
- Instantiates a brand new `Attempt` entity (`attemptNumber = parent.attemptNumber + 1`).
- Records `parentAttemptId` to preserve the explicit DAG lineage (`Attempt #1 ➔ Attempt #2`).
- Maintains an immutable historical record of both attempts in SQLite, enabling the UI to render a full timeline showing how the candidate's score and design improved across iterations.

---

## Decision 6: Code Execution Correctness Oracle vs. AI Evaluation

### What AI Suggested:
AI suggested sending raw code submissions to Gemini and asking the model to simultaneously simulate execution, predict test outputs, and evaluate algorithmic correctness.

### What Was Accepted:
- Using Gemini for qualitative cognitive analysis: assessing Big-O time and space complexity, idiomatic language patterns, and code maintainability.

### What Was Rejected:
- Allowing the LLM to simulate or judge code correctness, test passes, or compilation outcomes.

### Why the Decision Was Made:
LLMs frequently hallucinate code execution results, miss edge cases, and miscalculate runtime performance. When a candidate submits code, **deterministic sandboxed execution is the sole authoritative source of truth**. The platform runs user code in an isolated process against concrete test vectors with strict process timeouts (`SIGKILL`). The AI evaluator is restricted to qualitative review and is explicitly barred from overriding execution outcomes.

