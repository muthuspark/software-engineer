import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepChangelog(config: Config): Promise<boolean> {
  logStep('8/8', 'UPDATE CHANGELOG');

  const prompt = `Update CHANGELOG.md:

## Format (Keep a Changelog):
\`\`\`markdown
## [Unreleased]

### Added
- New features

### Changed
- Changes in existing functionality

### Fixed
- Bug fixes
\`\`\`

1. Add entry for this change under appropriate category
2. Be concise but descriptive
3. Commit the CHANGELOG update`;

  const result = await runClaude({ prompt, continueConversation: true }, config);
  return result.success;
}
