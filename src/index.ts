#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';
import { AGENTS, loadConfigFromEnv, mergeConfig, VALID_STAGES } from './config.js';
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
  .description('Software Factory Pipeline - Automate development workflow with Codex or Claude AI')
  .version(pkg.version)
  .argument('[requirement]', 'The requirement or task to implement')
  .option('-d, --dry-run', 'Print commands without executing')
  .option('-r, --reviews <n>', 'Number of review iterations', '2')
  .option('-a, --adaptive', 'Enable adaptive step execution (AI decides which steps to skip)')
  .option('--skip-tests', 'Skip the testing step')
  .option('--skip-push', 'Commit but do not push')
  .option('--skip-branch-management', 'Skip smart branch management')
  .option('--implementation-only', 'Run only: Implement → Review → SOLID (skips branch, tests, commit)')
  .option('--implement', 'Run only the implementation step')
  .option('--simplify', 'Run only the code simplification step')
  .option('--review', 'Run only the code review step')
  .option('--clean-code', 'Run only the SOLID & clean code step')
  .option('--test', 'Run only the testing step')
  .option('--commit', 'Run only the commit step')
  .option('--changelog', 'Run only the changelog step')
  .option('--log <file>', 'Log output to file')
  .option('--agent <agent>', 'Agent to run: codex or claude (default: codex)')
  .option('--dangerously-skip-permissions', 'Bypass agent permission prompts')
  .option('--allowedTools <tools>', 'Claude-only comma-separated allowed tools (default: "Edit,Read,Bash")')
  .action(async (requirement: string | undefined, options) => {
    // Check for updates (non-blocking, fails silently)
    await checkForUpdates(pkg.name, pkg.version).catch(() => {});

    // Collect stage flags
    const selectedStages = VALID_STAGES.filter((stage) => {
      const camelCase = stage.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return !!options[camelCase];
    });

    // Prompt for requirement if not provided (skip for stages that don't need one)
    const stageNeedsRequirement = selectedStages.length === 0 || selectedStages.includes('implement');
    let finalRequirement = requirement;
    if (!finalRequirement && stageNeedsRequirement) {
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
      agent: options.agent ?? undefined,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions ?? undefined,
      allowedTools: options.allowedTools ?? undefined,
      adaptiveExecution: options.adaptive ?? undefined,
      implementationOnly: options.implementationOnly ?? undefined,
      runStages: selectedStages.length > 0 ? selectedStages : undefined,
    };

    let config;
    try {
      if (options.agent && !AGENTS.includes(options.agent)) {
        throw new Error(`Invalid --agent: "${options.agent}". Expected "codex" or "claude".`);
      }
      config = mergeConfig(envConfig, cliConfig);
    } catch (error) {
      console.error(chalk.red('Error:') + ' ' + (error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }

    // Handle implementation-only mode
    if (config.implementationOnly) {
      if (config.runStages) {
        console.error(chalk.red('Error:') + ' Cannot use --implementation-only with individual stage flags');
        process.exit(1);
      }
      // Implementation-only mode automatically skips branch management and tests
      config.skipBranchManagement = true;
      config.skipTests = true;

      // Warn if adaptive execution was explicitly requested but will be overridden
      const adaptiveWasRequested = options.adaptive || process.env.SF_ADAPTIVE_EXECUTION === 'true';
      if (config.adaptiveExecution && adaptiveWasRequested) {
        console.log(chalk.yellow('⚠ Implementation-only mode overrides --adaptive flag'));
      }
      config.adaptiveExecution = false;
    }

    // Require a requirement for full pipeline or implement stage; optional for other stages
    const needsRequirement = !config.runStages || config.runStages.includes('implement');
    if (!config.requirement && needsRequirement) {
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
