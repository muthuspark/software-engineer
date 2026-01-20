import { logStep, logInfo, logSuccess, logWarning, logDryRun } from '../logger.js';
import { getGitState, branchExists, createBranch, findSimilarBranches } from '../utils/git.js';
import { analyzeRequirement, type BranchAnalysis } from '../utils/branchAnalyzer.js';
import type { Config } from '../config.js';

export interface BranchResult {
  success: boolean;
  branchCreated: boolean;
  branchName: string;
  analysis: BranchAnalysis | null;
}

function createResult(branchName: string, analysis: BranchAnalysis | null = null, branchCreated = false): BranchResult {
  return { success: true, branchCreated, branchName, analysis };
}

export async function stepBranchManagement(config: Config): Promise<BranchResult> {
  logStep('1/8', 'SMART BRANCH MANAGEMENT');

  if (config.skipBranchManagement) {
    logInfo('Branch management skipped (--skip-branch-management)');
    return createResult('');
  }

  const gitState = getGitState();
  logInfo(`Current branch: ${gitState.currentBranch}`);

  if (!gitState.isMainBranch) {
    logInfo(`Already on branch '${gitState.currentBranch}' - skipping branch creation`);
    return createResult(gitState.currentBranch);
  }

  logInfo('On main branch - analyzing requirement...');

  // Analyze requirement to determine change type
  const analysis = await analyzeRequirement(config.requirement, config);

  logInfo(`Change type: ${analysis.changeType}`);
  logInfo(`Suggested branch: ${analysis.suggestedBranchName}`);

  if (analysis.isTrivial) {
    logInfo('Trivial change detected - staying on current branch');
    return createResult(gitState.currentBranch, analysis);
  }

  // Check for similar/conflicting branches
  const conflicts = findSimilarBranches(analysis.shortDescription, gitState.remoteBranches);
  if (conflicts.length > 0) {
    logWarning('Potential conflicting branches detected:');
    for (const conflict of conflicts) {
      logWarning(`  - ${conflict.branchName} (${conflict.similarity})`);
    }
    logWarning('Consider checking these branches before proceeding');
  }

  // Generate unique branch name
  let branchName = analysis.suggestedBranchName;
  let counter = 1;
  while (branchExists(branchName)) {
    branchName = `${analysis.branchPrefix}/${analysis.shortDescription}-${counter}`;
    counter++;
  }

  if (config.dryRun) {
    logDryRun(`git checkout -b ${branchName}`);
    return createResult(branchName, analysis);
  }

  logInfo(`Creating branch: ${branchName}`);
  const created = createBranch(branchName);

  if (created) {
    logSuccess(`Switched to new branch '${branchName}'`);
    return createResult(branchName, analysis, true);
  }

  logWarning(`Failed to create branch '${branchName}' - continuing on current branch`);
  return createResult(gitState.currentBranch, analysis);
}
