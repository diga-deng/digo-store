const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../public');
const source = fs.readFileSync(path.join(root, 'scene-experience/wardrobe.js'), 'utf8');

function fitting(storage = new Map()) {
  const ctx = vm.createContext({
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    document: { addEventListener() {}, querySelector() { return null; } },
    window: { addEventListener() {} }
  });
  vm.runInContext(source, ctx);
  return expression => vm.runInContext(expression, ctx);
}

test('changing either garment leaves the other on the model and survives a reload', () => {
  const storage = new Map();
  const run = fitting(storage);
  run('chooseFittingPiece(0, 2)');
  assert.equal(run('fittingLookName()'), 'Olive shell · Indigo jeans');
  run('chooseFittingPiece(1, 1)');
  assert.equal(run('fittingLookName()'), 'Olive shell · Sand pleats');
  run('moveFittingPiece(1, 0)');
  assert.equal(run('fittingLookName()'), 'Ivory rib knit · Sand pleats');
  assert.equal(fitting(storage)('fittingLookName()'), 'Ivory rib knit · Sand pleats');
});

test('every choice and every combination has its own loadable image', () => {
  const run = fitting();
  const images = new Set();
  for (let top = 0; top < 3; top++) {
    for (let trousers = 0; trousers < 3; trousers++) {
      run(`chooseFittingPiece(0,${top}); chooseFittingPiece(1,${trousers})`);
      const image = run('fittingPhoto()');
      assert.ok(fs.existsSync(path.join(root, image)));
      images.add(image);
    }
  }
  assert.equal(images.size, 9);
  const markup = run('fittingRoom()');
  const thumbs = [...markup.matchAll(/src="([^"]+\/option-[^"]+)"/g)];
  assert.equal(new Set(thumbs.map(match => match[1])).size, 6);
  thumbs.forEach(match => assert.ok(fs.existsSync(path.join(root, match[1]))));
});

test('a stale or invalid stored option recovers independently of the other garment', () => {
  const storage = new Map([['digo-fitting-look-v1', '[12,2]']]);
  assert.equal(fitting(storage)('fittingLookName()'), 'Ivory rib knit · Black tailored');
  storage.set('digo-fitting-look-v1', 'bad JSON');
  assert.equal(fitting(storage)('fittingLookName()'), 'Ivory rib knit · Indigo jeans');
});

test('both garments advertise the previous and next actual piece before interaction', () => {
  const run = fitting();
  const cases = [
    [0,-1,2,'Previous top: Olive shell'], [0,1,1,'Next top: Indigo overshirt'],
    [1,-1,2,'Previous trousers: Black tailored'], [1,1,1,'Next trousers: Sand pleats']
  ];
  for (const [row,step,option,label] of cases) {
    const peek = run(`fittingPeek(${row}, ${step})`);
    assert.ok(peek.includes(`aria-label="${label}"`));
    assert.ok(peek.includes(`data-option="${option}"`));
    assert.ok(peek.includes(`option-${row}-${option}.webp`));
  }
  run('moveFittingPiece(1,0)');
  assert.equal(run('fittingNeighbor(0,-1).option'), 0);
  assert.equal(run('fittingNeighbor(0,1).option'), 2);
  assert.equal(run('fittingNeighbor(1,-1).option'), 2);
});
