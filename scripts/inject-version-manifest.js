const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const manifestPath = path.join(rootDir, 'manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const newManifest = { version: pkg.version, ...manifest };
fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + '\n');
console.log(`[inject-version] Set manifest.json version to ${pkg.version} (as first key)`);