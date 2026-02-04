import chalk from 'chalk';
import { appendFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const BOX_WIDTH = 62;

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
  const line = '─'.repeat(BOX_WIDTH);
  console.log();
  console.log(chalk.cyan(`┌${line}┐`));
  console.log(chalk.cyan('│') + ' ' + chalk.green(`STEP ${stepNum}:`) + ' ' + title);
  console.log(chalk.cyan(`└${line}┘`));
  console.log();

  if (logFilePath) {
    appendFileSync(logFilePath, `\n┌${line}┐\n│ STEP ${stepNum}: ${title}\n└${line}┘\n\n`);
  }
}

export function logHeader(config: { reviewIterations: number; dryRun: boolean; dangerouslySkipPermissions: boolean; allowedTools?: string; implementationOnly: boolean }): void {
  const line = '═'.repeat(BOX_WIDTH);
  console.log();
  console.log(chalk.green(`╔${line}╗`));
  const title = `SOFTWARE FACTORY PIPELINE v${pkg.version}`;
  const padding = Math.floor((BOX_WIDTH - title.length) / 2);
  const titleLine = ' '.repeat(padding) + title + ' '.repeat(BOX_WIDTH - padding - title.length);
  console.log(chalk.green('║') + titleLine + chalk.green('║'));
  const author = 'Built by Muthukrishnan';
  const authorPadding = Math.floor((BOX_WIDTH - author.length) / 2);
  const authorLine = ' '.repeat(authorPadding) + author + ' '.repeat(BOX_WIDTH - authorPadding - author.length);
  console.log(chalk.green('║') + chalk.dim(authorLine) + chalk.green('║'));
  console.log(chalk.green(`╠${line}╣`));
  let configLine = ` Reviews: ${config.reviewIterations} | Dry-run: ${config.dryRun}`;
  if (config.implementationOnly) {
    configLine += ' | Mode: implementation-only';
  }
  console.log(chalk.green('║') + configLine.padEnd(BOX_WIDTH) + chalk.green('║'));
  if (config.dangerouslySkipPermissions) {
    const permLine = ' ' + chalk.yellow('⚠ Skip permissions: enabled');
    console.log(chalk.green('║') + permLine + ' '.repeat(BOX_WIDTH - stripAnsi(permLine).length) + chalk.green('║'));
  } else if (config.allowedTools) {
    const toolsLine = ' ' + chalk.cyan(`🔓 Allowed tools: ${config.allowedTools}`);
    console.log(chalk.green('║') + toolsLine + ' '.repeat(BOX_WIDTH - stripAnsi(toolsLine).length) + chalk.green('║'));
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
  const message = '[DRY-RUN] ' + command;
  console.log(chalk.yellow('[DRY-RUN]') + ' ' + command);

  if (logFilePath) {
    appendFileSync(logFilePath, message + '\n');
  }
}
