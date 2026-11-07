const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('the scene and commerce shells both load the neutral platform palette', () => {
  const palette = read('public/platform-palette.css');
  for (const source of ['app/layout.tsx', 'public/scene-experience/index.html']) {
    assert.ok(read(source).includes('href="/platform-palette.css"'));
  }
  for (const file of ['app/globals.css', 'public/scene-experience/lifestyle.css']) {
    const canvas = file.startsWith('app/') ? '--paper' : '--life-paper';
    const declarations = [...read(file).matchAll(new RegExp(canvas + ':\\s*([^;}]+)', 'g'))];
    assert.ok(declarations.length > 0);
    for (const match of declarations) assert.equal(match[1].trim(), 'var(--digo-paper)');
  }
  for (const token of ['paper', 'surface', 'well', 'line', 'ink', 'muted', 'charcoal']) {
    const match = palette.match(new RegExp('--digo-' + token + ':\\s*#([a-f0-9]{3}(?:[a-f0-9]{3})?);', 'i'));
    assert.ok(match, token);
    const rgb = match[1].length === 3 ? [...match[1]] : match[1].match(/../g);
    assert.equal(new Set(rgb).size, 1, token + ' must be neutral');
    if (token === 'paper') assert.equal(parseInt(rgb[0], 16), rgb[0].length === 1 ? 15 : 255);
  }
});

test('each studio mask has a matching product and a browser-loadable mask file', () => {
  const css = read('public/scene-experience/studio-masks.css');
  const matches = [...css.matchAll(/\[src\$="\/([^"]+)"\]\s*\{\s*--studio-mask:\s*url\("([^"]+)"\)/g)];
  assert.ok(matches.length > 0);
  for (const [, source, mask] of matches) {
    assert.ok(fs.existsSync(path.join(root, 'public/scene-experience/assets', source)), source);
    assert.ok(fs.existsSync(path.join(root, 'public/scene-experience', mask)), mask);
  }
});
