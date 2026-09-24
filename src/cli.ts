#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChromePath, getDefaultChromeProfile, getUserDataDir, prepareUserDataDir } from './platform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CDP_PORT = parseInt(process.env.CDP_PORT || '9222', 10);
const API_PORT = parseInt(process.env.API_PORT || '3456', 10);

function log(msg: string) {
  console.log(`[surfagent] ${msg}`);
}

function checkCDP(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${CDP_PORT}/json/version`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

function startChrome(chromePath: string) {
  const userDataDir = getUserDataDir();
  prepareUserDataDir(userDataDir, getDefaultChromeProfile());

  const args = [
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-save-password-bubble',
    '--disable-popup-blocking',
    '--disable-notifications',
    '--disable-infobars',
    '--disable-translate',
    '--disable-features=PasswordManager,AutofillSaveCardBubble,TranslateUI',
    '--password-store=basic',
  ];

  const chrome = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });

  chrome.unref();
  log(`Chrome started (pid ${chrome.pid}) on port ${CDP_PORT}`);
}

async function waitForCDP(maxWait = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (await checkCDP()) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function getVersion(): string {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

async function main() {
  const command = process.argv[2];

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(getVersion());
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(`
surfagent — Browser Recon API for AI agents

Usage:
  surfagent start     Start Chrome + API server
  surfagent api       Start API only (Chrome must be running)
  surfagent chrome    Start Chrome debug session only
  surfagent health    Check if everything is running
  surfagent version   Print version number
  surfagent help      Show this message

Environment variables:
  CDP_PORT            Chrome debug port (default: 9222)
  API_PORT            API server port (default: 3456)
  BROWSER_PATH          Path to any Chromium-based browser (Arc, Brave, Edge, etc.)
  CHROME_USER_DATA_DIR  Chrome profile directory (default: system temporary directory)

After starting, your AI agent can call http://localhost:3456
Full API docs: https://github.com/AllAboutAI-YT/surfagent#readme
`);
    return;
  }

  if (command === 'health') {
    const cdp = await checkCDP();
    console.log(`Chrome CDP (port ${CDP_PORT}): ${cdp ? 'connected' : 'not running'}`);
    if (cdp) {
      try {
        const res = await fetch(`http://localhost:${API_PORT}/health`);
        const data = await res.json();
        console.log(`API (port ${API_PORT}): ${data.status} — ${data.tabCount} tabs`);
      } catch {
        console.log(`API (port ${API_PORT}): not running`);
      }
    }
    return;
  }

  if (command === 'chrome') {
    const cdpRunning = await checkCDP();
    if (cdpRunning) {
      log(`Chrome already running on port ${CDP_PORT}`);
      return;
    }

    const chromePath = getChromePath();
    if (!chromePath) {
      console.error('[surfagent] Chrome not found. Install Google Chrome or set BROWSER_PATH to a Chromium-based browser.');
      process.exit(1);
    }

    startChrome(chromePath);
    const connected = await waitForCDP();
    if (!connected) {
      console.error('[surfagent] Chrome started but CDP not responding. Check port ' + CDP_PORT);
      process.exit(1);
    }
    log('Chrome ready');
    return;
  }

  if (command === 'api') {
    const cdpRunning = await checkCDP();
    if (!cdpRunning) {
      console.error(`[surfagent] Chrome not running on port ${CDP_PORT}. Run: surfagent chrome`);
      process.exit(1);
    }
    await import('./api/server.js');
    return;
  }

  if (command === 'start' || !command) {
    log('Starting...');

    // 1. Check/start Chrome
    let cdpRunning = await checkCDP();
    if (cdpRunning) {
      log(`Chrome already running on port ${CDP_PORT}`);
    } else {
      const chromePath = getChromePath();
      if (!chromePath) {
        console.error('[surfagent] Chrome not found. Install Google Chrome or set BROWSER_PATH to a Chromium-based browser.');
        process.exit(1);
      }
      startChrome(chromePath);
      cdpRunning = await waitForCDP();
      if (!cdpRunning) {
        console.error('[surfagent] Chrome failed to start. Try running it manually with --remote-debugging-port=9222');
        process.exit(1);
      }
      log('Chrome ready');
    }

    // 2. Start API
    await import('./api/server.js');
    return;
  }

  console.error(`Unknown command: ${command}. Run: surfagent help`);
  process.exit(1);
}

main().catch((err) => {
  console.error('[surfagent]', err.message);
  process.exit(1);
});
