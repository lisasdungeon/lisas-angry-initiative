/**
 * Lisa's Angry Initiative - Build Release Script
 * @module build-release
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

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
  const output = fs.createWriteStream(zipPath);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    process.exit(1);
  });

  output.on('close', () => {
    console.log(`Built ${zipPath}`);
  });

  archive.pipe(output);

  const excludePatterns = ['.git', 'node_modules', 'zips', '.gitignore', '.DS_Store'];

  function shouldExclude(filePath) {
    return excludePatterns.some(pattern => filePath.includes(pattern));
  }

  function addDirectoryToArchive(dirPath, baseDir) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const arcPath = path.relative(projectRoot, fullPath);

      if (shouldExclude(fullPath)) continue;

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addDirectoryToArchive(fullPath);
      } else {
        archive.file(fullPath, { name: arcPath });
      }
    }
  }

  addDirectoryToArchive(projectRoot);
  await archive.finalize();
}

buildRelease().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
