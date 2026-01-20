import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepCommit(config: Config): Promise<boolean> {
  logStep('6/7', 'COMMIT CHANGES');

  const pushInstruction = config.skipPush ? '' : 'Then push to remote.';

  const prompt = `Commit the changes:

## Commit Message Requirements (Target: 10/10):

**Subject Line (max 3 pts):**
- Imperative mood ('Add' not 'Added')
- ≤50 characters, no trailing period
- Format: type(scope): description

**Body - WHY (max 3 pts):**
- What problem does this solve?
- Why was this approach chosen?

**Body - WHAT (max 2 pts):**
- Key technical changes
- Files/components affected

**Structure (max 2 pts):**
- Blank line after subject
- Body wrapped at 72 chars

## Tasks:
1. Stage relevant files (git add)
2. Commit with excellent message

Do not add any attribution or co author by.

${pushInstruction}`;

  const result = await runClaude({ prompt, continueConversation: true }, config);
  return result.success;
}
