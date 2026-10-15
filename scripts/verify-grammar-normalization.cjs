#!/usr/bin/env node
const assert = require('assert/strict');
const summary = require('../data/tiengnhatdongian-n3-summary.json').items;
const detail = require('../data/tiengnhatdongian-n3-detail-normalized.json').items;
const preview = require('../tmp/grammar-normalization-preview.json').firestore;
const japanese = /[一-龯々ぁ-ゖァ-ヿ]/;
const vietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/;
const plain = value => value.replace(/\{([^{}|]+)\|[^{}]+\}/g, '$1');

assert.equal(summary.length, 308);
assert.equal(detail.length, 308);
assert.equal(preview.length, 100);
assert.deepEqual(new Set(detail.map(item => item.id)), new Set(summary.map(item => item.id)));

for (const item of [...summary, ...preview]) {
  assert.ok(item.id && item.structure && item.meaning, item.id);
  for (const field of ['structure', 'formation', 'meaning', 'nuance']) {
    if (item[`${field}Ruby`]) assert.equal(plain(item[`${field}Ruby`]), item[field], `${item.id}.${field}`);
  }
  for (const block of item.blocks || []) {
    for (const field of ['formation', 'meaning', 'nuance']) {
      if (block[`${field}Ruby`]) assert.equal(plain(block[`${field}Ruby`]), block[field], `${item.id}.blocks.${field}`);
    }
  }
}
for (const item of [...summary, ...detail, ...preview]) {
  assert.ok(item.examples.length, `${item.id} has no examples`);
  for (const example of item.examples) {
    assert.ok(japanese.test(example.jpn), `${item.id} has no Japanese`);
    assert.ok(!vietnamese.test(example.jpn), `${item.id} mixes Vietnamese into Japanese`);
    if (example.ruby) assert.equal(plain(example.ruby), example.jpn, `${item.id}.examples`);
  }
}
console.log(`Validated ${summary.length + preview.length} grammars and ${detail.reduce((n, item) => n + item.examples.length, 0) + preview.reduce((n, item) => n + item.examples.length, 0)} full examples.`);
