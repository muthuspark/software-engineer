const DEFAULT_REVIEW_ITERATIONS = 2;
export const AGENTS = ['codex', 'claude'] as const;

export const VALID_STAGES = [
  'implement',
  'simplify',
  'review',
  'clean-code',
  'test',
  'commit',
  'changelog',
] as const;

export type StageName = typeof VALID_STAGES[number];
export type Agent = typeof AGENTS[number];

export interface Config {
  agent: Agent;
  reviewIterations: number;
  dryRun: boolean;
  logFile?: string;
  skipTests: boolean;
  skipPush: boolean;
  skipBranchManagement: boolean;
  dangerouslySkipPermissions: boolean;
  allowedTools?: string;
  requirement: string;
  adaptiveExecution: boolean;
  implementationOnly: boolean;
  runStages?: StageName[];
}

function parseAgent(value: string | undefined, source: string): Agent | undefined {
  if (value === undefined) return undefined;
  if ((AGENTS as readonly string[]).includes(value)) return value as Agent;
  throw new Error(`Invalid ${source}: "${value}". Expected "codex" or "claude".`);
}

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function loadConfigFromEnv(): Partial<Config> {
  return {
    agent: parseAgent(process.env.SF_AGENT, 'SF_AGENT'),
    reviewIterations: parseIntEnv(process.env.SF_REVIEW_ITERATIONS, DEFAULT_REVIEW_ITERATIONS),
    dryRun: parseBoolEnv(process.env.SF_DRY_RUN, false),
    logFile: process.env.SF_LOG_FILE || undefined,
    skipTests: parseBoolEnv(process.env.SF_SKIP_TESTS, false),
    skipPush: parseBoolEnv(process.env.SF_SKIP_PUSH, false),
    skipBranchManagement: parseBoolEnv(process.env.SF_SKIP_BRANCH_MANAGEMENT, false),
    dangerouslySkipPermissions: parseBoolEnv(process.env.SF_DANGEROUSLY_SKIP_PERMISSIONS, false),
    allowedTools: process.env.SF_ALLOWED_TOOLS || undefined,
    adaptiveExecution: parseBoolEnv(process.env.SF_ADAPTIVE_EXECUTION, false),
    implementationOnly: parseBoolEnv(process.env.SF_IMPLEMENTATION_ONLY, false),
  };
}

export function mergeConfig(envConfig: Partial<Config>, cliConfig: Partial<Config>): Config {
  const dangerouslySkipPermissions = cliConfig.dangerouslySkipPermissions ?? envConfig.dangerouslySkipPermissions ?? false;

  // Claude-only default; Codex ignores allowedTools.
  const allowedTools = dangerouslySkipPermissions
    ? undefined
    : (cliConfig.allowedTools ?? envConfig.allowedTools ?? 'Edit,Read,Bash');

  return {
    agent: cliConfig.agent ?? envConfig.agent ?? 'codex',
    reviewIterations: cliConfig.reviewIterations ?? envConfig.reviewIterations ?? DEFAULT_REVIEW_ITERATIONS,
    dryRun: cliConfig.dryRun ?? envConfig.dryRun ?? false,
    logFile: cliConfig.logFile ?? envConfig.logFile,
    skipTests: cliConfig.skipTests ?? envConfig.skipTests ?? false,
    skipPush: cliConfig.skipPush ?? envConfig.skipPush ?? false,
    skipBranchManagement: cliConfig.skipBranchManagement ?? envConfig.skipBranchManagement ?? false,
    dangerouslySkipPermissions,
    allowedTools,
    requirement: cliConfig.requirement ?? '',
    adaptiveExecution: cliConfig.adaptiveExecution ?? envConfig.adaptiveExecution ?? false,
    implementationOnly: cliConfig.implementationOnly ?? envConfig.implementationOnly ?? false,
    runStages: cliConfig.runStages,
  };
}
