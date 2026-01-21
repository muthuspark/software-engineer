import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepImplement(config: Config): Promise<boolean> {
  logStep('3/9', 'IMPLEMENT REQUIREMENT');

  const prompt = `${config.requirement}

## Implementation Guidelines:
- Write clean, idiomatic code following project conventions
- Handle edge cases and errors appropriately
- Add necessary comments for complex logic
- Keep changes focused and minimal. Once the work is completed, exit.`;

  const result = await runClaude({ prompt }, config);
  return result.success;
}
