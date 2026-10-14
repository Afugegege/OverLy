const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.log('[CHECKSUMS] dist/ directory does not exist yet. Run build or dist first.');
  process.exit(0);
}

function calculateSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

const entries = fs.readdirSync(distDir, { withFileTypes: true });
const releaseFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => {
    // Only checksum primary deliverables: .exe, .zip (ignore blockmaps, yaml, debug configs)
    if (name.endsWith('.blockmap')) return false;
    if (name.endsWith('.yaml') || name.endsWith('.yml')) return false;
    if (name === 'SHA256SUMS.txt') return false;
    return name.endsWith('.exe') || name.endsWith('.zip');
  })
  .sort();

if (releaseFiles.length === 0) {
  console.log('[CHECKSUMS] No release artifacts (.exe, .zip) found in dist/.');
  process.exit(0);
}

console.log('\n============================================================');
console.log('              overLy Release SHA-256 Checksums             ');
console.log('============================================================\n');

const lines = [];
for (const file of releaseFiles) {
  const fullPath = path.join(distDir, file);
  const hash = calculateSha256(fullPath);
  const stat = fs.statSync(fullPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

  lines.push(`${hash} *${file}`);
  console.log(`File:   ${file} (${sizeMb} MB)`);
  console.log(`SHA256: ${hash}\n`);
}

const outputPath = path.join(distDir, 'SHA256SUMS.txt');
fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');

console.log(`[CHECKSUMS] Saved checksum manifest to: ${outputPath}\n`);
