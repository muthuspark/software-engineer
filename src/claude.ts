import spawn from 'cross-spawn';
import chalk from 'chalk';
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

interface StreamEvent {
  type: string;
  subtype?: string;
  message?: {
    content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
  };
}

function formatToolCall(name: string, input: unknown): string {
  const toolColors: Record<string, string> = {
    Read: 'cyan',
    Write: 'green',
    Edit: 'yellow',
    Bash: 'magenta',
    Grep: 'blue',
    Glob: 'blue',
  };

  const color = toolColors[name] || 'white';
  const colorFn = chalk[color as keyof typeof chalk] as typeof chalk.cyan;

  if (name === 'Read' && input && typeof input === 'object' && 'file_path' in input) {
    return colorFn(`📖 Reading: ${input.file_path}`);
  }
  if (name === 'Write' && input && typeof input === 'object' && 'file_path' in input) {
    return colorFn(`✍️  Writing: ${input.file_path}`);
  }
  if (name === 'Edit' && input && typeof input === 'object' && 'file_path' in input) {
    return colorFn(`✏️  Editing: ${input.file_path}`);
  }
  if (name === 'Bash' && input && typeof input === 'object' && 'description' in input) {
    return colorFn(`⚡ Running: ${input.description}`);
  }
  if (name === 'Grep' && input && typeof input === 'object' && 'pattern' in input) {
    return colorFn(`🔍 Searching: ${input.pattern}`);
  }
  if (name === 'Glob' && input && typeof input === 'object' && 'pattern' in input) {
    return colorFn(`📁 Finding: ${input.pattern}`);
  }

  return colorFn(`🔧 ${name}`);
}

let lastPrintedMessage = '';

function processStreamEvent(line: string): void {
  try {
    const event: StreamEvent = JSON.parse(line);

    if (event.type === 'system' && event.subtype === 'init') {
      console.log(chalk.dim('━'.repeat(60)));
      console.log(chalk.bold.cyan('🤖 Claude is ready'));
      console.log(chalk.dim('━'.repeat(60)));
      lastPrintedMessage = ''; // Reset on new session
      return;
    }

    if (event.type === 'assistant' && event.message?.content) {
      for (const content of event.message.content) {
        if (content.type === 'text' && content.text) {
          // Print assistant text responses (always print, don't deduplicate text)
          console.log(chalk.white(content.text));
          lastPrintedMessage = ''; // Reset after text message
        } else if (content.type === 'tool_use' && content.name) {
          // Print formatted tool calls (deduplicate consecutive identical messages)
          const message = formatToolCall(content.name, content.input);
          if (message !== lastPrintedMessage) {
            console.log(message);
            lastPrintedMessage = message;
          }
        }
      }
    }
  } catch (error) {
    // Silently ignore JSON parse errors for non-JSON lines
  }
}

export async function runClaude(options: ClaudeOptions, config: Config): Promise<ClaudeResult> {
  // Build the full prompt with exit instruction (like Python version)
  const fullPrompt = `${options.prompt}. Once the work is completed, exit.`;

  const args: string[] = [];

  if (config.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  // Always pass -p for output and add streaming JSON output format
  args.push('-p', '--output-format=stream-json', '--verbose');

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
    let outputBuffer = '';

    // Spawn Claude with piped stdio to capture stream-json output
    const child = spawn('claude', args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'inherit'], // pipe stdout, inherit stdin and stderr
    });

    // Process stdout line by line
    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (i === lines.length - 1) {
          // Last line might be incomplete, buffer it
          outputBuffer += lines[i];
        } else {
          // Complete line, process it
          const line = outputBuffer + lines[i];
          outputBuffer = '';

          if (line.trim()) {
            processStreamEvent(line);
          }
        }
      }
    });

    // Handle process exit
    child.on('close', (exitCode) => {
      // Process any remaining buffered output
      if (outputBuffer.trim()) {
        processStreamEvent(outputBuffer);
      }

      console.log(chalk.dim('━'.repeat(60)));

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
