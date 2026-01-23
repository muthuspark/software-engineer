# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.18] - 2026-01-23

### Fixed
- Windows compatibility: spawn now uses shell on Windows to find npm global binaries (.cmd wrappers)

## [0.1.17] - 2026-01-23

### Added
- `-p` / `--print` CLI option to pass `-p` flag to Claude CLI
- `SF_PRINT_OUTPUT` environment variable support

## [0.1.16] - 2026-01-23

### Fixed
- Implement step now continues conversation from Understand Codebase step
- Added `continueConversation: true` to prevent redundant codebase analysis

## [0.1.15] - 2026-01-23

### Added
- Understand Codebase step (Step 2/9) - analyzes codebase structure before implementation

### Changed
- Pipeline now has 9 steps: Branch → Understand → Implement → Simplify → Review → SOLID → Test → Commit → Changelog

## [0.1.14] - 2026-01-20

### Fixed
- Claude CLI output now displays in real-time instead of appearing stuck
- Changed stdio from piped to inherited so Claude's interactive UI (spinners, progress) works properly
- Claude CLI requires TTY for rich terminal features; piping stdout caused buffering issues

## [0.1.13] - 2026-01-20

### Fixed
- Smart Branch Management now analyzes requirements even when on a feature branch
- Added branch-requirement mismatch detection with warnings when current branch doesn't match new requirement

### Added
- Adaptive Step Execution (`-a`/`--adaptive`) - AI analyzes requirements and skips irrelevant steps
- Review depth levels (minimal/standard/thorough) based on change complexity and risk
- `SF_ADAPTIVE_EXECUTION` environment variable support
- Smart Branch Management step (Step 1) - automatically creates feature branches when on main/master
- AI-powered requirement analysis to determine change type (feature/fix/refactor/docs/chore)
- Branch naming suggestions based on requirement content
- Detection and warning for potentially conflicting remote branches
- `--skip-branch-management` CLI flag and `SF_SKIP_BRANCH_MANAGEMENT` env var
- Command injection protection for branch creation

### Changed
- Pipeline now has 8 steps: Branch → Implement → Simplify → Review → SOLID → Test → Commit → Changelog

## [0.1.10] - 2026-01-20

### Changed
- Pipeline now runs in non-interactive mode by default (removed `--auto` flag)
- Removed confirmation prompts between steps for streamlined execution

### Removed
- `--auto` / `-a` CLI option (no longer needed)
- `SF_AUTO_MODE` environment variable
- `inquirer` dependency (no longer needed for prompts)

## [0.1.9] - 2026-01-20

### Added
- New Code Simplification step (Step 2) in the pipeline
- Pipeline now has 7 steps: Implement → Simplify → Review → SOLID → Test → Commit → Changelog

### Changed
- Updated all step numbers to reflect the new 7-step pipeline

## [0.1.8] - 2026-01-07

### Changed
- Simplified Claude subprocess handling by removing redundant SIGINT handler
- Prompt now passed directly as argument (matching Python implementation)
- Auto-append exit instruction to prompts for consistent behavior

### Removed
- Removed unused terminal constants (inlined default values)
- Removed redundant SIGINT_CODE constant

## [0.1.7] - 2026-01-07

### Changed
- Added test file to .gitignore

## [0.1.6] - 2026-01-07

### Fixed
- Header box rendering now displays closing borders correctly
- Dry-run commands are now properly logged to file
- Signal handlers no longer register multiple times on repeated pipeline runs
- Control flow safety improved in CLI entry point

### Changed
- Use node-pty for proper terminal emulation with Claude subprocess
- Extract magic numbers to named constants (terminal size, exit codes)
- CLI version now read dynamically from package.json
