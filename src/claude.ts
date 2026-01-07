import * as pty from 'node-pty';
import { logInfo, logSuccess, logError, logDryRun } from './logger.js';
import type { Config } from './config.js';

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_INTERRUPTED = 130;

export interface ClaudeOptions {
  prompt: string;
  continueConversation?: boolean;
}

export interface ClaudeResult {
  success: boolean;
  output: string;
}

export async function runClaude(options: ClaudeOptions, config: Config): Promise<ClaudeResult> {
  // Build the full prompt with exit instruction (like Python version)
  const fullPrompt = `${options.prompt}. Once the work is completed, exit.`;

  const args: string[] = [];

  if (config.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  if (options.continueConversation) {
    args.push('-c');
  }

  // Pass prompt directly like Python version (not with -p flag)
  args.push(fullPrompt);

  if (config.dryRun) {
    logDryRun(`claude ${args.join(' ')}`);
    return { success: true, output: '' };
  }

  logInfo('Calling Claude...');

  return new Promise((resolve) => {
    let capturedOutput = '';
    // Get terminal size
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    // Spawn Claude in a PTY (like Python's pty.spawn)
    const ptyProcess = pty.spawn('claude', args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.cwd(),
      env: process.env as { [key: string]: string },
    });

    // Pipe PTY output directly to stdout and capture it
    ptyProcess.onData((data) => {
      process.stdout.write(data);
      capturedOutput += data;
    });

    // Setup raw mode for stdin to pass input to PTY
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // Pipe stdin to PTY
    const stdinListener = (data: Buffer) => {
      ptyProcess.write(data.toString());
    };
    process.stdin.on('data', stdinListener);

    // Handle terminal resize
    const resizeListener = () => {
      ptyProcess.resize(
        process.stdout.columns || 80,
        process.stdout.rows || 24
      );
    };
    process.stdout.on('resize', resizeListener);

    // Cleanup function
    const cleanup = () => {
      process.stdin.removeListener('data', stdinListener);
      process.stdout.removeListener('resize', resizeListener);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      cleanup();

      if (exitCode === EXIT_INTERRUPTED || exitCode === 2) {
        logError('Claude interrupted');
        process.exit(EXIT_INTERRUPTED);
      } else if (exitCode === EXIT_SUCCESS) {
        logSuccess('Claude completed');
        resolve({ success: true, output: capturedOutput });
      } else {
        logError(`Claude exited with code ${exitCode}`);
        resolve({ success: false, output: capturedOutput });
      }
    });
  });
}
