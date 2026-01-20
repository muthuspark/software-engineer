import { execSync } from 'child_process';

const MAX_BRANCH_NAME_LENGTH = 40;
const MAIN_BRANCH_NAMES = ['main', 'master', 'develop', 'dev'];

export interface GitState {
  currentBranch: string;
  isMainBranch: boolean;
  hasUncommittedChanges: boolean;
  remoteBranches: string[];
}

export interface BranchConflict {
  branchName: string;
  similarity: string;
}

function execGit(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

export function getCurrentBranch(): string {
  return execGit('symbolic-ref --short HEAD') || execGit('rev-parse --short HEAD');
}

export function isMainBranch(branchName: string): boolean {
  return MAIN_BRANCH_NAMES.includes(branchName.toLowerCase());
}

export function hasUncommittedChanges(): boolean {
  const status = execGit('status --porcelain');
  return status.length > 0;
}

export function getRemoteBranches(): string[] {
  const output = execGit('branch -r');
  if (!output) return [];

  return output
    .split('\n')
    .map((b) => b.trim().replace(/^origin\//, ''))
    .filter((b) => b && !b.includes('HEAD'));
}

export function getGitState(): GitState {
  const currentBranch = getCurrentBranch();
  return {
    currentBranch,
    isMainBranch: isMainBranch(currentBranch),
    hasUncommittedChanges: hasUncommittedChanges(),
    remoteBranches: getRemoteBranches(),
  };
}

export function branchExists(branchName: string): boolean {
  const localBranches = execGit('branch --list');
  const remoteBranches = getRemoteBranches();

  const localList = localBranches.split('\n').map((b) => b.trim().replace(/^\*\s*/, ''));

  return localList.includes(branchName) || remoteBranches.includes(branchName);
}

export function createBranch(branchName: string): boolean {
  // Validate branch name to prevent command injection
  if (!/^[a-zA-Z0-9/_-]+$/.test(branchName)) {
    return false;
  }
  try {
    execSync(`git checkout -b ${branchName}`, { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

export function findSimilarBranches(keyword: string, remoteBranches: string[]): BranchConflict[] {
  const normalizedKeyword = keyword.toLowerCase();
  if (!normalizedKeyword) {
    return [];
  }

  const conflicts: BranchConflict[] = [];

  for (const branch of remoteBranches) {
    const normalizedBranch = branch.toLowerCase();
    const branchSuffix = normalizedBranch.split('/').pop() || '';

    if (normalizedBranch.includes(normalizedKeyword) || (branchSuffix && normalizedKeyword.includes(branchSuffix))) {
      conflicts.push({
        branchName: branch,
        similarity: 'keyword match',
      });
    }
  }

  return conflicts;
}

export function generateBranchName(prefix: string, description: string): string {
  const kebab = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, MAX_BRANCH_NAME_LENGTH);

  return `${prefix}/${kebab}`;
}
