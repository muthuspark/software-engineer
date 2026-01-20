const DEFAULT_REVIEW_ITERATIONS = 2;

export interface Config {
  reviewIterations: number;
  dryRun: boolean;
  logFile?: string;
  skipTests: boolean;
  skipPush: boolean;
  dangerouslySkipPermissions: boolean;
  requirement: string;
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
    reviewIterations: parseIntEnv(process.env.SF_REVIEW_ITERATIONS, DEFAULT_REVIEW_ITERATIONS),
    dryRun: parseBoolEnv(process.env.SF_DRY_RUN, false),
    logFile: process.env.SF_LOG_FILE || undefined,
    skipTests: parseBoolEnv(process.env.SF_SKIP_TESTS, false),
    skipPush: parseBoolEnv(process.env.SF_SKIP_PUSH, false),
    dangerouslySkipPermissions: parseBoolEnv(process.env.SF_DANGEROUSLY_SKIP_PERMISSIONS, false),
  };
}

export function mergeConfig(envConfig: Partial<Config>, cliConfig: Partial<Config>): Config {
  return {
    reviewIterations: cliConfig.reviewIterations ?? envConfig.reviewIterations ?? DEFAULT_REVIEW_ITERATIONS,
    dryRun: cliConfig.dryRun ?? envConfig.dryRun ?? false,
    logFile: cliConfig.logFile ?? envConfig.logFile,
    skipTests: cliConfig.skipTests ?? envConfig.skipTests ?? false,
    skipPush: cliConfig.skipPush ?? envConfig.skipPush ?? false,
    dangerouslySkipPermissions: cliConfig.dangerouslySkipPermissions ?? envConfig.dangerouslySkipPermissions ?? false,
    requirement: cliConfig.requirement ?? '',
  };
}
