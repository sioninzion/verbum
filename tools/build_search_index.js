// Builds data/bible-search-index.json: every book code's verses (chapter →
// [{v,t}]) in one file, so the app's 본문검색 (full-text verse search) can
// scan the whole Bible without fetching all 1,189 data/bible-text/*.json
// files one at a time. Re-run this whenever data/bible-text changes (e.g.
// after regenerate_bible_text.js).

const fs = require('fs');
const path = require('path');
const { loadChapters, getBookCode } = require('./verify_bible_text_lib.js');

const PROJECT_ROOT = path.join(__dirname, '..');

const chapters = loadChapters();
const index = {};

for (const chapter of chapters) {
  const code = getBookCode(chapter);
  if (!code) continue;
  const filePath = path.join(PROJECT_ROOT, 'data', 'bible-text', code, `${chapter.chapter}.json`);
  const verses = JSON.parse(fs.readFileSync(filePath, 'utf-8')).map(({ v, t }) => ({ v, t }));
  if (!index[code]) index[code] = [];
  index[code][chapter.chapter - 1] = verses;
}

const outPath = path.join(PROJECT_ROOT, 'data', 'bible-search-index.json');
fs.writeFileSync(outPath, JSON.stringify(index));

console.log(`Wrote ${outPath} (${Object.keys(index).length} books)`);
