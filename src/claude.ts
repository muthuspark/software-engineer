import spawn from 'cross-spawn';
import chalk from 'chalk';
import { logInfo, logSuccess, logError, logDryRun } from './logger.js';
import type { Agent, Config } from './config.js';

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

export function getAgentCommand(config: Pick<Config, 'agent' | 'dangerouslySkipPermissions' | 'allowedTools'>, prompt: string, options: { stream?: boolean; continueConversation?: boolean } = {}): { command: Agent; args: string[] } {
  if (config.agent === 'codex') {
    const args = ['exec'];
    if (config.dangerouslySkipPermissions) {
      args.push('--dangerously-bypass-approvals-and-sandbox');
    } else {
      args.push('--sandbox', 'workspace-write', '--ask-for-approval', 'never');
    }
    args.push(prompt);
    return { command: 'codex', args };
  }

  const args: string[] = [];

  if (config.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  } else if (config.allowedTools) {
    args.push('--allowedTools', config.allowedTools);
  }

  args.push('-p');
  if (options.stream) {
    args.push('--output-format=stream-json', '--verbose');
  }
  if (options.continueConversation) {
    args.push('-c');
  }
  args.push(prompt);
  return { command: 'claude', args };
}

function quoteArg(arg: string): string {
  return /^[A-Za-z0-9_./:=,-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map(quoteArg).join(' ');
}

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
  const { command, args } = getAgentCommand(config, fullPrompt, { stream: config.agent === 'claude', continueConversation: options.continueConversation });

  if (config.dryRun) {
    logDryRun(formatCommand(command, args));
    return { success: true, output: '' };
  }

  logInfo(`Calling ${config.agent}...`);

  return new Promise((resolve) => {
    let outputBuffer = '';

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'inherit'],
    });

    child.stdout?.on('data', (data: Buffer) => {
      if (config.agent === 'codex') {
        process.stdout.write(data);
        return;
      }

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
        logError(`${config.agent} interrupted`);
        process.exit(EXIT_INTERRUPTED);
      } else if (exitCode === EXIT_SUCCESS) {
        logSuccess(`${config.agent} completed`);
        resolve({ success: true, output: '' });
      } else {
        logError(`${config.agent} exited with code ${exitCode}`);
        resolve({ success: false, output: '' });
      }
    });

    // Handle spawn errors
    child.on('error', (err) => {
      logError(`Failed to start ${config.agent}: ${err.message}`);
      resolve({ success: false, output: '' });
    });
  });
}
