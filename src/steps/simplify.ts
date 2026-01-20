import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepSimplify(config: Config): Promise<boolean> {
  logStep('2/7', 'CODE SIMPLIFICATION');

  const prompt = `Refine the recently modified code for clarity, consistency, and maintainability while preserving all functionality.

## Core Principles:

### 1. Functionality Preservation
- Never change what the code does - only how it does it
- All original features, outputs, and behaviors must remain intact

### 2. Project Standards Alignment
- Follow ES modules and project conventions
- Prefer \`function\` declarations over arrow functions for top-level functions
- Use explicit return type annotations
- Maintain established naming conventions

### 3. Clarity Enhancement
- Reducing unnecessary complexity and nesting
- Eliminating redundant code and abstractions
- Improving readability through clear variable and function names
- Consolidating related logic
- Removing unnecessary comments that describe obvious code
- IMPORTANT: Avoid nested ternary operators - prefer switch statements or if/else chains for multiple conditions
- Choose clarity over brevity - explicit code is often better than overly compact code

### 4. Balanced Approach
- Avoid over-simplification that could reduce maintainability
- Don't create overly clever solutions
- Don't combine too many concerns into single functions

### 5. Scoped Focus
- Target the recently modified code sections
- Don't refactor unrelated code unless explicitly requested

## Actions:
1. IDENTIFY opportunities for simplification in recently modified code
2. APPLY refinements that improve readability without changing behavior
3. VERIFY all functionality is preserved
4. EXPLAIN significant changes made

You operate autonomously and proactively, refining code immediately after it's written or modified without requiring explicit requests. Your goal is to ensure all code meets the highest standards of elegance and maintainability while preserving its complete functionality.
`;

  const result = await runClaude({ prompt, continueConversation: true }, config);
  return result.success;
}
