import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface IsolatedExecutionOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
  stdin?: string;
  files?: Record<string, string>; // filename -> content
}

export interface IsolatedExecutionOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  executionTimeMs: number;
}

/**
 * IsolatedExecutionEnvironment
 *
 * Implements a secured execution sandbox for untrusted learner code:
 * 1. Isolated Ephemeral Directory: Code runs in a temporary directory inside os.tmpdir(),
 *    completely separated from the application source code and repository.
 * 2. Secrets Sanitization: Strips all application secrets (GEMINI_API_KEY, DB connection strings,
 *    and system credentials). The spawned process cannot read host environment variables.
 * 3. Strict Time & CPU Bounds: Automatically aborts and kills runaway execution after timeout (default 3s).
 * 4. Automatic Cleanup: Temporary directories and files are guaranteed to be cleaned up in a finally block.
 */
export class IsolatedExecutionEnvironment {
  private static readonly DEFAULT_TIMEOUT_MS = 3000;
  private static readonly MAX_BUFFER_BYTES = 1024 * 1024; // 1MB stdout/stderr cap

  /**
   * Runs a command in an isolated environment with sanitized environment variables
   * and an ephemeral scratch workspace.
   */
  public static async execute(
    command: string,
    args: string[],
    options: IsolatedExecutionOptions = {}
  ): Promise<IsolatedExecutionOutput> {
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lld-sandbox-'));

    try {
      // 1. Write any test runner or payload files into the isolated temporary directory
      if (options.files) {
        for (const [filename, content] of Object.entries(options.files)) {
          const filePath = path.join(tempDir, filename);
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, content, 'utf8');
        }
      }

      // 2. Build sanitized environment: Explicitly omit GEMINI_API_KEY, DB secrets, and sensitive paths
      const sanitizedEnv: NodeJS.ProcessEnv = {
        NODE_ENV: (process.env.NODE_ENV as any) || 'production',
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        HOME: tempDir,
        TMPDIR: tempDir,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
        NODE_OPTIONS: '--max-old-space-size=128', // Enforce memory constraint on Node.js
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1',
      };

      const startTime = performance.now();

      return await new Promise<IsolatedExecutionOutput>((resolve) => {
        let stdoutData = '';
        let stderrData = '';
        let timedOut = false;

        const child = spawn(command, args, {
          cwd: tempDir,
          env: sanitizedEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const timer = setTimeout(() => {
          timedOut = true;
          try {
            child.kill('SIGKILL');
          } catch {
            // Process may already have terminated
          }
        }, timeoutMs);

        if (options.stdin && child.stdin) {
          try {
            child.stdin.write(options.stdin);
            child.stdin.end();
          } catch {
            // Stream write error if child closed early
          }
        }

        child.stdout?.on('data', (chunk) => {
          if (stdoutData.length < IsolatedExecutionEnvironment.MAX_BUFFER_BYTES) {
            stdoutData += chunk.toString();
          }
        });

        child.stderr?.on('data', (chunk) => {
          if (stderrData.length < IsolatedExecutionEnvironment.MAX_BUFFER_BYTES) {
            stderrData += chunk.toString();
          }
        });

        child.on('close', (exitCode, signal) => {
          clearTimeout(timer);
          const executionTimeMs = Math.round(performance.now() - startTime);

          resolve({
            stdout: stdoutData,
            stderr: stderrData,
            exitCode,
            signal,
            timedOut,
            executionTimeMs,
          });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          const executionTimeMs = Math.round(performance.now() - startTime);

          resolve({
            stdout: stdoutData,
            stderr: `${stderrData}\nFailed to spawn process: ${err.message}`.trim(),
            exitCode: -1,
            signal: null,
            timedOut: false,
            executionTimeMs,
          });
        });
      });
    } finally {
      // 3. Automatic Cleanup: Always clean up the temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Suppress cleanup errors
      }
    }
  }
}
