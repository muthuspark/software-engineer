import { spawn } from 'child_process';
import { appendFileSync } from 'fs';
import { logInfo, logSuccess, logError, logDryRun } from './logger.js';
import type { Config } from './config.js';

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

  const command = `claude ${args.join(' ')}`;

  if (config.dryRun) {
    logDryRun(command);
    return true;
  }

  logInfo('Calling Claude...');

  return new Promise((resolve) => {
    const proc = spawn('claude', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(text);
      if (config.logFile) {
        appendFileSync(config.logFile, text);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      process.stderr.write(text);
      if (config.logFile) {
        appendFileSync(config.logFile, text);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        logSuccess('Claude completed');
        resolve(true);
      } else {
        logError('Claude command failed');
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      logError(`Failed to start Claude: ${err.message}`);
      resolve(false);
    });
  });
}
