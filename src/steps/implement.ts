import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepImplement(config: Config): Promise<boolean> {
  logStep('2/8', 'IMPLEMENT REQUIREMENT');

  const prompt = `${config.requirement}

## Implementation Guidelines:
- Understand the existing codebase structure first
- Write clean, idiomatic code following project conventions
- Handle edge cases and errors appropriately
- Add necessary comments for complex logic
- Keep changes focused and minimal`;

  const result = await runClaude({ prompt }, config);
  return result.success;
}
