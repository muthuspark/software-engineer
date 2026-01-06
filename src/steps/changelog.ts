import { logStep } from '../logger.js';
import { runClaude } from '../claude.js';
import type { Config } from '../config.js';

export async function stepChangelog(config: Config): Promise<boolean> {
  logStep('6/6', 'UPDATE CHANGELOG');

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

  return runClaude({ prompt, continueConversation: true }, config);
}
