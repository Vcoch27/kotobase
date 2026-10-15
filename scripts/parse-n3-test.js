const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/tiengnhatdongian-n3/n3-full.json'), 'utf8'));

let parsedCount = 0;
let totalExamples = 0;
let missingStructure = 0;

const parsedItems = data.entries.map((e) => {
  // 1. Structure
  let structure = '';
  const match = e.title.match(/\[.*?\]\s*([^：:]+)/);
  if (match) {
    structure = match[1].trim();
  } else {
    structure = e.title.replace(/\[.*?\]/, '').trim();
  }
  if (!structure) missingStructure++;

  // 2. Meaning from title after colon
  let meaning = '';
  const colonIdx = e.title.indexOf('：') !== -1 ? e.title.indexOf('：') : e.title.indexOf(':');
  if (colonIdx !== -1) {
    meaning = e.title.slice(colonIdx + 1).trim();
  }

  // 3. Blocks
  const blocks = [];
  let formation = '';
  let nuance = '';
  const allExamples = [];

  const rawBlocks = e.article?.blocks || [];
  let blockCounter = 1;

  for (const b of rawBlocks) {
    const heading = b.heading || '';
    const text = b.text || '';
    const html = (b.html || '').replace(/src=["']assets\//g, 'src="/grammar-assets/');

    if (heading.includes('Cấu trúc') || heading.includes('Kết hợp')) {
      if (!formation) formation = text.replace(/^Cấu trúc\s*/i, '').trim();
    } else if (heading.includes('Chú ý') || heading.includes('Lưu ý')) {
      if (!nuance) nuance = text.replace(/^Chú ý\s*/i, '').trim();
    } else if (heading.includes('Tổng Kết') || heading.includes('Bình Luận')) {
      if (!nuance) nuance = text.replace(/^Tổng Kết và Bình Luận\s*/i, '').trim();
    }

    // Extract examples from text
    const exList = [];
    const exMatches = text.split(/(?=[①-㊿]|\b\d+\.\s*[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff])/g);
    for (const em of exMatches) {
      if (em.includes('→') || em.includes('->')) {
        const parts = em.split(/→|->/);
        const jpn = parts[0].replace(/^[①-㊿\d\.\s]+/, '').trim();
        const vie = parts.slice(1).join(' ').trim();
        const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(jpn);
        if (jpn && vie && hasJapanese && jpn.length >= 3) {
          exList.push({ jpn, vie });
          allExamples.push({ jpn, vie });
        }
      }
    }

    if (heading.includes('Cách dùng') || exList.length > 0) {
      blocks.push({
        blockNumber: blockCounter++,
        heading: heading,
        formation: formation,
        meaning: heading.includes('Cách dùng') ? heading : meaning,
        nuance: nuance,
        examples: exList,
        html: html
      });
    }
  }

  if (!meaning) meaning = structure;

  const firstEx = allExamples[0] || (blocks[0]?.examples[0]);
  totalExamples += allExamples.length;
  parsedCount++;

  const articleBlocks = rawBlocks.map(b => ({
    kind: b.kind || 'content',
    heading: b.heading || '',
    text: b.text || '',
    html: (b.html || '').replace(/src=["']assets\//g, 'src="/grammar-assets/')
  }));

  return {
    number: e.number,
    title: e.title,
    structure: structure,
    formation: formation || undefined,
    meaning: meaning,
    nuance: nuance || undefined,
    example: firstEx?.jpn,
    exampleMeaning: firstEx?.vie,
    examples: allExamples,
    blocks: blocks,
    books: e.books || [],
    jlptLevel: e.title.includes('N2') ? 'N3-N2' : 'N3',
    sourceUrl: e.url,
    articleBlocks: articleBlocks
  };
});

console.log('Successfully parsed entries:', parsedCount);
console.log('Total examples extracted:', totalExamples);
console.log('Missing structure count:', missingStructure);
console.log('Sample parsed item #1:');
console.log(JSON.stringify(parsedItems[0], null, 2).slice(0, 1000));
