/**
 * Update notifier - checks for new versions and prompts users to update
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

interface VersionInfo {
  current: string;
  latest: string;
  lastChecked: number;
}

interface PackageJson {
  name: string;
  version: string;
}

export class UpdateNotifier {
  private packageName: string;
  private currentVersion: string;
  private checkInterval: number;
  private cacheFile: string;

  constructor(packageName: string, currentVersion: string, checkInterval = 24 * 60 * 60 * 1000) {
    this.packageName = packageName;
    this.currentVersion = currentVersion;
    this.checkInterval = checkInterval; // Default: 24 hours
    this.cacheFile = path.join(os.tmpdir(), `.${packageName.replace('/', '-')}-update-check.json`);
  }

  /**
   * Check for updates and notify user if a new version is available.
   */
  async notify(): Promise<void> {
    try {
      const shouldCheck = await this.shouldCheckForUpdates();

      if (shouldCheck) {
        const latestVersion = await this.fetchLatestVersion();
        if (latestVersion) {
          await this.saveVersionInfo(latestVersion);

          if (this.isNewerVersion(latestVersion, this.currentVersion)) {
            this.displayUpdateMessage(latestVersion);
          }
        }
      } else {
        const cachedInfo = await this.loadVersionInfo();
        if (cachedInfo && this.isNewerVersion(cachedInfo.latest, this.currentVersion)) {
          this.displayUpdateMessage(cachedInfo.latest);
        }
      }
    } catch {
      // Silently fail - don't disrupt user experience
    }
  }

  /**
   * Check if we should check for updates (based on cache and interval)
   */
  private async shouldCheckForUpdates(): Promise<boolean> {
    try {
      const versionInfo = await this.loadVersionInfo();
      if (!versionInfo) {
        return true;
      }

      const timeSinceLastCheck = Date.now() - versionInfo.lastChecked;
      return timeSinceLastCheck >= this.checkInterval;
    } catch {
      return true;
    }
  }

  /**
   * Fetch latest version from npm registry
   */
  private async fetchLatestVersion(): Promise<string | null> {
    try {
      const registryUrl = `https://registry.npmjs.org/${this.packageName}/latest`;

      const response = await fetch(registryUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as PackageJson;
      return data.version;
    } catch {
      return null;
    }
  }

  /**
   * Load version info from cache
   */
  private async loadVersionInfo(): Promise<VersionInfo | null> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      return JSON.parse(data) as VersionInfo;
    } catch {
      return null;
    }
  }

  /**
   * Save version info to cache
   */
  private async saveVersionInfo(latestVersion: string): Promise<void> {
    const versionInfo: VersionInfo = {
      current: this.currentVersion,
      latest: latestVersion,
      lastChecked: Date.now(),
    };

    try {
      await fs.writeFile(this.cacheFile, JSON.stringify(versionInfo, null, 2), 'utf-8');
    } catch {
      // Ignore cache write errors
    }
  }

  /**
   * Compare two semantic versions
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const parseVersion = (version: string): number[] => {
      return version.replace(/^v/, '').split('.').map(Number);
    };

    const latestParts = parseVersion(latest);
    const currentParts = parseVersion(current);

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) {
        return true;
      }
      if (latestPart < currentPart) {
        return false;
      }
    }

    return false;
  }

  /**
   * Display update notification message
   */
  private displayUpdateMessage(latestVersion: string): void {
    const boxWidth = 60;
    const border = '═'.repeat(boxWidth);
    const packageManager = this.detectPackageManager();

    console.log('');
    console.log(chalk.yellow(`╔${border}╗`));
    console.log(chalk.yellow('║') + ' '.repeat(boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow('║') + this.centerText(chalk.bold('Update Available!'), boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow('║') + ' '.repeat(boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow('║') + this.centerText(`${chalk.red(this.currentVersion)} → ${chalk.green(latestVersion)}`, boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow('║') + ' '.repeat(boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow('║') + this.padText('  Run to update:', boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow('║') + this.padText(chalk.cyan(`    ${packageManager.global} ${this.packageName}`), boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow('║') + ' '.repeat(boxWidth) + chalk.yellow('║'));
    console.log(chalk.yellow(`╚${border}╝`));
    console.log('');
  }

  /**
   * Detect package manager (npm, yarn, pnpm)
   */
  private detectPackageManager(): { global: string; local: string } {
    const userAgent = process.env.npm_config_user_agent || '';

    if (userAgent.includes('yarn')) {
      return { global: 'yarn global add', local: 'yarn add' };
    }
    if (userAgent.includes('pnpm')) {
      return { global: 'pnpm add -g', local: 'pnpm add' };
    }
    return { global: 'npm install -g', local: 'npm install' };
  }

  /**
   * Center text within given width (accounts for ANSI codes)
   */
  private centerText(text: string, width: number): string {
    const visibleLength = this.stripAnsi(text).length;
    const padding = Math.max(0, width - visibleLength);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  /**
   * Pad text to given width (accounts for ANSI codes)
   */
  private padText(text: string, width: number): string {
    const visibleLength = this.stripAnsi(text).length;
    return text + ' '.repeat(Math.max(0, width - visibleLength));
  }

  /**
   * Strip ANSI escape codes from string
   */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
}

/**
 * Create and run update notifier
 */
export async function checkForUpdates(packageName: string, currentVersion: string): Promise<void> {
  const notifier = new UpdateNotifier(packageName, currentVersion);
  await notifier.notify();
}
