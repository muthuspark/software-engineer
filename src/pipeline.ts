import chalk from 'chalk';
import { log, logHeader, setLogFile, logInfo } from './logger.js';
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
import type { AdaptiveAnalysis, StepRecommendation } from './utils/stepAnalyzer.js';

const EXIT_CODE_FAILURE = 1;
const EXIT_CODE_INTERRUPT = 130;

let signalHandlersRegistered = false;

function exitWithError(message: string): never {
  console.log(chalk.red(`\n${message}`));
  process.exit(EXIT_CODE_FAILURE);
}

function getSkipReason(implementationOnly: boolean, primaryReason: string, fallbackReason: string): string {
  return implementationOnly ? 'implementation-only mode' : primaryReason;
}

function determineSkipTestsReason(config: Config, rec: StepRecommendation | null | undefined): string | null {
  if (config.implementationOnly) return 'implementation-only mode';
  if (rec?.skipTests) return 'adaptive execution';
  if (config.skipTests) return '--skip-tests';
  return null;
}

function displayImplementationOnlyBanner(): void {
  console.log(chalk.cyan('▶ Running in IMPLEMENTATION-ONLY mode'));
  console.log(chalk.cyan('▶ Steps: Implement → Review → SOLID'));
  console.log(chalk.dim('▶ Skipping: Branch Management, Simplify, Tests, Commit, Changelog\n'));
}

function displayCompletionMessage(implementationOnly: boolean): void {
  if (implementationOnly) {
    console.log(chalk.green('\n✓ Implementation-only pipeline completed successfully'));
    console.log(chalk.yellow('⚠ Changes are not committed - review and commit manually when ready\n'));
  } else {
    console.log(chalk.green('\n✓ Pipeline completed successfully\n'));
  }
}

export async function runPipeline(config: Config): Promise<void> {
  // Setup logging
  if (config.logFile) {
    setLogFile(config.logFile);
  }

  // Setup interrupt handler (only once to prevent duplicate registrations)
  if (!signalHandlersRegistered) {
    process.on('SIGINT', () => {
      console.log(chalk.red('\n\nPipeline interrupted'));
      process.exit(EXIT_CODE_INTERRUPT);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.red('\n\nPipeline terminated'));
      process.exit(EXIT_CODE_INTERRUPT);
    });

    signalHandlersRegistered = true;
  }

  // Display header
  logHeader(config);

  if (config.implementationOnly) {
    displayImplementationOnlyBanner();
  }

  log(`Starting pipeline for: ${config.requirement}`);

  // Step 1: Smart Branch Management
  let adaptive: AdaptiveAnalysis | null = null;
  let rec = null;

  const shouldSkipBranchManagement = config.implementationOnly || config.skipBranchManagement;

  if (shouldSkipBranchManagement) {
    const reason = getSkipReason(config.implementationOnly, '--skip-branch-management', '--skip-branch-management');
    logInfo(`Branch management step skipped (${reason})`);
  } else {
    const branchResult = await stepBranchManagement(config);
    if (!branchResult.success) {
      exitWithError('Branch management step failed. Exiting.');
    }
    adaptive = branchResult.adaptiveAnalysis;
    rec = adaptive?.stepRecommendation;
  }

  // Step 2: Implement
  const implSuccess = await stepImplement(config);
  if (!implSuccess) {
    exitWithError('Implementation step failed. Exiting.');
  }

  // Step 3: Simplify
  const shouldSkipSimplify = config.implementationOnly || rec?.skipSimplify;

  if (shouldSkipSimplify) {
    const reason = getSkipReason(config.implementationOnly, 'adaptive execution', 'adaptive execution');
    logInfo(`Simplify step skipped (${reason})`);
  } else {
    const simplifySuccess = await stepSimplify(config);
    if (!simplifySuccess) {
      exitWithError('Simplification step failed. Exiting.');
    }
  }

  // Step 5: Review loop
  if (rec?.skipReview) {
    logInfo('Review step skipped (adaptive execution)');
  } else {
    const reviewIterations = rec?.reviewIterations ?? config.reviewIterations;
    for (let i = 1; i <= reviewIterations; i++) {
      const reviewResult = await stepReview(i, config, rec?.reviewDepth);
      if (!reviewResult.success) {
        exitWithError('Review step failed. Exiting.');
      }

      if (reviewResult.noIssuesFound) {
        console.log(chalk.green('\n✓ Code review passed - no issues found, skipping remaining reviews'));
        break;
      }
    }
  }

  // Step 6: SOLID & Clean Code
  if (rec?.skipSolid) {
    logInfo('SOLID review step skipped (adaptive execution)');
  } else {
    const solidSuccess = await stepSolidCleanCode(config);
    if (!solidSuccess) {
      exitWithError('SOLID review step failed. Exiting.');
    }
  }

  // Step 7: Test
  const skipTestsReason = determineSkipTestsReason(config, rec);

  if (skipTestsReason) {
    logInfo(`Test step skipped (${skipTestsReason})`);
  } else {
    const testSuccess = await stepTest(config);
    if (!testSuccess) {
      exitWithError('Test step failed. Exiting.');
    }
  }

  // Step 8: Commit
  if (config.implementationOnly) {
    logInfo('Commit step skipped (implementation-only mode)');
  } else {
    const commitSuccess = await stepCommit(config);
    if (!commitSuccess) {
      exitWithError('Commit step failed. Exiting.');
    }
  }

  // Step 9: Changelog
  const shouldSkipChangelog = config.implementationOnly || rec?.skipChangelog;

  if (shouldSkipChangelog) {
    const reason = getSkipReason(config.implementationOnly, 'adaptive execution', 'adaptive execution');
    logInfo(`Changelog step skipped (${reason})`);
  } else {
    const changelogSuccess = await stepChangelog(config);
    if (!changelogSuccess) {
      exitWithError('Changelog step failed. Exiting.');
    }
  }

  displayCompletionMessage(config.implementationOnly);
}
