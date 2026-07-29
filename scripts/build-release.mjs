/**
 * Lisa's Angry Initiative - Build Release Script
 * @module build-release
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

async function buildRelease() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const version = packageJson.version;
  const moduleName = packageJson.name;

  const zipsDir = path.join(projectRoot, 'zips');
  if (!fs.existsSync(zipsDir)) {
    fs.mkdirSync(zipsDir, { recursive: true });
  }

  const zipPath = path.join(zipsDir, `${moduleName}-v${version}.zip`);

  try {
    const cmd = `powershell -NoProfile -Command "\\$items = @(); Get-ChildItem -Path '${projectRoot}' -Recurse -File | Where-Object { \\$_.FullName -notmatch '(node_modules|\\\\.git|zips)' } | ForEach-Object { \\$items += \\$_.FullName }; Compress-Archive -Path \\$items -DestinationPath '${zipPath}' -Force"`;

    execSync(cmd, { stdio: 'inherit' });

    console.log(`Built ${zipPath}`);
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

buildRelease();
