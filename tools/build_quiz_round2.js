// Builds data/quiz-round2.js (window.BIBLE_QUIZ_ROUND2) from the reviewed
// 2회차 question set in tools/quiz-round2/verbum-round2-1189.json. Only what
// differs from 1회차 is kept — question, options, answer number, and the
// cited verse range — keyed by the same chapter id as data/bible-data.js,
// which already carries book/chapter/link. Re-run after editing the JSON.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const sourcePath = path.join(__dirname, 'quiz-round2', 'verbum-round2-1189.json');
const { chapters } = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

const quiz = {};
for (const chapter of chapters) {
  if (chapter.options.length !== 4 || chapter.options[chapter.answer - 1] !== chapter.answerText) {
    throw new Error(`Chapter ${chapter.id}: answer ${chapter.answer} does not match its options`);
  }
  quiz[chapter.id] = {
    q: chapter.question,
    o: chapter.options,
    a: chapter.answer,
    r: [chapter.reference.verseStart, chapter.reference.verseEnd],
  };
}

const outPath = path.join(PROJECT_ROOT, 'data', 'quiz-round2.js');
fs.writeFileSync(outPath, `window.BIBLE_QUIZ_ROUND2 = ${JSON.stringify(quiz)};\n`);

console.log(`Wrote ${outPath} (${Object.keys(quiz).length} chapters)`);
