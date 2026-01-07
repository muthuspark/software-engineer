import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepSolidCleanCode(config: Config): Promise<boolean> {
  logStep('3/6', 'SOLID PRINCIPLES & CLEAN CODE');

  const prompt = `Review the code for SOLID principles and Clean Code compliance:

## SOLID Principles:

### S - Single Responsibility
- Each class/function has ONE reason to change
- Split classes doing multiple things

### O - Open/Closed
- Open for extension, closed for modification
- Replace switch/if-else chains with polymorphism

### L - Liskov Substitution
- Subtypes must be substitutable for base types
- Prefer composition over inheritance when appropriate

### I - Interface Segregation
- Small, focused interfaces
- Clients should not depend on unused methods

### D - Dependency Inversion
- Depend on abstractions, not concretions
- Inject dependencies, dont hard-code them

## Clean Code Checklist:

**Naming:**
- [ ] Intention-revealing names
- [ ] Pronounceable, searchable names
- [ ] Class=nouns, Methods=verbs, Booleans=questions

**Functions:**
- [ ] Small (<20 lines), single purpose
- [ ] Max 3 params (wrap in object if more)
- [ ] No side effects, no null returns

**Code Smells to Fix:**
- [ ] Magic numbers → named constants
- [ ] Deep nesting → early returns/extraction
- [ ] Duplicate code → DRY refactor
- [ ] Long methods → extract smaller functions

## Actions:
1. IDENTIFY all violations
2. REFACTOR to fix each issue
3. EXPLAIN your changes`;

  const result = await runClaude({ prompt, continueConversation: true }, config);
  return result.success;
}
