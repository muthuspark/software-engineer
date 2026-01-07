import chalk from 'chalk';
import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepTest(config: Config): Promise<boolean> {
  logStep('4/6', 'TESTING');

  if (config.skipTests) {
    console.log(chalk.yellow('[SKIPPED]') + ' Testing step skipped via configuration');
    return true;
  }

  const prompt = `Testing phase:

1. **Run existing tests** - Fix any failures
2. **Add new tests** for changed code:
   - Happy path tests
   - Edge cases
   - Error conditions
3. **Verify coverage** - Ensure critical paths are tested
4. **Final test run** - All tests must pass

Report: tests run, passed, failed, new tests added`;

  const result = await runClaude({ prompt, continueConversation: true }, config);
  return result.success;
}
