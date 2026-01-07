# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.6] - 2026-01-07

### Fixed
- Header box rendering now displays closing borders correctly
- Dry-run commands are now properly logged to file
- Signal handlers no longer register multiple times on repeated pipeline runs
- Control flow safety improved in CLI entry point

### Changed
- Extract magic numbers to named constants (BOX_WIDTH, DEFAULT_REVIEW_ITERATIONS)
- Remove shell:true from spawn for improved security
