# Implementation Plan: Implementation-Only Mode Flag

## Overview
Add a `--implementation-only` flag that runs only 3 steps: Implement → Code Review → SOLID Design. This mode skips branch management, simplification, testing, commit, and changelog steps, allowing developers to iterate quickly on code quality without git operations.

## Design Decisions

### Flag Behavior
- **Runs**: Implement (step 2), Code Review (step 4), SOLID (step 5)
- **Skips**: Branch Management (step 1), Simplify (step 3), Testing (step 6), Commit (step 7), Changelog (step 8)
- **Precedence**: Implementation-only mode takes precedence over `--adaptive` flag (with warning)
- **Compatible with**: `--dry-run`, `--reviews <n>`, `--dangerously-skip-permissions`, `--log`

### Rationale
- Provides a focused "code quality" workflow without git operations
- Users can iterate quickly and commit manually when ready
- Follows existing naming convention (verbose, hyphenated)
- Consistent with how other skip flags work in the system

## Implementation Steps

### 1. Update Config System (`src/config.ts`)
Add `implementationOnly` property to the Config interface:

```typescript
export interface Config {
  reviewIterations: number;
  dryRun: boolean;
  logFile?: string;
  skipTests: boolean;
  skipPush: boolean;
  skipBranchManagement: boolean;
  dangerouslySkipPermissions: boolean;
  requirement: string;
  adaptiveExecution: boolean;
  implementationOnly: boolean;  // NEW
}
```

Add environment variable parsing in `loadConfigFromEnv()`:
```typescript
implementationOnly: parseBoolEnv(process.env.SF_IMPLEMENTATION_ONLY, false),
```

Add to `mergeConfig()`:
```typescript
implementationOnly: cliConfig.implementationOnly ?? envConfig.implementationOnly ?? false,
```

### 2. Add CLI Flag (`src/index.ts`)
Add option to Commander.js program (around line 59):
```typescript
.option('--implementation-only', 'Run only: Implement → Review → SOLID (skips branch, tests, commit)')
```

Add to cliConfig object (around line 81):
```typescript
implementationOnly: options.implementationOnly ?? undefined,
```

Add conflict detection after config merge (around line 84):
```typescript
// Handle implementation-only mode
if (config.implementationOnly) {
  config.skipBranchManagement = true;
  config.skipTests = true;

  // Warn if adaptive was requested but will be overridden
  if (config.adaptiveExecution && (options.adaptive || process.env.SF_ADAPTIVE_EXECUTION === 'true')) {
    console.log(chalk.yellow('⚠ Implementation-only mode overrides --adaptive flag'));
  }
  config.adaptiveExecution = false;
}
```

### 3. Update Pipeline Logic (`src/pipeline.ts`)
Add mode announcement after logHeader (around line 42):
```typescript
// Display implementation-only mode banner if enabled
if (config.implementationOnly) {
  console.log(chalk.cyan('▶ Running in IMPLEMENTATION-ONLY mode'));
  console.log(chalk.cyan('▶ Steps: Implement → Review → SOLID'));
  console.log(chalk.dim('▶ Skipping: Branch Management, Simplify, Tests, Commit, Changelog\n'));
}
```

Modify step 1 (Branch Management) to skip when in implementation-only mode:
```typescript
// Step 1: Smart Branch Management (skip in implementation-only mode)
let adaptive: AdaptiveAnalysis | null = null;
let rec = null;

if (config.implementationOnly) {
  logInfo('Branch management step skipped (implementation-only mode)');
} else if (config.skipBranchManagement) {
  logInfo('Branch management step skipped (--skip-branch-management)');
} else {
  const branchResult = await stepBranchManagement(config);
  if (!branchResult.success) {
    console.log(chalk.red('\nBranch management step failed. Exiting.'));
    process.exit(1);
  }
  adaptive = branchResult.adaptiveAnalysis;
  rec = adaptive?.stepRecommendation;
}
```

Update step 3 (Simplify) skip logic:
```typescript
// Step 3: Simplify (can be skipped by adaptive execution or implementation-only mode)
if (config.implementationOnly) {
  logInfo('Simplify step skipped (implementation-only mode)');
} else if (rec?.skipSimplify) {
  logInfo('Simplify step skipped (adaptive execution)');
} else {
  // existing simplify logic...
}
```

Update step 7 (Testing) skip logic:
```typescript
// Step 7: Test (can be skipped by implementation-only, adaptive execution, or CLI flag)
let skipTestsReason: string | null = null;
if (config.implementationOnly) {
  skipTestsReason = 'implementation-only mode';
} else if (rec?.skipTests) {
  skipTestsReason = 'adaptive execution';
} else if (config.skipTests) {
  skipTestsReason = '--skip-tests';
}
// existing skip/run logic...
```

Update step 8 (Commit) to skip in implementation-only mode:
```typescript
// Step 8: Commit (skip in implementation-only mode)
if (config.implementationOnly) {
  logInfo('Commit step skipped (implementation-only mode)');
} else {
  const commitSuccess = await stepCommit(config);
  if (!commitSuccess) {
    console.log(chalk.red('\nCommit step failed. Exiting.'));
    process.exit(1);
  }
}
```

Update step 9 (Changelog) skip logic:
```typescript
// Step 9: Changelog (can be skipped by adaptive execution or implementation-only mode)
if (config.implementationOnly) {
  logInfo('Changelog step skipped (implementation-only mode)');
} else if (rec?.skipChangelog) {
  logInfo('Changelog step skipped (adaptive execution)');
} else {
  // existing changelog logic...
}
```

Update completion message:
```typescript
if (config.implementationOnly) {
  console.log(chalk.green('\n✓ Implementation-only pipeline completed successfully'));
  console.log(chalk.yellow('⚠ Changes are not committed - review and commit manually when ready\n'));
} else {
  console.log(chalk.green('\n✓ Pipeline completed successfully\n'));
}
```

### 4. Update Logger Header (`src/logger.ts`)
Modify `logHeader` function signature and implementation to show mode:
```typescript
export function logHeader(config: {
  reviewIterations: number;
  dryRun: boolean;
  dangerouslySkipPermissions: boolean;
  implementationOnly: boolean;  // NEW
}): void {
  // ... existing header code ...

  // Update config line to show mode
  let configLine = ` Reviews: ${config.reviewIterations} | Dry-run: ${config.dryRun}`;
  if (config.implementationOnly) {
    configLine += ' | Mode: implementation-only';
  }
  console.log(chalk.green('║') + configLine.padEnd(BOX_WIDTH) + chalk.green('║'));

  // ... rest of header code ...
}
```

## Critical Files to Modify
- `/Users/Muthu.krishnan/code/hello/software-engineer/src/config.ts` - Add implementationOnly to Config interface and parsing logic
- `/Users/Muthu.krishnan/code/hello/software-engineer/src/index.ts` - Add CLI flag and conflict detection
- `/Users/Muthu.krishnan/code/hello/software-engineer/src/pipeline.ts` - Implement skip logic for 5 steps
- `/Users/Muthu.krishnan/code/hello/software-engineer/src/logger.ts` - Update header to show mode

## User Experience

### Command Usage
```bash
# Basic usage
sf --implementation-only "add validation to user input"

# With review iterations
sf --implementation-only --reviews 1 "fix bug in calculation"

# With dry-run
sf --implementation-only --dry-run "refactor auth logic"

# Environment variable
SF_IMPLEMENTATION_ONLY=true sf "add error handling"
```

### Expected Output
```
╔══════════════════════════════════════════════════════════════╗
║        SOFTWARE FACTORY PIPELINE v0.1.22                     ║
║              Built by Muthukrishnan                          ║
╠══════════════════════════════════════════════════════════════╣
║ Reviews: 2 | Dry-run: false | Mode: implementation-only     ║
╚══════════════════════════════════════════════════════════════╝

▶ Running in IMPLEMENTATION-ONLY mode
▶ Steps: Implement → Review → SOLID
▶ Skipping: Branch Management, Simplify, Tests, Commit, Changelog

Starting pipeline for: add validation to user input
▶ Branch management step skipped (implementation-only mode)

┌────────────────────────────────────────────────────────────┐
│ STEP 2/8: IMPLEMENT REQUIREMENT
└────────────────────────────────────────────────────────────┘
[implementation output...]

▶ Simplify step skipped (implementation-only mode)

┌────────────────────────────────────────────────────────────┐
│ STEP 4/8: CODE REVIEW (Iteration 1/2)
└────────────────────────────────────────────────────────────┘
[review output...]

┌────────────────────────────────────────────────────────────┐
│ STEP 5/8: SOLID PRINCIPLES & CLEAN CODE
└────────────────────────────────────────────────────────────┘
[SOLID review output...]

▶ Test step skipped (implementation-only mode)
▶ Commit step skipped (implementation-only mode)
▶ Changelog step skipped (implementation-only mode)

✓ Implementation-only pipeline completed successfully
⚠ Changes are not committed - review and commit manually when ready
```

## Verification Plan

### Manual Testing
1. **Basic functionality**:
   ```bash
   sf --implementation-only "add a console.log statement"
   ```
   - Verify only steps 2, 4, 5 execute
   - Verify completion message warns about uncommitted changes

2. **With other flags**:
   ```bash
   sf --implementation-only --reviews 1 "test requirement"
   ```
   - Verify review runs only 1 iteration

3. **Conflict with adaptive**:
   ```bash
   sf --implementation-only --adaptive "test requirement"
   ```
   - Verify warning message appears
   - Verify adaptive execution doesn't activate

4. **Environment variable**:
   ```bash
   SF_IMPLEMENTATION_ONLY=true sf "test requirement"
   ```
   - Verify mode activates from env var

5. **Dry run mode**:
   ```bash
   sf --implementation-only --dry-run "test requirement"
   ```
   - Verify commands are previewed, not executed

### Expected Outcomes
- Only 3 steps execute: Implement, Code Review, SOLID Design
- No git operations occur (no branch switching, no commits)
- Header shows "Mode: implementation-only"
- Skip messages appear for 5 skipped steps
- Completion message warns about uncommitted changes
- Review iterations respect `--reviews` flag
- Adaptive execution is disabled with warning if requested

### Edge Cases to Test
- Using `--implementation-only` with `--skip-tests` (redundant but harmless)
- Using `--implementation-only` with `--skip-branch-management` (redundant but harmless)
- Review finding no issues (should still complete successfully)
- Any step failing (should exit with error as usual)
