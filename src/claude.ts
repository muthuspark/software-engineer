import { spawn } from 'child_process';
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

    // Spawn Claude using child_process
    // Use 'inherit' for stdin to allow interactive input
    // Use 'pipe' for stdout/stderr to capture output while passing through
    const child = spawn('claude', args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    // Capture and pass through stdout
    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        process.stdout.write(text);
        capturedOutput += text;
      });
    }

    // Capture and pass through stderr
    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        process.stderr.write(data.toString());
      });
    }

    // Handle process exit
    child.on('close', (exitCode) => {
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

    // Handle spawn errors
    child.on('error', (err) => {
      logError(`Failed to start Claude: ${err.message}`);
      resolve({ success: false, output: '' });
    });
  });
}
