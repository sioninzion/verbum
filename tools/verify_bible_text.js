// Verifies our converted data/bible-text/{CODE}/{chapter}.json against the
// official 대한성서공회 개역개정 (NKRV) pages at bible.bskorea.or.kr — the
// exact same source every chapter.link in the app already points to.
//
// Writes progress incrementally to results.jsonl (one JSON object per
// chapter) so it can be resumed/inspected while running, plus a running
// summary printed to stdout.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { loadChapters, processChapter } = require('./verify_bible_text_lib.js');

const RESULTS_PATH = path.join(__dirname, 'results.jsonl');
const CONCURRENCY = 6;

async function main() {
  const allChapters = loadChapters();

  const done = new Set();
  if (fs.existsSync(RESULTS_PATH)) {
    const lines = fs.readFileSync(RESULTS_PATH, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.chapter?.id) done.add(obj.chapter.id);
      } catch {}
    }
  }
  let todo = allChapters.filter((c) => !done.has(c.id));
  if (process.env.LIMIT) {
    todo = todo.slice(0, Number(process.env.LIMIT));
  }
  console.log(`Total chapters: ${allChapters.length}, already done: ${done.size}, remaining: ${todo.length}`);

  const browser = await chromium.launch();
  const out = fs.createWriteStream(RESULTS_PATH, { flags: 'a' });

  let cursor = 0;
  let processed = 0;
  let issueChapters = 0;
  let errorChapters = 0;
  const startTime = Date.now();

  async function worker() {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    while (cursor < todo.length) {
      const idx = cursor++;
      const chapter = todo[idx];
      const result = await processChapter(page, chapter);
      out.write(JSON.stringify(result) + '\n');
      processed++;
      if (result.error) errorChapters++;
      else if (result.issues && result.issues.length) issueChapters++;

      if (processed % 25 === 0 || processed === todo.length) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = (todo.length - processed) / rate;
        console.log(
          `[${processed}/${todo.length}] issues=${issueChapters} errors=${errorChapters} ` +
            `elapsed=${elapsed.toFixed(0)}s eta=${remaining.toFixed(0)}s`
        );
      }
    }
    await context.close();
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  await browser.close();
  console.log('DONE. Results written to', RESULTS_PATH);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
