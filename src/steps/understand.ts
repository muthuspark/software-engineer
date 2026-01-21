import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

const UNDERSTAND_CODEBASE_PROMPT = `Goal
Build an internal map of the codebase. Do not change code. Do not refactor. Do not optimize.

Operating mode
Static analysis first. Minimal assumptions. Prefer certainty over completeness.

Required steps

1. Detect codebase type

   * Language(s)
   * Runtime
   * Frameworks
   * Monorepo or single service

2. Identify execution roots

   * Primary entry files
   * CLI commands
   * Server startup paths
   * Test runners

3. Build directory graph

   * Top level folders
   * Purpose of each folder
   * Ownership boundaries if visible

4. Dependency flow analysis

   * Module import graph
   * Direction of dependencies
   * Shared utilities vs feature code

5. Architecture inference

   * Architectural style if evident
   * Layer boundaries
   * Cross layer violations

6. State and data flow

   * Where state lives
   * How data moves between modules
   * Persistence boundaries

7. External interfaces

   * APIs exposed
   * APIs consumed
   * Databases, queues, filesystems

8. Configuration and environment

   * Config files
   * Environment variables
   * Feature flags

9. Change impact map

   * High blast radius files
   * Core abstractions
   * Unsafe modification zones

10. Gaps and unknowns

* Missing docs
* Ambiguous responsibilities
* Implicit behavior

Output format

* Use structured bullet points
* Use short phrases, not prose
* Use file paths when referencing code
* Flag assumptions explicitly
* End with a one page mental model of the system

Constraints

* No code edits
* No speculative refactors
* No style commentary
* No opinions unless clearly labeled as inference

Primary objective
Enable safe future modifications by maximizing structural understanding.`;

export async function stepUnderstandCodebase(config: Config): Promise<boolean> {
  logStep('2/9', 'UNDERSTAND CODEBASE');

  const prompt = `${UNDERSTAND_CODEBASE_PROMPT}

Context: I need to understand this codebase to implement the following requirement:
${config.requirement}

Focus your analysis on areas most relevant to this requirement while still building a complete mental model.`;

  const result = await runClaude({ prompt }, config);
  return result.success;
}
