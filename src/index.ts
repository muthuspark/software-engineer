#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';
import { loadConfigFromEnv, mergeConfig } from './config.js';
import { runPipeline } from './pipeline.js';
import { checkForUpdates } from './utils/updateNotifier.js';

async function promptForRequirement(): Promise<string> {
  console.log(chalk.cyan('Enter your requirement (press Ctrl+D or type END on a new line when done):'));
  console.log(chalk.gray('─'.repeat(60)));

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY ?? false,
  });

  const lines: string[] = [];

  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (line.trim().toUpperCase() === 'END') {
        rl.close();
      } else {
        lines.push(line);
      }
    });

    rl.on('close', () => {
      console.log(chalk.gray('─'.repeat(60)));
      resolve(lines.join('\n').trim());
    });
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('sf')
  .description('Software Factory Pipeline - Automate development workflow with Claude AI')
  .version(pkg.version)
  .argument('[requirement]', 'The requirement or task to implement')
  .option('-d, --dry-run', 'Print commands without executing')
  .option('-r, --reviews <n>', 'Number of review iterations', '2')
  .option('-a, --adaptive', 'Enable adaptive step execution (AI decides which steps to skip)')
  .option('--skip-tests', 'Skip the testing step')
  .option('--skip-push', 'Commit but do not push')
  .option('--skip-branch-management', 'Skip smart branch management')
  .option('--log <file>', 'Log output to file')
  .option('--dangerously-skip-permissions', 'Pass flag to claude to skip permission prompts')
  .option('--allowedTools <tools>', 'Comma-separated list of allowed tools (default: "Edit,Read,Bash")')
  .action(async (requirement: string | undefined, options) => {
    // Check for updates (non-blocking, fails silently)
    await checkForUpdates(pkg.name, pkg.version).catch(() => {});

    // Prompt for requirement if not provided
    let finalRequirement = requirement;
    if (!finalRequirement) {
      finalRequirement = await promptForRequirement();
    }

    const envConfig = loadConfigFromEnv();

    const cliConfig = {
      requirement: finalRequirement,
      dryRun: options.dryRun ?? undefined,
      reviewIterations: options.reviews ? parseInt(options.reviews, 10) : undefined,
      skipTests: options.skipTests ?? undefined,
      skipPush: options.skipPush ?? undefined,
      skipBranchManagement: options.skipBranchManagement ?? undefined,
      logFile: options.log ?? undefined,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions ?? undefined,
      allowedTools: options.allowedTools ?? undefined,
      adaptiveExecution: options.adaptive ?? undefined,
    };

    const config = mergeConfig(envConfig, cliConfig);

    if (!config.requirement) {
      console.error(chalk.red('Error:') + ' No requirement provided');
      program.help();
      return; // Ensure we don't continue if help() doesn't exit
    }

    try {
      await runPipeline(config);
    } catch (error) {
      console.error(chalk.red('Pipeline failed:'), error);
      process.exit(1);
    }
  });

program.parse();
