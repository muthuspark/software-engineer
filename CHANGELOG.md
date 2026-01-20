# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
