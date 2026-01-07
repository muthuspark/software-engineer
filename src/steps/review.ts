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

function detectNoIssues(output: string): boolean {
  return NO_ISSUES_PATTERNS.some((pattern) => pattern.test(output));
}

export async function stepReview(iteration: number, config: Config): Promise<ReviewResult> {
  logStep('2/6', `CODE REVIEW (Round ${iteration}/${config.reviewIterations})`);

  const prompt = `Review and improve the changes:

## Critical Review Points:
1. **Bugs**: Logic errors, off-by-one, null refs, race conditions
2. **Security**: Input validation, injection, auth issues
3. **Performance**: N+1 queries, unnecessary loops, memory leaks
4. **Maintainability**: Code clarity, naming, complexity

## Action Required:
- FIX any issues found immediately
- Be specific about what you changed and why
- If code is clean, say "No issues found" or "LGTM"`;

  const result = await runClaude({ prompt, continueConversation: true }, config);
  const noIssuesFound = result.success && detectNoIssues(result.output);

  return {
    success: result.success,
    noIssuesFound,
  };
}
