import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export interface ReviewResult {
  success: boolean;
  noIssuesFound: boolean;
}

// Patterns that indicate no issues were found during review
const NO_ISSUES_PATTERNS = [
  /no\s+issues?\s+(found|detected|identified)/i,
  /code\s+(is\s+)?clean/i,
  /lgtm/i,
  /looks\s+good(\s+to\s+me)?/i,
  /no\s+(changes|modifications)\s+(needed|required|necessary)/i,
  /nothing\s+to\s+(fix|change|improve)/i,
  /all\s+(checks\s+)?pass(ed)?/i,
  /code\s+quality\s+(is\s+)?(good|excellent|solid)/i,
];

export type ReviewDepth = 'minimal' | 'standard' | 'thorough';

function detectNoIssues(output: string): boolean {
  return NO_ISSUES_PATTERNS.some((pattern) => pattern.test(output));
}

function getPromptForDepth(depth: ReviewDepth): string {
  switch (depth) {
    case 'minimal':
      return `Quick review of the changes:

## Focus Areas:
1. **Bugs**: Only obvious logic errors or crashes
2. **Security**: Only critical vulnerabilities

## Action Required:
- FIX only critical issues
- If code is acceptable, say "No issues found" or "LGTM"`;

    case 'thorough':
      return `Thorough code review of all changes:

## Comprehensive Review Points:
1. **Bugs**: Logic errors, edge cases, off-by-one, null refs, race conditions, error handling
2. **Security**: Input validation, injection, auth issues, data exposure, OWASP top 10
3. **Performance**: N+1 queries, unnecessary loops, memory leaks, blocking operations, caching
4. **Maintainability**: Code clarity, naming, complexity, duplication, single responsibility
5. **Testing**: Are edge cases testable? Missing test scenarios?
6. **Architecture**: Does this follow project patterns? Any coupling issues?

## Action Required:
- FIX any issues found immediately
- Be thorough and specific about what you changed and why
- Suggest improvements even if not critical
- If code is clean, say "No issues found" or "LGTM"`;

    case 'standard':
    default:
      return `Review and improve the changes:

## Critical Review Points:
1. **Bugs**: Logic errors, off-by-one, null refs, race conditions
2. **Security**: Input validation, injection, auth issues
3. **Performance**: N+1 queries, unnecessary loops, memory leaks
4. **Maintainability**: Code clarity, naming, complexity

## Action Required:
- FIX any issues found immediately
- Be specific about what you changed and why
- If code is clean, say "No issues found" or "LGTM"`;
  }
}

export async function stepReview(
  iteration: number,
  config: Config,
  depth: ReviewDepth = 'standard'
): Promise<ReviewResult> {
  const depthLabel = depth !== 'standard' ? ` [${depth}]` : '';
  logStep('5/9', `CODE REVIEW (Round ${iteration}/${config.reviewIterations})${depthLabel}`);

  const prompt = getPromptForDepth(depth);
  const result = await runClaude({ prompt, continueConversation: true }, config);
  const noIssuesFound = result.success && detectNoIssues(result.output);

  return {
    success: result.success,
    noIssuesFound,
  };
}
