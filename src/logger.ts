import chalk from 'chalk';
import { appendFileSync } from 'fs';

let logFilePath: string | undefined;

export function setLogFile(path: string | undefined): void {
  logFilePath = path;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export function log(message: string): void {
  const timestamped = `[${getTimestamp()}] ${message}`;
  console.log(timestamped);

  if (logFilePath) {
    appendFileSync(logFilePath, stripAnsi(timestamped) + '\n');
  }
}

export function logRaw(message: string): void {
  console.log(message);

  if (logFilePath) {
    appendFileSync(logFilePath, stripAnsi(message) + '\n');
  }
}

export function logStep(stepNum: string, title: string): void {
  const line = '─'.repeat(62);
  console.log();
  console.log(chalk.cyan(`┌${line}┐`));
  console.log(chalk.cyan('│') + ' ' + chalk.green(`STEP ${stepNum}:`) + ' ' + title);
  console.log(chalk.cyan(`└${line}┘`));
  console.log();

  if (logFilePath) {
    appendFileSync(logFilePath, `\n┌${line}┐\n│ STEP ${stepNum}: ${title}\n└${line}┘\n\n`);
  }
}

export function logHeader(config: { reviewIterations: number; autoMode: boolean; dryRun: boolean; dangerouslySkipPermissions: boolean }): void {
  const line = '═'.repeat(62);
  console.log();
  console.log(chalk.green(`╔${line}╗`));
  console.log(chalk.green('║') + '           SOFTWARE FACTORY PIPELINE v2.0                     ' + chalk.green('║'));
  console.log(chalk.green(`╠${line}╣`));
  console.log(chalk.green('║') + ` Reviews: ${config.reviewIterations} | Auto: ${config.autoMode} | Dry-run: ${config.dryRun}`);
  if (config.dangerouslySkipPermissions) {
    console.log(chalk.green('║') + ' ' + chalk.yellow('⚠ Skip permissions: enabled'));
  }
  console.log(chalk.green(`╚${line}╝`));
  console.log();
}

export function logSuccess(message: string): void {
  log(chalk.green(`✓ ${message}`));
}

export function logError(message: string): void {
  log(chalk.red(`✗ ${message}`));
}

export function logWarning(message: string): void {
  log(chalk.yellow(`⚠ ${message}`));
}

export function logInfo(message: string): void {
  log(chalk.blue(`▶ ${message}`));
}

export function logDryRun(command: string): void {
  console.log(chalk.yellow('[DRY-RUN]') + ' ' + command);
}
