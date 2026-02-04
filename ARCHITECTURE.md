# Software Engineer - Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Pipeline Execution Flow](#pipeline-execution-flow)
5. [Claude AI Integration](#claude-ai-integration)
6. [Configuration Management](#configuration-management)
7. [Logging and Output](#logging-and-output)
8. [Data Flow](#data-flow)
9. [Key Design Decisions](#key-design-decisions)
10. [Extension Points](#extension-points)

---

## Overview

**Software Engineer** is a CLI tool that automates the software development workflow by orchestrating an AI-powered 8-step pipeline. It leverages Claude AI (via the Claude CLI) to implement features, review code, ensure quality standards, run tests, and manage git operations autonomously.

### Core Value Proposition

- **Automated Development Workflow**: Full lifecycle from feature planning to changelog updates
- **Quality Assurance**: Multi-stage code review, SOLID principles enforcement, and automated testing
- **Autonomous Operation**: Claude is pre-authorized for Edit, Read, and Bash tools by default
- **Smart Execution**: Adaptive pipeline that skips unnecessary steps based on change complexity
- **Real-time Visibility**: Stream-based progress visualization with colorized, emoji-enhanced output

### Technology Stack

- **Runtime**: Node.js >= 18.0.0
- **Language**: TypeScript (ES2022 target, NodeNext modules)
- **AI Integration**: Claude CLI (Anthropic)
- **Process Management**: cross-spawn
- **UI/Output**: chalk for terminal styling
- **CLI Framework**: commander

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Entry Point (index.ts)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Command Parser (commander)                           │  │
│  │  - Argument/Option handling                           │  │
│  │  - Config merging (ENV + CLI)                         │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Pipeline Orchestrator (pipeline.ts)            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Execution Flow Control                               │  │
│  │  - Sequential step execution                          │  │
│  │  - Adaptive execution logic                           │  │
│  │  - Error handling & exit codes                        │  │
│  │  - Signal handling (SIGINT/SIGTERM)                   │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Pipeline Steps (steps/)                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │ Branch Mgmt  │  Implement   │   Simplify   │  Review  │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │    SOLID     │     Test     │    Commit    │Changelog │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Claude AI Integration (claude.ts)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Stream Processing                                    │  │
│  │  - JSON event parsing                                 │  │
│  │  - Tool call visualization                            │  │
│  │  - Real-time progress display                         │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Utility Modules (utils/)                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │     Git      │Branch        │   Step       │  Update  │  │
│  │  Operations  │  Analyzer    │  Analyzer    │ Notifier │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Module Dependencies

```
index.ts
  ├─→ config.ts (configuration management)
  ├─→ pipeline.ts (orchestration)
  │    ├─→ steps/
  │    │    ├─→ branchManagement.ts
  │    │    │    ├─→ utils/branchAnalyzer.ts (AI-powered analysis)
  │    │    │    ├─→ utils/stepAnalyzer.ts (adaptive execution)
  │    │    │    └─→ utils/git.ts (git operations)
  │    │    ├─→ implement.ts
  │    │    ├─→ simplify.ts
  │    │    ├─→ review.ts
  │    │    ├─→ solid.ts
  │    │    ├─→ test.ts
  │    │    ├─→ commit.ts
  │    │    └─→ changelog.ts
  │    └─→ claude.ts (AI integration)
  ├─→ logger.ts (output formatting)
  └─→ utils/updateNotifier.ts (version checking)
```

---

## Core Components

### 1. Entry Point (`index.ts`)

**Responsibilities:**
- CLI interface initialization using commander
- Argument and option parsing
- Configuration merging (environment variables + CLI options)
- Multi-line requirement input handling
- Version update checking
- Pipeline invocation

**Key Features:**
- Interactive prompt for requirements when not provided as argument
- Support for multi-line input (Ctrl+D or "END" to finish)
- Implementation-only mode configuration
- Adaptive execution flag handling

**Configuration Priority:**
```
CLI Options > Environment Variables > Defaults
```

### 2. Pipeline Orchestrator (`pipeline.ts`)

**Responsibilities:**
- Sequential execution of 8 pipeline steps
- Adaptive execution logic (skip unnecessary steps)
- Error handling and graceful failure
- Signal handling for interrupts (SIGINT/SIGTERM)
- Step completion messages

**Execution Modes:**

1. **Standard Mode**: All 8 steps
2. **Implementation-Only Mode**: Only Implement → Review → SOLID (rapid iteration)
3. **Adaptive Mode**: AI-driven step skipping based on change analysis

**Exit Codes:**
- `0`: Success
- `1`: Failure
- `130`: Interrupted (SIGINT)

**Flow Control:**
```typescript
Step 1: Branch Management (skippable)
  └─→ Adaptive Analysis (if enabled)
Step 2: Implement (required)
Step 3: Simplify (skippable)
Step 4: Review Loop (1-3 iterations, early exit if clean)
Step 5: SOLID & Clean Code (skippable)
Step 6: Test (skippable)
Step 7: Commit (skippable in implementation-only)
Step 8: Changelog (skippable)
```

### 3. Configuration Manager (`config.ts`)

**Responsibilities:**
- Environment variable parsing
- Configuration merging and defaults
- Type-safe configuration interface

**Configuration Schema:**
```typescript
interface Config {
  requirement: string;
  reviewIterations: number;        // Default: 2
  dryRun: boolean;                 // Default: false
  skipTests: boolean;              // Default: false
  skipPush: boolean;               // Default: false
  skipBranchManagement: boolean;   // Default: false
  dangerouslySkipPermissions: boolean;  // Default: false
  allowedTools?: string;           // Default: "Edit,Read,Bash"
  logFile?: string;
  adaptiveExecution: boolean;      // Default: false
  implementationOnly: boolean;     // Default: false
}
```

**Permission Management Logic:**
- Default: Auto-approve Edit, Read, Bash tools
- If `dangerouslySkipPermissions`: Skip all permission checks
- Otherwise: Use `allowedTools` configuration

### 4. Claude AI Integration (`claude.ts`)

**Responsibilities:**
- Spawning and managing Claude CLI processes
- Processing streaming JSON output
- Tool call visualization
- Exit code handling

**Stream Processing:**
```
Claude CLI (stream-json output)
  ↓
Line-by-line JSON parsing
  ↓
Event type detection (system/assistant/tool_use)
  ↓
Formatted console output with colors/emojis
```

**Tool Call Visualization Mapping:**
```
Read  → 📖 (cyan)
Write → ✍️  (green)
Edit  → ✏️  (yellow)
Bash  → ⚡ (magenta)
Grep  → 🔍 (blue)
Glob  → 📁 (blue)
```

**Key Features:**
- Deduplication of consecutive identical tool messages
- Buffer management for incomplete JSON lines
- Automatic "exit" instruction appending to prompts
- Continue conversation support (`-c` flag)

### 5. Logger (`logger.ts`)

**Responsibilities:**
- Formatted console output
- File logging (optional)
- ANSI color stripping for log files
- Structured output with timestamps

**Output Types:**
- `logHeader()`: Pipeline banner with version and config
- `logStep()`: Step separators with box drawing
- `logSuccess()`: Success messages (✓)
- `logError()`: Error messages (✗)
- `logWarning()`: Warning messages (⚠)
- `logInfo()`: Info messages (▶)
- `logDryRun()`: Dry run command preview

**Box Drawing:**
```
╔═════════════════════════════════════╗
║   SOFTWARE FACTORY PIPELINE v0.1.23 ║
║      Built by Muthukrishnan         ║
╠═════════════════════════════════════╣
║ Reviews: 2 | Dry-run: false         ║
╚═════════════════════════════════════╝
```

---

## Pipeline Execution Flow

### Step 1: Smart Branch Management (`steps/branchManagement.ts`)

**Purpose:** Analyze requirement and create appropriate feature branches

**Process:**
1. **Adaptive Analysis** (if enabled):
   - Call `analyzeSteps()` to determine step execution strategy
   - Parse AI response for complexity, risk, and step recommendations

2. **Git State Check**:
   - Detect current branch
   - Identify if on main/master branch

3. **Requirement Analysis**:
   - Call Claude with structured prompt
   - Parse change type: feature/fix/refactor/docs/chore/trivial
   - Generate suggested branch name

4. **Branch Decision Logic**:
   - If not on main and current branch matches requirement → Continue
   - If not on main and branch doesn't match → Warn but continue
   - If on main and trivial change → Stay on main
   - If on main and non-trivial → Create feature branch

5. **Conflict Detection**:
   - Search for similar branch names
   - Warn about potential conflicts

6. **Branch Creation**:
   - Generate unique branch name with counter if needed
   - Execute `git checkout -b <branch-name>`

**Branch Naming Convention:**
```
<type>/<short-description>[-<counter>]

Examples:
- feature/user-authentication
- fix/login-validation-bug-1
- refactor/database-layer
- docs/api-documentation
```

### Step 2: Implement (`steps/implement.ts`)

**Purpose:** Execute the main implementation task

**Prompt Structure:**
```
{requirement}

## Implementation Guidelines:
- First, understand the codebase structure
- Write clean, idiomatic code following project conventions
- Handle edge cases and errors appropriately
- Add necessary comments for complex logic
- Keep changes focused and minimal
```

**Claude's Autonomy:**
- Full access to Edit, Read, Bash tools (by default)
- Can explore codebase, modify files, run commands
- Expected to understand existing patterns and follow them

### Step 3: Simplify (`steps/simplify.ts`)

**Purpose:** Refine implementation for clarity and consistency

**Focus Areas:**
- Follow project standards (ES modules, explicit types)
- Enhance clarity (avoid nested ternaries)
- Remove redundant abstractions
- Ensure consistent formatting

**Skipped When:**
- Implementation-only mode
- Adaptive execution determines it's unnecessary (docs-only changes)

### Step 4: Review Loop (`steps/review.ts`)

**Purpose:** Multi-iteration code review with configurable depth

**Review Depths:**

1. **Minimal** (for low-risk changes):
   - Only obvious logic errors
   - Only critical security vulnerabilities

2. **Standard** (default):
   - Bugs: Logic errors, null refs, race conditions
   - Security: Input validation, injection, auth issues
   - Performance: N+1 queries, memory leaks
   - Maintainability: Code clarity, naming

3. **Thorough** (for high-risk changes):
   - All standard checks plus:
   - Edge case testing coverage
   - Architecture pattern compliance
   - Coupling issues
   - Performance optimizations

**Early Exit Logic:**
- If Claude responds with "No issues found" or "LGTM"
- Detected via pattern matching
- Skips remaining review iterations

**Iteration Count:**
- Configured via CLI: `--reviews <n>` (1-3)
- Adaptive mode can override based on change analysis
- Default: 2 iterations

### Step 5: SOLID & Clean Code (`steps/solid.ts`)

**Purpose:** Ensure architectural quality and maintainability

**Verification Points:**
- Single Responsibility Principle
- Open/Closed Principle
- Liskov Substitution Principle
- Interface Segregation Principle
- Dependency Inversion Principle
- Clean Code practices (naming, function size, magic numbers)

**Skipped When:**
- Implementation-only mode
- Adaptive execution (docs, config-only changes)

### Step 6: Test (`steps/test.ts`)

**Purpose:** Run existing tests and add new test coverage

**Process:**
1. Run existing test suite
2. Verify all tests pass
3. Add tests for new/changed code
4. Ensure adequate coverage

**Skipped When:**
- `--skip-tests` flag
- Implementation-only mode
- Adaptive execution (docs-only, build changes without test config)

### Step 7: Commit (`steps/commit.ts`)

**Purpose:** Create well-formatted git commit

**Commit Format:**
```
<type>(<scope>): <subject>

<body explaining why and what>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Commit Message Standards:**
- Conventional commit format
- Clear, concise subject line
- Detailed body explaining rationale
- Co-authored attribution to Claude

**Skipped When:**
- Implementation-only mode
- User wants manual commit control

### Step 8: Changelog (`steps/changelog.ts`)

**Purpose:** Update CHANGELOG.md following Keep a Changelog format

**Format:**
```markdown
## [Unreleased]

### Added
- New features

### Changed
- Modifications to existing features

### Fixed
- Bug fixes

### Removed
- Removed features
```

**Skipped When:**
- Implementation-only mode
- Adaptive execution (trivial changes, config-only)

---

## Claude AI Integration

### Communication Protocol

**Request Flow:**
```
Pipeline Step
  ↓
runClaude({ prompt, continueConversation? }, config)
  ↓
Spawn process: claude [args] <prompt>
  ↓
Stream JSON output parsing
  ↓
Real-time console visualization
  ↓
Exit code → Result
```

### Claude CLI Arguments

**Permission Control:**
```bash
# Default mode
claude --allowedTools "Edit,Read,Bash" -p --output-format=stream-json --verbose <prompt>

# Dangerous mode (full autonomy)
claude --dangerously-skip-permissions -p --output-format=stream-json --verbose <prompt>
```

**Continue Conversation:**
```bash
# For steps that build on previous context (review, SOLID)
claude -c -p --output-format=stream-json --verbose <prompt>
```

### Stream JSON Event Types

**System Events:**
```json
{
  "type": "system",
  "subtype": "init"
}
```

**Assistant Messages:**
```json
{
  "type": "assistant",
  "message": {
    "content": [
      {
        "type": "text",
        "text": "I'll implement the feature..."
      },
      {
        "type": "tool_use",
        "name": "Read",
        "id": "...",
        "input": { "file_path": "/path/to/file" }
      }
    ]
  }
}
```

### Tool Call Processing

**Formatting Logic:**
```typescript
formatToolCall(name: string, input: unknown): string
  ├─→ Read:  "📖 Reading: <file_path>"
  ├─→ Write: "✍️  Writing: <file_path>"
  ├─→ Edit:  "✏️  Editing: <file_path>"
  ├─→ Bash:  "⚡ Running: <description>"
  ├─→ Grep:  "🔍 Searching: <pattern>"
  └─→ Glob:  "📁 Finding: <pattern>"
```

**Deduplication:**
- Tracks last printed message
- Skips consecutive identical tool calls (prevents spam)
- Resets after text messages

---

## Configuration Management

### Environment Variables

All CLI options can be set via environment variables:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SF_REVIEW_ITERATIONS` | number | 2 | Review iteration count |
| `SF_DRY_RUN` | boolean | false | Preview mode |
| `SF_SKIP_TESTS` | boolean | false | Skip testing step |
| `SF_SKIP_PUSH` | boolean | false | Commit without push |
| `SF_SKIP_BRANCH_MANAGEMENT` | boolean | false | Skip branch creation |
| `SF_ALLOWED_TOOLS` | string | "Edit,Read,Bash" | Claude tool permissions |
| `SF_DANGEROUSLY_SKIP_PERMISSIONS` | boolean | false | Skip all permissions |
| `SF_ADAPTIVE_EXECUTION` | boolean | false | Enable AI-driven step optimization |
| `SF_IMPLEMENTATION_ONLY` | boolean | false | Rapid iteration mode |
| `SF_LOG_FILE` | string | undefined | Log output file path |

### Configuration Merging Strategy

**Priority Order:**
```
1. CLI Arguments (highest priority)
   ↓
2. Environment Variables
   ↓
3. Default Values (lowest priority)
```

**Implementation:**
```typescript
mergeConfig(envConfig: Partial<Config>, cliConfig: Partial<Config>): Config
  └─→ cliConfig.field ?? envConfig.field ?? DEFAULT_VALUE
```

### Special Configuration Rules

**Implementation-Only Mode:**
```typescript
if (config.implementationOnly) {
  config.skipBranchManagement = true;
  config.skipTests = true;
  config.adaptiveExecution = false;  // Override adaptive mode
}
```

**Permission Management:**
```typescript
if (config.dangerouslySkipPermissions) {
  config.allowedTools = undefined;  // Ignored when dangerous mode enabled
}
```

---

## Logging and Output

### Console Output Hierarchy

**1. Header (once per run):**
```
╔═══════════════════════════════════════════════════════════╗
║          SOFTWARE FACTORY PIPELINE v0.1.23                ║
║              Built by Muthukrishnan                       ║
╠═══════════════════════════════════════════════════════════╣
║ Reviews: 2 | Dry-run: false                               ║
║ 🔓 Allowed tools: Edit,Read,Bash                          ║
╚═══════════════════════════════════════════════════════════╝
```

**2. Step Headers:**
```
┌──────────────────────────────────────────────────────────┐
│ STEP 2/8: IMPLEMENT REQUIREMENT                          │
└──────────────────────────────────────────────────────────┘
```

**3. Step Messages:**
```
[2026-02-04 10:30:15] ▶ Calling Claude...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Claude is ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Reading: src/index.ts
✏️  Editing: src/index.ts
⚡ Running: Run TypeScript compiler
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2026-02-04 10:30:45] ✓ Claude completed
```

**4. Completion Message:**
```
✓ Pipeline completed successfully

OR (implementation-only mode):

✓ Implementation-only pipeline completed successfully
⚠ Changes are not committed - review and commit manually when ready
```

### File Logging

**When Enabled:**
```bash
sf --log pipeline.log "requirement"
```

**Format:**
- Timestamps on all log lines
- ANSI codes stripped
- All console output captured
- Box drawing characters preserved

---

## Data Flow

### Request Processing Flow

```
1. User Input
   ↓
   requirement: string
   options: CLI flags
   ↓

2. Configuration Assembly
   ↓
   ENV vars → Partial<Config>
   CLI args → Partial<Config>
   ↓
   mergeConfig() → Config
   ↓

3. Pipeline Initialization
   ↓
   setLogFile() (if configured)
   register signal handlers
   display header
   ↓

4. Step Execution Loop
   ↓
   For each step:
     ├─→ Check skip conditions
     ├─→ logStep()
     ├─→ Prepare prompt
     ├─→ runClaude()
     │    ├─→ Spawn child process
     │    ├─→ Stream JSON events
     │    ├─→ Process tool calls
     │    └─→ Wait for exit
     ├─→ Check result
     └─→ Continue or exit
   ↓

5. Completion
   ↓
   Display summary
   Exit with appropriate code
```

### Claude Interaction Pattern

**Single-Shot Steps (Implement, Simplify, Test, Commit, Changelog):**
```
Step → New Claude session → Execute → Exit → Result
```

**Conversational Steps (Review, SOLID):**
```
Step → Continue previous session → Review → Fix → Exit → Result
```

**Analytical Steps (Branch Analysis, Step Analysis):**
```
Step → Claude --print mode → Parse output → Continue
```

### Git Integration Flow

```
1. Branch Management
   ↓
   getGitState()
   ├─→ Current branch
   ├─→ Main branch detection
   └─→ Remote branches
   ↓
   analyzeRequirement() → BranchAnalysis
   ↓
   Decision logic
   ↓
   createBranch() if needed
   ↓

2. Throughout Pipeline
   ↓
   Claude can execute git commands via Bash tool
   ├─→ git add
   ├─→ git status
   └─→ git diff
   ↓

3. Commit Step
   ↓
   Claude executes:
   ├─→ git add <files>
   ├─→ git commit -m "..."
   └─→ git push (unless --skip-push)
```

---

## Key Design Decisions

### 1. Claude CLI as External Process

**Decision:** Spawn Claude CLI as child process rather than SDK integration

**Rationale:**
- Leverages official CLI with full feature support
- Automatic updates via Claude CLI
- Consistent user experience with standalone Claude
- Stream-based output for real-time progress
- Built-in permission management

**Tradeoffs:**
- Requires Claude CLI installation
- Process spawn overhead
- Depends on Claude CLI stability

### 2. Default Tool Permissions

**Decision:** Auto-approve Edit, Read, Bash by default

**Rationale:**
- Pipeline needs autonomous operation
- User explicitly invokes tool with intent
- Removes friction from development workflow
- Configurable for security-sensitive environments

**Safety Measures:**
- Clear documentation of permission model
- `--dangerously-skip-permissions` flag naming
- Dry-run mode for preview
- Source code transparency

### 3. Stream-Based Progress Visualization

**Decision:** Parse streaming JSON output for real-time display

**Rationale:**
- User visibility into long-running operations
- Better UX than batch output at end
- Tool call deduplication prevents spam
- Colored/emoji output increases clarity

**Implementation:**
- `--output-format=stream-json` flag
- Line-by-line JSON parsing
- Event-based message routing
- Buffer management for partial lines

### 4. Multi-Mode Execution

**Decision:** Support standard, implementation-only, and adaptive modes

**Rationale:**
- Different use cases require different workflows
- Implementation-only for rapid iteration
- Standard for full quality assurance
- Adaptive for intelligent optimization

**Mode Selection:**
```
--implementation-only: Fast iteration, skip commit
--adaptive: AI-optimized step execution
(default): Full 8-step pipeline
```

### 5. Sequential Step Execution

**Decision:** Execute steps sequentially, not in parallel

**Rationale:**
- Each step depends on previous step completion
- Claude needs conversational context from prior steps
- Git operations must be sequential
- Simpler error handling and recovery

**Optimization:**
- Early exit in review loop
- Adaptive step skipping
- Minimal review depth for low-risk changes

### 6. TypeScript with ES Modules

**Decision:** Use TypeScript with NodeNext module resolution

**Rationale:**
- Type safety reduces runtime errors
- Modern ES module syntax
- Better IDE support
- Future-proof module system

**Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### 7. Minimal Dependencies

**Decision:** Keep dependency count very low (3 runtime deps)

**Rationale:**
- Reduced attack surface
- Faster installation
- Fewer breaking changes
- Simpler maintenance

**Dependencies:**
- `chalk`: Terminal styling (widely adopted, stable)
- `commander`: CLI framework (industry standard)
- `cross-spawn`: Cross-platform process spawning (essential)

---

## Extension Points

### Adding New Pipeline Steps

**Location:** `src/steps/<step-name>.ts`

**Template:**
```typescript
import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepMyFeature(config: Config): Promise<boolean> {
  logStep('X/Y', 'MY FEATURE STEP');

  const prompt = `Your detailed prompt here...`;

  const result = await runClaude(
    { prompt, continueConversation: false },
    config
  );

  return result.success;
}
```

**Integration:**
1. Export from `src/steps/index.ts`
2. Import in `src/pipeline.ts`
3. Add to execution sequence
4. Add skip logic if needed

### Adding Configuration Options

**Steps:**

1. **Add to Config interface** (`src/config.ts`):
```typescript
export interface Config {
  // ... existing fields
  myNewOption: boolean;
}
```

2. **Add environment variable support**:
```typescript
export function loadConfigFromEnv(): Partial<Config> {
  return {
    // ... existing
    myNewOption: parseBoolEnv(process.env.SF_MY_NEW_OPTION, false),
  };
}
```

3. **Add CLI flag** (`src/index.ts`):
```typescript
program
  .option('--my-new-option', 'Description of option')
```

4. **Update merge logic**:
```typescript
const config = mergeConfig(envConfig, {
  // ... existing
  myNewOption: options.myNewOption ?? undefined,
});
```

### Customizing Review Prompts

**Location:** `src/steps/review.ts`

**Function:** `getPromptForDepth(depth: ReviewDepth): string`

**Customization:**
```typescript
function getPromptForDepth(depth: ReviewDepth): string {
  switch (depth) {
    case 'minimal':
      return `Your custom minimal review prompt...`;
    case 'thorough':
      return `Your custom thorough review prompt...`;
    case 'standard':
    default:
      return `Your custom standard review prompt...`;
  }
}
```

### Adding New Tool Visualizations

**Location:** `src/claude.ts`

**Function:** `formatToolCall(name: string, input: unknown): string`

**Example:**
```typescript
function formatToolCall(name: string, input: unknown): string {
  // ... existing mappings

  if (name === 'MyNewTool' && input && typeof input === 'object' && 'param' in input) {
    return colorFn(`🔧 My Tool: ${input.param}`);
  }

  return colorFn(`🔧 ${name}`);
}
```

### Adding Utility Functions

**Location:** `src/utils/<utility-name>.ts`

**Categories:**
- `git.ts`: Git operations
- `branchAnalyzer.ts`: Branch name/type analysis
- `stepAnalyzer.ts`: Adaptive execution analysis
- `updateNotifier.ts`: Version checking

**Pattern:**
```typescript
// Export functions that return promises or values
// Keep functions focused and testable
// Handle errors gracefully

export async function myUtility(param: string): Promise<Result> {
  // Implementation
}
```

### Implementing New Execution Modes

**Location:** `src/pipeline.ts`

**Steps:**

1. **Add config option** (see "Adding Configuration Options")

2. **Add mode detection logic**:
```typescript
if (config.myNewMode) {
  displayMyNewModeBanner();
}
```

3. **Add step skip logic**:
```typescript
const shouldSkipStep = config.myNewMode || otherCondition;

if (shouldSkipStep) {
  logInfo('Step skipped (my-new-mode)');
} else {
  await stepFunction(config);
}
```

4. **Add completion message**:
```typescript
function displayCompletionMessage(config: Config): void {
  if (config.myNewMode) {
    console.log(chalk.green('\n✓ My new mode completed\n'));
  } else {
    // ... existing
  }
}
```

### Customizing Logger Output

**Location:** `src/logger.ts`

**Customization Points:**
- `BOX_WIDTH`: Change box width
- `logHeader()`: Customize banner appearance
- `logStep()`: Modify step separators
- Color schemes in individual log functions

**Example:**
```typescript
export function logStep(stepNum: string, title: string): void {
  const line = '═'.repeat(BOX_WIDTH);  // Change to '─' for thinner line
  console.log();
  console.log(chalk.magenta(`╔${line}╗`));  // Change color
  console.log(chalk.magenta('║') + ' ' + chalk.yellow(`STEP ${stepNum}:`) + ' ' + title);
  console.log(chalk.magenta(`╚${line}╝`));
  console.log();
}
```

---

## Appendix: File Structure

```
software-engineer/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── pipeline.ts           # Pipeline orchestration
│   ├── config.ts             # Configuration management
│   ├── claude.ts             # Claude AI integration
│   ├── logger.ts             # Logging utilities
│   ├── steps/
│   │   ├── index.ts          # Step exports
│   │   ├── branchManagement.ts
│   │   ├── implement.ts
│   │   ├── simplify.ts
│   │   ├── review.ts
│   │   ├── solid.ts
│   │   ├── test.ts
│   │   ├── commit.ts
│   │   └── changelog.ts
│   └── utils/
│       ├── git.ts            # Git operations
│       ├── branchAnalyzer.ts # Branch analysis
│       ├── stepAnalyzer.ts   # Adaptive execution
│       └── updateNotifier.ts # Version checking
├── dist/                     # Compiled JavaScript
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
└── ARCHITECTURE.md           # This document
```

---

## Conclusion

The Software Engineer CLI tool is architected as a robust, modular pipeline orchestrator that leverages Claude AI for autonomous software development tasks. Its design emphasizes:

- **Modularity**: Clear separation of concerns across components
- **Extensibility**: Well-defined extension points for customization
- **Transparency**: Real-time visibility into AI operations
- **Safety**: Configurable permission model with sensible defaults
- **Flexibility**: Multiple execution modes for different workflows

The architecture supports both rapid iteration (implementation-only mode) and comprehensive quality assurance (full pipeline mode), making it suitable for various development scenarios.
