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

function extractTrailingBleed(prevPageItems, code, chapterNum) {
  // bskorea sometimes tags the tail of the *previous* chapter's page with
  // verse ids that genuinely belong to this chapter (a Masoretic-vs-English
  // chapter-boundary quirk) — and that content exists ONLY there; this
  // chapter's own page starts partway through. Find where that block
  // starts (including any heading immediately introducing it) and pull it
  // forward so it isn't lost.
  let startIdx = -1;
  for (let i = 0; i < prevPageItems.length; i++) {
    const item = prevPageItems[i];
    if (item.type !== 'verse') continue;
    const [, idBook, idChapter] = item.id.split(' ')[0].split('.');
    if (idBook === code && Number(idChapter) === chapterNum) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return [];
  let headingStart = startIdx;
  while (headingStart > 0 && prevPageItems[headingStart - 1].type === 'heading') headingStart--;
  return prevPageItems.slice(headingStart);
}

async function buildNewVerses(page, chapter, oldVerses) {
  const oldHeadingTexts = oldVerses.filter((v) => v.h).map((v) => v.h);
  const code = getBookCode(chapter);

  await page.goto(chapter.link, { waitUntil: 'networkidle', timeout: 30000 });
  const ownItems = await extractFromPage(page);
  if (!ownItems.length) throw new Error('no_verse_spans_found');

  // Malachi is the one book where Hebrew numbering has *fewer* chapters
  // than the English convention the rest of this app follows: bskorea's
  // own "MAL.4" page renders real content, but every verse id on it says
  // chapter 3 (there is no chapter 4 in their scheme). That's different
  // from a bleed — the *whole* own page disagrees, not just a tail end —
  // so detect it and trust the own page's verses at face value in that
  // case, rather than filtering all of them out as "not ours".
  const ownHasAnyMatch = ownItems.some((item) => {
    if (item.type !== 'verse') return false;
    const [, idBook, idChapter] = item.id.split(' ')[0].split('.');
    return idBook === code && Number(idChapter) === chapter.chapter;
  });

  let bleedItems = [];
  if (chapter.chapter > 1) {
    const prevLink = chapter.link.replace(/\.(\d+)$/, `.${chapter.chapter - 1}`);
    await page.goto(prevLink, { waitUntil: 'networkidle', timeout: 30000 });
    const prevItems = await extractFromPage(page);
    bleedItems = extractTrailingBleed(prevItems, code, chapter.chapter);
  }
  const items = [
    ...bleedItems.map((item) => ({ ...item, fromOwn: false })),
    ...ownItems.map((item) => ({ ...item, fromOwn: true })),
  ];

  const newVerses = [];
  const seenVerseNums = new Set();
  let pendingHeadings = [];
  for (const item of items) {
    if (item.type === 'heading') {
      pendingHeadings.push(item.text);
    } else {
      // Verse span ids look like "NKRV.GEN.31.1". bskorea's page for one
      // chapter sometimes bleeds in a verse or two from the *next* chapter
      // (a Masoretic-vs-English boundary quirk), and — rarely, seemingly
      // after a slow/retried load — repeats the whole chapter a second
      // time. Both show up as an id that doesn't belong here: either a
      // different book/chapter than the one we're fetching, or a verse
      // number we've already recorded on this page. Drop those rather than
      // letting them collide with (or duplicate) the real verse — unless
      // this is the whole-page Malachi-style renumbering, in which case the
      // own page's verses are trusted regardless of their id's chapter.
      //
      // A combined verse (printed as e.g. "1-2") occasionally renders as a
      // single span whose id attribute holds multiple space-separated ids
      // ("NKRV.ROM.9.1 NKRV.ROM.9.2") rather than one — take the first, so
      // the verse is filed under its opening number with its full text.
      const [, idBook, idChapter, idVerse] = item.id.split(' ')[0].split('.');
      const verseNum = Number(idVerse);
      const belongsHere = idBook === code && Number(idChapter) === chapter.chapter;
      const trustAnyway = item.fromOwn && !ownHasAnyMatch && idBook === code;
      if ((!belongsHere && !trustAnyway) || seenVerseNums.has(verseNum)) {
        pendingHeadings = [];
        continue;
      }
      seenVerseNums.add(verseNum);

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

  // TARGET_IDS=1,2,3 re-processes exactly those chapter ids, bypassing the
  // resume log entirely (used to re-fix a known subset without re-running
  // all 1189 chapters).
  let todo;
  if (process.env.TARGET_IDS) {
    const ids = new Set(process.env.TARGET_IDS.split(',').map(Number));
    todo = allChapters.filter((c) => ids.has(c.id));
    console.log(`Targeted run: ${todo.length}/${ids.size} requested chapters found.`);
  } else {
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
    todo = allChapters.filter((c) => !done.has(c.id));
    console.log(`Total chapters: ${allChapters.length}, already done: ${done.size}, remaining: ${todo.length}`);
  }

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
