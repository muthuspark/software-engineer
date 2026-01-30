import { logStep, logInfo, logSuccess, logWarning, logDryRun } from '../logger.js';
import { getGitState, branchExists, createBranch, findSimilarBranches } from '../utils/git.js';
import { analyzeRequirement, type BranchAnalysis } from '../utils/branchAnalyzer.js';
import { analyzeSteps, type AdaptiveAnalysis } from '../utils/stepAnalyzer.js';
import type { Config } from '../config.js';

export interface BranchResult {
  success: boolean;
  branchCreated: boolean;
  branchName: string;
  analysis: BranchAnalysis | null;
  adaptiveAnalysis: AdaptiveAnalysis | null;
}

function createResult(
  branchName: string,
  analysis: BranchAnalysis | null = null,
  branchCreated = false,
  adaptiveAnalysis: AdaptiveAnalysis | null = null
): BranchResult {
  return { success: true, branchCreated, branchName, analysis, adaptiveAnalysis };
}

function logAdaptiveAnalysis(analysis: AdaptiveAnalysis): void {
  const { complexity, riskLevel, affectedAreas, stepRecommendation: rec } = analysis;

  logInfo(`Complexity: ${complexity}, Risk: ${riskLevel}`);
  logInfo(`Affected areas: ${affectedAreas.join(', ')}`);

  const skipMap: [boolean, string][] = [
    [rec.skipSimplify, 'simplify'],
    [rec.skipReview, 'review'],
    [rec.skipSolid, 'SOLID'],
    [rec.skipTests, 'tests'],
    [rec.skipChangelog, 'changelog'],
  ];
  const skipped = skipMap.filter(([skip]) => skip).map(([, name]) => name);

  if (skipped.length > 0) {
    logInfo(`Steps to skip: ${skipped.join(', ')}`);
  } else {
    logInfo('All steps will be executed');
  }

  const iterationLabel = rec.reviewIterations === 1 ? 'iteration' : 'iterations';
  logInfo(`Review depth: ${rec.reviewDepth} (${rec.reviewIterations} ${iterationLabel})`);
  logInfo(`Reasoning: ${rec.reasoning}`);
}

async function performAdaptiveAnalysis(config: Config): Promise<AdaptiveAnalysis> {
  logInfo('Adaptive execution enabled - analyzing step requirements...');
  const analysis = await analyzeSteps(config.requirement, config);
  logAdaptiveAnalysis(analysis);
  return analysis;
}

function branchMatchesRequirement(currentBranch: string, analysis: BranchAnalysis): boolean {
  const currentLower = currentBranch.toLowerCase();
  const suggestedLower = analysis.shortDescription.toLowerCase();

  // Extract keywords from both branches
  const currentKeywords = currentLower.split(/[-_/]/).filter((k) => k.length > 2);
  const suggestedKeywords = suggestedLower.split(/[-_/]/).filter((k) => k.length > 2);

  // Check if any significant keywords overlap
  const overlap = currentKeywords.some((ck) =>
    suggestedKeywords.some((sk) => ck.includes(sk) || sk.includes(ck))
  );

  // Also check if the branch prefix matches the change type
  const prefixMatches = currentLower.startsWith(analysis.branchPrefix);

  return overlap || (prefixMatches && suggestedKeywords.length === 0);
}

export async function stepBranchManagement(config: Config): Promise<BranchResult> {
  logStep('1/8', 'SMART BRANCH MANAGEMENT');

  const adaptiveAnalysis = config.adaptiveExecution ? await performAdaptiveAnalysis(config) : null;

  if (config.skipBranchManagement) {
    logInfo('Branch management skipped (--skip-branch-management)');
    return createResult('', null, false, adaptiveAnalysis);
  }

  const gitState = getGitState();
  logInfo(`Current branch: ${gitState.currentBranch}`);

  // Always analyze the requirement first
  logInfo('Analyzing requirement...');
  const analysis = await analyzeRequirement(config.requirement, config);

  logInfo(`Change type: ${analysis.changeType}`);
  logInfo(`Suggested branch: ${analysis.suggestedBranchName}`);

  if (!gitState.isMainBranch) {
    // Check if current branch matches the requirement
    if (branchMatchesRequirement(gitState.currentBranch, analysis)) {
      logInfo(`Current branch '${gitState.currentBranch}' matches requirement - continuing`);
      return createResult(gitState.currentBranch, analysis, false, adaptiveAnalysis);
    }

    // Branch doesn't match - warn and suggest switching
    logWarning(`Current branch '${gitState.currentBranch}' may not match this requirement`);
    logWarning(`Suggested branch for this requirement: ${analysis.suggestedBranchName}`);
    logWarning('Consider switching to main and re-running, or use --skip-branch-management to continue');

    // Continue on current branch but flag the mismatch
    return createResult(gitState.currentBranch, analysis, false, adaptiveAnalysis);
  }

  // On main branch
  if (analysis.isTrivial) {
    logInfo('Trivial change detected - staying on current branch');
    return createResult(gitState.currentBranch, analysis, false, adaptiveAnalysis);
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
    return createResult(branchName, analysis, false, adaptiveAnalysis);
  }

  logInfo(`Creating branch: ${branchName}`);
  const created = createBranch(branchName);

  if (created) {
    logSuccess(`Switched to new branch '${branchName}'`);
    return createResult(branchName, analysis, true, adaptiveAnalysis);
  }

  logWarning(`Failed to create branch '${branchName}' - continuing on current branch`);
  return createResult(gitState.currentBranch, analysis, false, adaptiveAnalysis);
}
