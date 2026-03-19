#!/usr/bin/env node

/**
 * Post-install script: Optionally set up husky if git is available
 * This allows consumers of the versioning package to automatically
 * set up git hooks when git is present.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasHusky() {
  try {
    const rootDir = process.cwd();
    // Check if husky is in node_modules
    const huskyPath = path.join(rootDir, 'node_modules', 'husky');
    return fs.existsSync(huskyPath);
  } catch {
    return false;
  }
}

function setupHusky() {
  try {
    const rootDir = process.cwd();
    const pkgJsonPath = path.join(rootDir, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) {
      return; // Not in a package directory
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    // Add prepare script if not present
    if (!pkgJson.scripts) {
      pkgJson.scripts = {};
    }

    if (!pkgJson.scripts.prepare) {
      pkgJson.scripts.prepare = 'husky';
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
    }

    // Try to initialize husky
    execSync('npx husky', { stdio: 'ignore' });
  } catch {
    // Silently fail - husky setup is optional
  }
}

// Main logic
if (isGitRepo() && hasHusky()) {
  setupHusky();
}
