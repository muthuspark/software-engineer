import { spawn } from 'child_process';
import { logInfo, logSuccess, logError, logDryRun } from './logger.js';
import type { Config } from './config.js';

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_INTERRUPTED = 130;

// Escape string for Windows cmd.exe
function escapeWinArg(arg: string): string {
  // Wrap in double quotes and escape internal double quotes
  return `"${arg.replace(/"/g, '\\"')}"`;
}

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

  if (config.printOutput) {
    args.push('-p');
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
    // Spawn Claude using child_process
    // Use 'inherit' for all stdio to allow Claude's interactive UI to work properly
    // Claude CLI requires a TTY for its rich terminal features (spinners, progress, etc.)
    // Piping stdout/stderr causes Claude to detect non-TTY and buffer/disable output
    const isWindows = process.platform === 'win32';

    // On Windows, we need shell:true to find .cmd wrappers, but must build
    // a single command string to avoid DEP0190 deprecation warning
    const child = isWindows
      ? spawn(`claude ${args.map(escapeWinArg).join(' ')}`, [], {
          cwd: process.cwd(),
          env: process.env,
          stdio: 'inherit',
          shell: true,
        })
      : spawn('claude', args, {
          cwd: process.cwd(),
          env: process.env,
          stdio: 'inherit',
        });

    // Handle process exit
    child.on('close', (exitCode) => {
      if (exitCode === EXIT_INTERRUPTED || exitCode === 2) {
        logError('Claude interrupted');
        process.exit(EXIT_INTERRUPTED);
      } else if (exitCode === EXIT_SUCCESS) {
        logSuccess('Claude completed');
        resolve({ success: true, output: '' });
      } else {
        logError(`Claude exited with code ${exitCode}`);
        resolve({ success: false, output: '' });
      }
    });

    // Handle spawn errors
    child.on('error', (err) => {
      logError(`Failed to start Claude: ${err.message}`);
      resolve({ success: false, output: '' });
    });
  });
}
