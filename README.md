# software-engineer

A CLI tool that automates the software development workflow using Claude AI. It runs a 6-step pipeline to implement features, review code, ensure quality, test, commit, and update changelogs.

## Installation

```bash
npm install -g software-engineer
```

## Prerequisites

- Node.js >= 18.0.0
- [Claude CLI](https://github.com/anthropics/claude-code) installed and configured

## Usage

```bash
sf "<requirement>"
```

### Examples

```bash
# Basic usage
sf "add user authentication with JWT"

# Non-interactive mode (CI/CD friendly)
sf --auto "fix null pointer in auth module"

# Custom review iterations
sf --reviews 3 "refactor database layer"

# Dry run to preview commands
sf --dry-run "add dark mode toggle"

# Skip tests and push
sf --skip-tests --skip-push "update README"

# Log output to file
sf --log pipeline.log "implement caching layer"
```

## Options

| Option | Description |
|--------|-------------|
| `-a, --auto` | Non-interactive mode (skip confirmations) |
| `-d, --dry-run` | Print commands without executing |
| `-r, --reviews <n>` | Number of review iterations (default: 2) |
| `--skip-tests` | Skip the testing step |
| `--skip-push` | Commit but don't push to remote |
| `--log <file>` | Log output to file |
| `--dangerously-skip-permissions` | Skip Claude permission prompts |
| `-h, --help` | Display help |
| `-V, --version` | Display version |

## Environment Variables

All options can be set via environment variables:

| Variable | Description |
|----------|-------------|
| `SF_REVIEW_ITERATIONS` | Number of review iterations |
| `SF_AUTO_MODE` | `true`/`false` for auto mode |
| `SF_DRY_RUN` | `true`/`false` for dry run |
| `SF_LOG_FILE` | Path to log file |
| `SF_SKIP_TESTS` | `true`/`false` to skip tests |
| `SF_SKIP_PUSH` | `true`/`false` to skip push |
| `SF_DANGEROUSLY_SKIP_PERMISSIONS` | `true`/`false` to skip Claude permissions |

Example:
```bash
SF_AUTO_MODE=true SF_REVIEWS=3 sf "add feature X"
```

## Pipeline Steps

### 1. Implement
Takes your requirement and asks Claude to implement it following project conventions.

### 2. Code Review (configurable iterations)
Reviews the implementation for:
- Bugs (logic errors, null refs, race conditions)
- Security issues (injection, auth problems)
- Performance (N+1 queries, memory leaks)
- Maintainability (clarity, naming, complexity)

### 3. SOLID & Clean Code
Ensures compliance with:
- SOLID principles (SRP, OCP, LSP, ISP, DIP)
- Clean code practices (naming, small functions, no magic numbers)

### 4. Testing
- Runs existing tests
- Adds new tests for changed code
- Verifies coverage

### 5. Commit
Creates a well-formatted commit with:
- Conventional commit format
- Clear subject line
- Detailed body explaining why and what

### 6. Changelog
Updates CHANGELOG.md following Keep a Changelog format.

## Interactive Mode

When not using `--auto`, you'll be prompted after each step:
- **Y** (default) - Continue to next step
- **n** - Exit pipeline
- **s** - Skip current step/remaining reviews
- **q** - Quit pipeline

## License

MIT
