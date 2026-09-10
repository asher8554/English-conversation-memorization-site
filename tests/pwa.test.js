const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('PWA manifest exists and launches in standalone mode', () => {
  const manifestPath = path.join(root, 'manifest.webmanifest');
  assert.equal(fs.existsSync(manifestPath), true, 'manifest.webmanifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
});

test('index links the manifest and PWA bootstrap script', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /<script src="pwa\.js"><\/script>/);
});
