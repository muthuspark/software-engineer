import { spawn } from 'child_process';
import type { Config } from '../config.js';
import type { ChangeType } from './branchAnalyzer.js';

const MIN_REVIEW_ITERATIONS = 1;
const MAX_REVIEW_ITERATIONS = 3;
const DEFAULT_REVIEW_ITERATIONS = 2;

export interface StepRecommendation {
  skipSimplify: boolean;
  skipReview: boolean;
  skipSolid: boolean;
  skipTests: boolean;
  skipChangelog: boolean;
  reviewDepth: 'minimal' | 'standard' | 'thorough';
  reviewIterations: number;
  reasoning: string;
}

export interface AdaptiveAnalysis {
  changeType: ChangeType;
  isTrivial: boolean;
  complexity: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  affectedAreas: string[];
  stepRecommendation: StepRecommendation;
}

const ADAPTIVE_ANALYSIS_PROMPT = `Analyze the following requirement and determine which pipeline steps should be executed.

Requirement: "{REQUIREMENT}"

Respond in EXACTLY this format (no markdown, no extra text):
CHANGE_TYPE: <one of: feature, fix, refactor, docs, chore, trivial>
IS_TRIVIAL: <true or false>
COMPLEXITY: <one of: low, medium, high>
RISK_LEVEL: <one of: low, medium, high>
AFFECTED_AREAS: <comma-separated list: code, tests, config, docs, build, deps>
SKIP_SIMPLIFY: <true or false>
SKIP_REVIEW: <true or false>
SKIP_SOLID: <true or false>
SKIP_TESTS: <true or false>
SKIP_CHANGELOG: <true or false>
REVIEW_DEPTH: <one of: minimal, standard, thorough>
REVIEW_ITERATIONS: <1, 2, or 3>
REASONING: <brief one-line explanation for the recommendations>

Guidelines for step skipping:
- Documentation-only changes (docs): skip tests, simplify, and SOLID review
- Config file changes (chore for config): skip SOLID review, reduce review iterations
- Typo fixes or trivial changes: skip most steps, minimal review
- Refactoring with no behavior change: reduce test focus, thorough SOLID review
- New features with business logic: all steps, thorough review
- Bug fixes: standard review, focus on tests
- Build/CI changes: skip SOLID, skip tests unless test config changed

Risk assessment:
- Low: docs, typos, comments, formatting
- Medium: config changes, refactoring, minor features
- High: new features with business logic, bug fixes, dependency changes, security-related

Complexity assessment:
- Low: single file, few lines, isolated change
- Medium: multiple files, moderate scope
- High: many files, architectural impact, complex logic`;

const DEFAULT_STEP_RECOMMENDATION: StepRecommendation = {
  skipSimplify: false,
  skipReview: false,
  skipSolid: false,
  skipTests: false,
  skipChangelog: false,
  reviewDepth: 'standard',
  reviewIterations: DEFAULT_REVIEW_ITERATIONS,
  reasoning: 'Default configuration - standard pipeline execution',
};

const DEFAULT_ADAPTIVE_ANALYSIS: AdaptiveAnalysis = {
  changeType: 'feature',
  isTrivial: false,
  complexity: 'medium',
  riskLevel: 'medium',
  affectedAreas: ['code'],
  stepRecommendation: DEFAULT_STEP_RECOMMENDATION,
};

function extractField(output: string, field: string, pattern: string): string | null {
  const regex = new RegExp(`${field}:\\s*(${pattern})`, 'i');
  const match = output.match(regex);
  return match ? match[1].toLowerCase() : null;
}

function extractBool(output: string, field: string): boolean | null {
  const value = extractField(output, field, 'true|false');
  return value !== null ? value === 'true' : null;
}

function parseAdaptiveResponse(output: string): AdaptiveAnalysis {
  const changeType = (extractField(output, 'CHANGE_TYPE', 'feature|fix|refactor|docs|chore|trivial') as ChangeType) ?? 'feature';
  const isTrivial = extractBool(output, 'IS_TRIVIAL') ?? false;
  const complexity = (extractField(output, 'COMPLEXITY', 'low|medium|high') as 'low' | 'medium' | 'high') ?? 'medium';
  const riskLevel = (extractField(output, 'RISK_LEVEL', 'low|medium|high') as 'low' | 'medium' | 'high') ?? 'medium';

  const areasMatch = output.match(/AFFECTED_AREAS:\s*(.+)/i);
  const affectedAreas = areasMatch ? areasMatch[1].split(',').map((a) => a.trim().toLowerCase()) : ['code'];

  const reviewDepth = (extractField(output, 'REVIEW_DEPTH', 'minimal|standard|thorough') as 'minimal' | 'standard' | 'thorough') ?? 'standard';

  const iterationsMatch = output.match(/REVIEW_ITERATIONS:\s*(\d+)/i);
  const reviewIterations = iterationsMatch
    ? Math.min(Math.max(parseInt(iterationsMatch[1], 10), MIN_REVIEW_ITERATIONS), MAX_REVIEW_ITERATIONS)
    : DEFAULT_REVIEW_ITERATIONS;

  const reasoningMatch = output.match(/REASONING:\s*(.+)/i);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'AI-analyzed step configuration';

  return {
    changeType,
    isTrivial,
    complexity,
    riskLevel,
    affectedAreas,
    stepRecommendation: {
      skipSimplify: extractBool(output, 'SKIP_SIMPLIFY') ?? false,
      skipReview: extractBool(output, 'SKIP_REVIEW') ?? false,
      skipSolid: extractBool(output, 'SKIP_SOLID') ?? false,
      skipTests: extractBool(output, 'SKIP_TESTS') ?? false,
      skipChangelog: extractBool(output, 'SKIP_CHANGELOG') ?? false,
      reviewDepth,
      reviewIterations,
      reasoning,
    },
  };
}

export async function analyzeSteps(requirement: string, config: Config): Promise<AdaptiveAnalysis> {
  const prompt = ADAPTIVE_ANALYSIS_PROMPT.replace('{REQUIREMENT}', requirement);

  const args: string[] = ['--print'];

  if (config.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  args.push(prompt);

  if (config.dryRun) {
    return {
      ...DEFAULT_ADAPTIVE_ANALYSIS,
      stepRecommendation: {
        ...DEFAULT_STEP_RECOMMENDATION,
        reasoning: 'Dry run mode - using default configuration',
      },
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
      if (exitCode === 0 && output.trim()) {
        resolve(parseAdaptiveResponse(output));
      } else {
        resolve(DEFAULT_ADAPTIVE_ANALYSIS);
      }
    });

    child.on('error', () => {
      resolve(DEFAULT_ADAPTIVE_ANALYSIS);
    });
  });
}
