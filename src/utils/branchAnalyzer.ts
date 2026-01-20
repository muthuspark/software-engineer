import { spawn } from 'child_process';
import type { Config } from '../config.js';

export type ChangeType = 'feature' | 'fix' | 'refactor' | 'docs' | 'chore' | 'trivial';

const MAX_DESCRIPTION_LENGTH = 40;

function sanitizeDescription(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, MAX_DESCRIPTION_LENGTH);
}

export interface BranchAnalysis {
  changeType: ChangeType;
  isTrivial: boolean;
  suggestedBranchName: string;
  branchPrefix: string;
  shortDescription: string;
}

const ANALYSIS_PROMPT = `Analyze the following requirement and determine the type of change it represents.

Requirement: "{REQUIREMENT}"

Respond in EXACTLY this format (no markdown, no extra text):
CHANGE_TYPE: <one of: feature, fix, refactor, docs, chore, trivial>
IS_TRIVIAL: <true or false>
SHORT_DESC: <2-4 word kebab-case description for branch name>

Guidelines:
- feature = new functionality being added
- fix = bug fix or error correction
- refactor = code restructuring without changing behavior
- docs = documentation changes only
- chore = maintenance tasks (deps, config, build)
- trivial = tiny changes like typo fixes, single-line changes

IS_TRIVIAL should be true only for very minor changes that don't need a branch.
SHORT_DESC should be suitable for a branch name like "feature/SHORT_DESC"`;

const DEFAULT_ANALYSIS: BranchAnalysis = {
  changeType: 'feature',
  isTrivial: false,
  suggestedBranchName: 'feature/changes',
  branchPrefix: 'feature',
  shortDescription: 'changes',
};

function parseAnalysisResponse(output: string): BranchAnalysis | null {
  const lines = output.split('\n').filter((line) => line.trim());

  let changeType: ChangeType = 'feature';
  let isTrivial = false;
  let shortDescription = 'changes';

  for (const line of lines) {
    const changeMatch = line.match(/CHANGE_TYPE:\s*(feature|fix|refactor|docs|chore|trivial)/i);
    if (changeMatch) {
      changeType = changeMatch[1].toLowerCase() as ChangeType;
    }

    const trivialMatch = line.match(/IS_TRIVIAL:\s*(true|false)/i);
    if (trivialMatch) {
      isTrivial = trivialMatch[1].toLowerCase() === 'true';
    }

    const descMatch = line.match(/SHORT_DESC:\s*(.+)/i);
    if (descMatch) {
      shortDescription = sanitizeDescription(descMatch[1]);
    }
  }

  const branchPrefix = changeType === 'trivial' ? 'chore' : changeType;

  return {
    changeType,
    isTrivial,
    suggestedBranchName: `${branchPrefix}/${shortDescription}`,
    branchPrefix,
    shortDescription,
  };
}

export async function analyzeRequirement(requirement: string, config: Config): Promise<BranchAnalysis> {
  const prompt = ANALYSIS_PROMPT.replace('{REQUIREMENT}', requirement);

  const args: string[] = ['--print'];

  if (config.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  args.push(prompt);

  if (config.dryRun) {
    return {
      ...DEFAULT_ANALYSIS,
      suggestedBranchName: 'feature/dry-run-changes',
      shortDescription: 'dry-run-changes',
    };
  }

  return new Promise((resolve) => {
    let output = '';

    const child = spawn('claude', args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
    }

    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        const analysis = parseAnalysisResponse(output);
        if (analysis) {
          resolve(analysis);
          return;
        }
      }
      resolve(DEFAULT_ANALYSIS);
    });

    child.on('error', () => {
      resolve(DEFAULT_ANALYSIS);
    });
  });
}
