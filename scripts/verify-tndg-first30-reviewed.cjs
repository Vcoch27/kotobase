#!/usr/bin/env node
const assert = require('node:assert/strict');
const reviewed = require('../data/tiengnhatdongian-n3-first30-reviewed.json');
const source = require('../data/tiengnhatdongian-n3-summary.json').items;
const plain = value => value.replace(/\{([^{}|]+)\|[^{}]+\}/g, '$1');
const sourceById = new Map(source.map(item => [item.id, item]));

assert.equal(reviewed.schemaVersion, 1);
assert.equal(reviewed.items.length, 30);
let usageCount = 0;
let exampleCount = 0;
for (const [index, item] of reviewed.items.entries()) {
  assert.equal(item.id, `tndg-${String(index + 1).padStart(3, '0')}`);
  assert.ok(sourceById.has(item.id), `${item.id}: missing source lesson`);
  assert.ok(item.structure && item.meaning && item.formation && item.nuance);
  assert.ok(!/<[^>]+>/.test(item.formation), `${item.id}: HTML in formation`);
  if (item.structureRuby) assert.equal(plain(item.structureRuby), item.structure);
  assert.ok(item.blocks.length > 0);
  const unique = new Set();
  for (const [blockIndex, block] of item.blocks.entries()) {
    usageCount++;
    assert.equal(block.blockNumber, blockIndex + 1);
    assert.ok(block.heading && block.meaning);
    assert.ok(block.examples.length >= 2, `${item.id}: ${block.heading} needs at least two examples`);
    for (const example of block.examples) {
      assert.ok(/[一-龯々ぁ-ゖァ-ヿ]/.test(example.jpn), `${item.id}: missing Japanese`);
      assert.ok(example.vie.trim(), `${item.id}: missing translation`);
      assert.ok(!/<[^>]+>/.test(example.jpn), `${item.id}: HTML in example`);
      if (example.ruby) assert.equal(plain(example.ruby), example.jpn, `${item.id}: ruby mismatch`);
      unique.add(example.jpn);
    }
  }
  assert.deepEqual(new Set(item.examples.map(example => example.jpn)), unique,
    `${item.id}: examples tab must contain every usage example once`);
  assert.equal(item.totalExamplesCount, item.examples.length);
  exampleCount += item.examples.length;
}
console.log(`Reviewed ${reviewed.items.length} lessons, ${usageCount} usages and ${exampleCount} examples.`);
