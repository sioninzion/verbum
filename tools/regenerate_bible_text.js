// Rebuilds every data/bible-text/{CODE}/{chapter}.json directly from the
// authoritative 대한성서공회 개역개정 (NKRV) pages, replacing our flawed
// .txt-derived conversion outright rather than patching each bug class
// separately. This naturally fixes, in one pass: the Psalm-superscription
// off-by-one, the ~61 stray-token corruptions in the source .txt files, the
// Masoretic-vs-English chapter/verse boundary differences, and every
// word-level mismatch — since the verse map now comes straight from the
// site that is already the app's own "성경 본문" link target.
//
// Where our OLD heading text included a "(대상 1:5-23)"-style cross
// reference that the live page can't reliably supply (it renders as a
// separate interactive widget), we splice that reference back onto the
// freshly-fetched heading title if the core wording still matches — so we
// don't regress the nicer formatting we already had for the ~740 chapters
// that were already correct.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { loadChapters, getBookCode, extractFromPage } = require('./verify_bible_text_lib.js');

const PROJECT_ROOT = 'c:/Users/nohsi/OneDrive - 경희대학교/바탕 화면/성경통독';
const LOG_PATH = path.join(__dirname, 'regenerate.log.jsonl');
const CONCURRENCY = 6;
const RETRY_LIMIT = 4;

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function coreHeading(text) {
  return (text || '').replace(/\s*\([^)]*\)?\s*$/, '').trim();
}

function loadOldVerses(code, chapterNum) {
  const p = path.join(PROJECT_ROOT, 'data', 'bible-text', code, `${chapterNum}.json`);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return [];
  }
}

function findSpilloverSplit(newHeadingText, oldHeadingTexts) {
  // bskorea sometimes renders a section heading that falls mid-verse by
  // absorbing the verse's own continuation text into the same "heading"
  // span, with no separating punctuation. Our own old, cleanly-extracted
  // heading titles (from the <heading> markers in the source .txt) are
  // used as known-good prefixes to detect and split this off.
  let best = null;
  for (const old of oldHeadingTexts) {
    const oldCore = coreHeading(old);
    if (oldCore && newHeadingText.startsWith(oldCore)) {
      if (!best || oldCore.length > best.oldCore.length) best = { old, oldCore };
    }
  }
  if (!best) return { title: newHeadingText, spill: '' };
  let spill = newHeadingText.slice(best.oldCore.length).trim();
  // A short leftover fragment containing a digit, or ending in the
  // 상)/하) "first half/second half of verse" cross-reference notation, is
  // parallel-passage citation debris (e.g. "(마 17:22-23; 눅 9:1-6상)")
  // that leaked past the heading-vs-reference-widget split on bskorea's
  // page — not real verse text. Discard it rather than appending it.
  if (spill && (/\d/.test(spill) || /[상하]\)$/.test(spill))) spill = '';
  return { title: best.old, spill };
}

async function buildNewVerses(page, chapter, oldVerses) {
  const oldHeadingTexts = oldVerses.filter((v) => v.h).map((v) => v.h);

  await page.goto(chapter.link, { waitUntil: 'networkidle', timeout: 30000 });
  const items = await extractFromPage(page);
  if (!items.length) throw new Error('no_verse_spans_found');

  const newVerses = [];
  let pendingHeadings = [];
  for (const item of items) {
    if (item.type === 'heading') {
      pendingHeadings.push(item.text);
    } else {
      const verseNum = Number(item.id.split('.').pop());
      let text = item.text;
      let headingOut;
      if (pendingHeadings.length) {
        const joined = pendingHeadings.join(' ');
        const { title, spill } = findSpilloverSplit(joined, oldHeadingTexts);
        headingOut = title;
        if (spill) {
          if (newVerses.length) {
            newVerses[newVerses.length - 1].t = normalize(newVerses[newVerses.length - 1].t + ' ' + spill);
          } else {
            text = spill + ' ' + text;
          }
        }
        pendingHeadings = [];
      }
      const entry = { v: verseNum, t: normalize(text) };
      if (headingOut) entry.h = headingOut;
      newVerses.push(entry);
    }
  }
  if (!newVerses.length) throw new Error('empty_verse_set');
  return newVerses;
}

async function regenerateChapter(page, chapter) {
  const code = getBookCode(chapter);
  if (!code) return { chapter, code: null, status: 'error', error: 'no_book_code' };

  const oldVerses = loadOldVerses(code, chapter.chapter);

  let lastErr = null;
  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      const newVerses = await buildNewVerses(page, chapter, oldVerses);

      const outDir = path.join(PROJECT_ROOT, 'data', 'bible-text', code);
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${chapter.chapter}.json`);
      fs.writeFileSync(outPath, JSON.stringify(newVerses), 'utf-8');

      return {
        chapter: { id: chapter.id, book: chapter.book, chapter: chapter.chapter },
        code,
        status: 'ok',
        oldCount: oldVerses.length,
        newCount: newVerses.length,
      };
    } catch (err) {
      lastErr = err.message;
      await page.waitForTimeout(1000 * attempt);
    }
  }
  return {
    chapter: { id: chapter.id, book: chapter.book, chapter: chapter.chapter },
    code,
    status: 'error',
    error: lastErr,
  };
}

async function main() {
  const allChapters = loadChapters();

  const done = new Map();
  if (fs.existsSync(LOG_PATH)) {
    const lines = fs.readFileSync(LOG_PATH, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.chapter?.id && obj.status === 'ok') done.set(obj.chapter.id, obj);
      } catch {}
    }
  }
  const todo = allChapters.filter((c) => !done.has(c.id));
  console.log(`Total chapters: ${allChapters.length}, already done: ${done.size}, remaining: ${todo.length}`);

  const browser = await chromium.launch();
  const out = fs.createWriteStream(LOG_PATH, { flags: 'a' });

  let cursor = 0;
  let processed = 0;
  let okCount = 0;
  let errCount = 0;
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
      const result = await regenerateChapter(page, chapter);
      out.write(JSON.stringify(result) + '\n');
      processed++;
      if (result.status === 'ok') okCount++;
      else errCount++;

      if (processed % 25 === 0 || processed === todo.length) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = (todo.length - processed) / rate;
        console.log(
          `[${processed}/${todo.length}] ok=${okCount} errors=${errCount} elapsed=${elapsed.toFixed(0)}s eta=${remaining.toFixed(0)}s`
        );
      }
    }
    await context.close();
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();
  console.log('DONE.', okCount, 'ok,', errCount, 'errors. Log:', LOG_PATH);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
