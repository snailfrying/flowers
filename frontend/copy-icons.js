/**
 * Copy icons to dist directory after build
 * This script should be run after vite build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcIconsDir = path.join(__dirname, 'src', 'icons');
const distIconsDir = path.join(__dirname, 'dist', 'icons');

// Ensure dist/icons directory exists
if (!fs.existsSync(distIconsDir)) {
  fs.mkdirSync(distIconsDir, { recursive: true });
}

// Copy all icon files
const iconFiles = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];

iconFiles.forEach(iconFile => {
  const srcPath = path.join(srcIconsDir, iconFile);
  const distPath = path.join(distIconsDir, iconFile);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, distPath);
    console.log(`✓ Copied ${iconFile}`);
  } else {
    console.warn(`⚠ Warning: ${iconFile} not found in ${srcIconsDir}`);
  }
});

// Copy rules.json for declarativeNetRequest
const rulesSrc = path.join(__dirname, 'src', 'rules.json');
const rulesDist = path.join(__dirname, 'dist', 'rules.json');

if (fs.existsSync(rulesSrc)) {
  fs.copyFileSync(rulesSrc, rulesDist);
  console.log('✓ Copied rules.json');
  console.warn(`⚠ Warning: rules.json not found in ${rulesSrc}`);
}

// Copy pdf.worker.min.js (v3)
const pdfWorkerSrc = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const pdfWorkerDist = path.join(__dirname, 'dist', 'pdf.worker.min.js');

if (fs.existsSync(pdfWorkerSrc)) {
  fs.copyFileSync(pdfWorkerSrc, pdfWorkerDist);
  console.log('✓ Copied pdf.worker.min.js');
} else {
  console.warn(`⚠ Warning: pdf.worker.min.js not found in ${pdfWorkerSrc}`);
}

console.log('Build assets copied successfully!');

