import chalk from 'chalk';
import { log, logHeader, setLogFile, logInfo } from './logger.js';
import {
  stepBranchManagement,
  stepUnderstandCodebase,
  stepImplement,
  stepSimplify,
  stepReview,
  stepSolidCleanCode,
  stepTest,
  stepCommit,
  stepChangelog,
} from './steps/index.js';
import type { Config } from './config.js';
import type { AdaptiveAnalysis } from './utils/stepAnalyzer.js';

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

  // Step 1: Smart Branch Management (also performs adaptive analysis if enabled)
  const branchResult = await stepBranchManagement(config);
  if (!branchResult.success) {
    console.log(chalk.red('\nBranch management step failed. Exiting.'));
    process.exit(1);
  }

  // Extract adaptive analysis for step decisions
  const adaptive: AdaptiveAnalysis | null = branchResult.adaptiveAnalysis;
  const rec = adaptive?.stepRecommendation;

  // Step 2: Understand Codebase
  const understandSuccess = await stepUnderstandCodebase(config);
  if (!understandSuccess) {
    console.log(chalk.red('\nUnderstand codebase step failed. Exiting.'));
    process.exit(1);
  }

  // Step 3: Implement
  const implSuccess = await stepImplement(config);
  if (!implSuccess) {
    console.log(chalk.red('\nImplementation step failed. Exiting.'));
    process.exit(1);
  }

  // Step 4: Simplify (can be skipped by adaptive execution)
  if (rec?.skipSimplify) {
    logInfo('Simplify step skipped (adaptive execution)');
  } else {
    const simplifySuccess = await stepSimplify(config);
    if (!simplifySuccess) {
      console.log(chalk.red('\nSimplification step failed. Exiting.'));
      process.exit(1);
    }
  }

  // Step 5: Review loop (can be skipped or adjusted by adaptive execution)
  if (rec?.skipReview) {
    logInfo('Review step skipped (adaptive execution)');
  } else {
    const reviewIterations = rec?.reviewIterations ?? config.reviewIterations;
    for (let i = 1; i <= reviewIterations; i++) {
      const reviewResult = await stepReview(i, config, rec?.reviewDepth);
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
  }

  // Step 6: SOLID & Clean Code (can be skipped by adaptive execution)
  if (rec?.skipSolid) {
    logInfo('SOLID review step skipped (adaptive execution)');
  } else {
    const solidSuccess = await stepSolidCleanCode(config);
    if (!solidSuccess) {
      console.log(chalk.red('\nSOLID review step failed. Exiting.'));
      process.exit(1);
    }
  }

  // Step 7: Test (can be skipped by adaptive execution or CLI flag)
  let skipTestsReason: string | null = null;
  if (rec?.skipTests) {
    skipTestsReason = 'adaptive execution';
  } else if (config.skipTests) {
    skipTestsReason = '--skip-tests';
  }

  if (skipTestsReason) {
    logInfo(`Test step skipped (${skipTestsReason})`);
  } else {
    const testSuccess = await stepTest(config);
    if (!testSuccess) {
      console.log(chalk.red('\nTest step failed. Exiting.'));
      process.exit(1);
    }
  }

  // Step 8: Commit
  const commitSuccess = await stepCommit(config);
  if (!commitSuccess) {
    console.log(chalk.red('\nCommit step failed. Exiting.'));
    process.exit(1);
  }

  // Step 9: Changelog (can be skipped by adaptive execution)
  if (rec?.skipChangelog) {
    logInfo('Changelog step skipped (adaptive execution)');
  } else {
    const changelogSuccess = await stepChangelog(config);
    if (!changelogSuccess) {
      console.log(chalk.red('\nChangelog step failed. Exiting.'));
      process.exit(1);
    }
  }

  console.log(chalk.green('\n✓ Pipeline completed successfully\n'));
}
