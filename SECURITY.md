# Security Policy

## 1. Supported Versions
This project is an **industry-level, submission-ready prototype** developed for the CipherSchools engineering assignment. Security fixes and dependency updates apply to the main branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## 2. Environment Variables & Secret Hygiene
- **Zero Secrets in Repository**: Secrets and API keys (such as `GEMINI_API_KEY`) must strictly reside in local `.env.local` files and environment variables.
- **Server-Side Isolation**: All AI evaluations and database operations occur exclusively on Next.js server-side route handlers and application services. No environment variables are prefixed with `NEXT_PUBLIC_` or exposed to the browser bundle.
- **API Key Logging Invariant**: Evaluator logging logs only metadata (attempt ID, problem ID, provider, model name, criteria count, and token status). Secret keys are never logged or echoed to clients.

---

## 3. Untrusted Code Execution Boundaries & Limitations
The platform includes an execution runner for coding solutions (`JavaScriptExecutionAdapter` and `PythonExecutionAdapter`):

1. **Ephemeral Working Workspaces**: Each execution runs in a uniquely generated temporary directory outside the application and repository root (`/tmp` or OS temporary directory).
2. **Process Timeouts**: Hard execution deadlines (e.g., 5,000ms) terminate runaway infinite loops with `TIME_LIMIT_EXCEEDED` via POSIX signal aborts (`SIGKILL`).
3. **Restricted Standard Input / Output**: Input vectors are passed via controlled files or process stdin, and stdout/stderr are buffer-capped to prevent memory exhaustion attacks.
4. **Current Architectural Boundary & Limitation**:
   - In this prototype, execution relies on isolated child processes with process timeouts and path isolation.
   - **Production Recommendation**: For multi-tenant production deployments with untrusted public user code, processes should be wrapped in hypervisor-level microVMs (e.g., AWS Firecracker, gVisor, or hardened non-root container sandboxes with disabled network namespaces and seccomp profiles).

---

## 4. Hidden Test Case Security
- Hidden test cases (`hiddenTestCases`) defined on coding problems **never reach the client**.
- `Problem.toClientJSON()` strips `hiddenTestCases` before transmission.
- `ExecutionResult.toSafeClientJSON()` strips hidden inputs and raw outputs, exposing only aggregate pass/fail metrics (e.g., `3/3 passed`).

---

## 5. Reporting Security Concerns
If you identify any security vulnerabilities or potential credential exposures, please open a private GitHub advisory or reach out directly to the repository maintainer.
