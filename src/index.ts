#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadConfigFromEnv, mergeConfig } from './config.js';
import { runPipeline } from './pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('sf')
  .description('Software Factory Pipeline - Automate development workflow with Claude AI')
  .version(pkg.version)
  .argument('<requirement>', 'The requirement or task to implement')
  .option('-d, --dry-run', 'Print commands without executing')
  .option('-r, --reviews <n>', 'Number of review iterations', '2')
  .option('--skip-tests', 'Skip the testing step')
  .option('--skip-push', 'Commit but do not push')
  .option('--log <file>', 'Log output to file')
  .option('--dangerously-skip-permissions', 'Pass flag to claude to skip permission prompts')
  .action(async (requirement: string, options) => {
    const envConfig = loadConfigFromEnv();

    const cliConfig = {
      requirement,
      dryRun: options.dryRun ?? undefined,
      reviewIterations: options.reviews ? parseInt(options.reviews, 10) : undefined,
      skipTests: options.skipTests ?? undefined,
      skipPush: options.skipPush ?? undefined,
      logFile: options.log ?? undefined,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions ?? undefined,
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
