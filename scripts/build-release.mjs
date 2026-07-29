/**
 * Lisa's Angry Initiative - Build Release Script
 * @module build-release
 * @author Lisa's Dungeon
 * @license MIT
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const EXCLUDED = new Set(['.git', 'node_modules', 'zips']);

function buildRelease() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const version = packageJson.version;
  const moduleName = packageJson.name;

  const zipsDir = path.join(projectRoot, 'zips');
  if (!fs.existsSync(zipsDir)) {
    fs.mkdirSync(zipsDir, { recursive: true });
  }

  const zipPath = path.join(zipsDir, `${moduleName}-v${version}.zip`);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const entries = fs.readdirSync(projectRoot).filter((entry) => !EXCLUDED.has(entry));

  try {
    execFileSync('zip', ['-r', '-X', zipPath, ...entries], { cwd: projectRoot, stdio: 'inherit' });
    console.log(`Built ${zipPath}`);
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

buildRelease();
