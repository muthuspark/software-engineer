import * as pty from 'node-pty';
import { logInfo, logSuccess, logError, logDryRun } from './logger.js';
import type { Config } from './config.js';

// Terminal constants
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const CTRL_C = 0x03;

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_INTERRUPTED = 130;
const SIGINT_CODE = 2;

export interface ClaudeOptions {
  prompt: string;
  continueConversation?: boolean;
}

export async function runClaude(options: ClaudeOptions, config: Config): Promise<boolean> {
  const args: string[] = [];

  if (config.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  if (options.continueConversation) {
    args.push('-c');
  }

  args.push('-p', options.prompt);

  if (config.dryRun) {
    logDryRun(`claude ${args.join(' ')}`);
    return true;
  }

  logInfo('Calling Claude...');

  return new Promise((resolve) => {
    const cols = process.stdout.columns || DEFAULT_COLS;
    const rows = process.stdout.rows || DEFAULT_ROWS;

    // Track if interrupted
    let interrupted = false;

    // Spawn Claude in a PTY
    const ptyProcess = pty.spawn('claude', args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.cwd(),
      env: process.env as { [key: string]: string },
    });

    // Pipe PTY output to stdout
    ptyProcess.onData((data) => {
      process.stdout.write(data);
    });

    // Pipe stdin to PTY
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const stdinHandler = (data: Buffer) => {
      if (data.length === 1 && data[0] === CTRL_C) {
        interrupted = true;
      }
      ptyProcess.write(data.toString());
    };
    process.stdin.on('data', stdinHandler);

    const resizeHandler = () => {
      ptyProcess.resize(
        process.stdout.columns || DEFAULT_COLS,
        process.stdout.rows || DEFAULT_ROWS
      );
    };
    process.stdout.on('resize', resizeHandler);

    // Cleanup function
    const cleanup = () => {
      process.stdin.off('data', stdinHandler);
      process.stdout.off('resize', resizeHandler);
      process.off('SIGINT', sigintHandler);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    ptyProcess.onExit(({ exitCode, signal }) => {
      cleanup();

      const wasInterrupted = interrupted || signal === SIGINT_CODE ||
        exitCode === EXIT_INTERRUPTED || exitCode === SIGINT_CODE;

      if (wasInterrupted) {
        logError('Claude interrupted');
        process.exit(EXIT_INTERRUPTED);
      }

      if (exitCode === EXIT_SUCCESS) {
        logSuccess('Claude completed');
        resolve(true);
        return;
      }

      logError(`Claude exited with code ${exitCode}`);
      resolve(false);
    });

    // Handle SIGINT from parent
    const sigintHandler = () => {
      interrupted = true;
      ptyProcess.kill('SIGINT');
    };
    process.on('SIGINT', sigintHandler);
  });
}
