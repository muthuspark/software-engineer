import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepReview(iteration: number, config: Config): Promise<boolean> {
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
- If code is clean, confirm with confidence`;

  return runClaude({ prompt, continueConversation: true }, config);
}
