import chalk from 'chalk';
import { log, logHeader, setLogFile } from './logger.js';
import {
  stepBranchManagement,
  stepImplement,
  stepSimplify,
  stepReview,
  stepSolidCleanCode,
  stepTest,
  stepCommit,
  stepChangelog,
} from './steps/index.js';
import type { Config } from './config.js';

let signalHandlersRegistered = false;

export async function runPipeline(config: Config): Promise<void> {
  // Setup logging
  if (config.logFile) {
    setLogFile(config.logFile);
  }

  // Setup interrupt handler (only once to prevent duplicate registrations)
  if (!signalHandlersRegistered) {
    process.on('SIGINT', () => {
      console.log(chalk.red('\n\nPipeline interrupted'));
      process.exit(130);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.red('\n\nPipeline terminated'));
      process.exit(130);
    });

    signalHandlersRegistered = true;
  }

  // Display header
  logHeader(config);
  log(`Starting pipeline for: ${config.requirement}`);

  // Step 1: Smart Branch Management
  const branchResult = await stepBranchManagement(config);
  if (!branchResult.success) {
    console.log(chalk.red('\nBranch management step failed. Exiting.'));
    process.exit(1);
  }

  // Step 2: Implement
  const implSuccess = await stepImplement(config);
  if (!implSuccess) {
    console.log(chalk.red('\nImplementation step failed. Exiting.'));
    process.exit(1);
  }

  // Step 3: Simplify
  const simplifySuccess = await stepSimplify(config);
  if (!simplifySuccess) {
    console.log(chalk.red('\nSimplification step failed. Exiting.'));
    process.exit(1);
  }

  // Step 4: Review loop
  for (let i = 1; i <= config.reviewIterations; i++) {
    const reviewResult = await stepReview(i, config);
    if (!reviewResult.success) {
      console.log(chalk.red('\nReview step failed. Exiting.'));
      process.exit(1);
    }

    // Skip remaining reviews if no issues were found
    if (reviewResult.noIssuesFound) {
      console.log(chalk.green('\n✓ Code review passed - no issues found, skipping remaining reviews'));
      break;
    }
  }

  // Step 5: SOLID & Clean Code
  const solidSuccess = await stepSolidCleanCode(config);
  if (!solidSuccess) {
    console.log(chalk.red('\nSOLID review step failed. Exiting.'));
    process.exit(1);
  }

  // Step 6: Test
  const testSuccess = await stepTest(config);
  if (!testSuccess) {
    console.log(chalk.red('\nTest step failed. Exiting.'));
    process.exit(1);
  }

  // Step 7: Commit
  const commitSuccess = await stepCommit(config);
  if (!commitSuccess) {
    console.log(chalk.red('\nCommit step failed. Exiting.'));
    process.exit(1);
  }

  // Step 8: Changelog
  const changelogSuccess = await stepChangelog(config);
  if (!changelogSuccess) {
    console.log(chalk.red('\nChangelog step failed. Exiting.'));
    process.exit(1);
  }

  console.log(chalk.green('\n✓ Pipeline completed successfully\n'));
}
