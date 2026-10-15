const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/tiengnhatdongian-n3/n3-full.json'), 'utf8'));

const circledRegex = /(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿])/;

const items = raw.entries.map((e) => {
  let structure = '';
  const match = e.title.match(/\[.*?\]\s*([^：:]+)/);
  if (match) {
    structure = match[1].trim();
  } else {
    structure = e.title.replace(/\[.*?\]/, '').trim();
  }

  let meaning = '';
  const colonIdx = e.title.indexOf('：') !== -1 ? e.title.indexOf('：') : e.title.indexOf(':');
  if (colonIdx !== -1) {
    meaning = e.title.slice(colonIdx + 1).trim();
  }

  let formation = '';
  let nuance = '';
  const allExamples = [];
  const blocks = [];

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

    const exList = [];
    if (text.includes('→') || text.includes('->')) {
      const parts = text.split(circledRegex);
      for (const p of parts) {
        if (p.includes('→') || p.includes('->')) {
          const split = p.split(/→|->/);
          const jpn = split[0].replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿\d\.\s\:]+/, '').trim();
          const vie = split.slice(1).join(' ').trim();
          if (jpn && vie && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(jpn) && jpn.length >= 3) {
            exList.push({ jpn, vie });
            allExamples.push({ jpn, vie });
          }
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

  const articleBlocks = rawBlocks.map(b => ({
    kind: b.kind || 'content',
    heading: b.heading || '',
    text: b.text || '',
    html: (b.html || '').replace(/src=["']assets\//g, 'src="/grammar-assets/')
  }));

  return {
    id: 'tndg-' + String(e.number).padStart(3, '0'),
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
    folderIds: ['folder-tndg-n3'],
    source: 'tiengnhatdongian',
    articleBlocks: articleBlocks
  };
});

fs.writeFileSync(path.join(__dirname, '../data/tiengnhatdongian-n3-parsed.json'), JSON.stringify({
  count: items.length,
  items: items
}, null, 2), 'utf8');

console.log('Successfully saved data/tiengnhatdongian-n3-parsed.json with', items.length, 'items');
