import inquirer from 'inquirer';
import type { Config } from './config.js';

export enum ConfirmResult {
  Continue = 'continue',
  Skip = 'skip',
  Quit = 'quit',
}

export async function confirm(config: Config): Promise<ConfirmResult> {
  if (config.autoMode) {
    return ConfirmResult.Continue;
  }

  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: 'expand',
      name: 'action',
      message: 'Continue?',
      default: 'y',
      choices: [
        { key: 'y', name: 'Yes - continue', value: 'continue' },
        { key: 'n', name: 'No - exit', value: 'quit' },
        { key: 's', name: 'Skip - skip this step', value: 'skip' },
        { key: 'q', name: 'Quit - exit pipeline', value: 'quit' },
      ],
    },
  ]);

  return action as ConfirmResult;
}

export async function handleConfirm(config: Config): Promise<boolean> {
  const result = await confirm(config);

  if (result === ConfirmResult.Quit) {
    console.log('\nPipeline cancelled by user.');
    process.exit(0);
  }

  // Continue or Skip both mean proceed
  return true;
}
