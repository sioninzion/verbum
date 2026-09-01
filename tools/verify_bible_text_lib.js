const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'c:/Users/nohsi/OneDrive - 경희대학교/바탕 화면/성경통독';
const RETRY_LIMIT = 3;

function loadChapters() {
  const raw = fs.readFileSync(path.join(PROJECT_ROOT, 'data', 'bible-data.js'), 'utf-8');
  const jsonStr = raw.slice(raw.indexOf('=') + 1, raw.lastIndexOf(';'));
  const data = JSON.parse(jsonStr);
  return data.chapters;
}

function getBookCode(chapter) {
  const match = /NKRV\/([A-Z0-9]+)\./.exec(chapter.link || '');
  return match ? match[1] : null;
}

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function loadLocalVerses(code, chapterNum) {
  const p = path.join(PROJECT_ROOT, 'data', 'bible-text', code, `${chapterNum}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function extractFromPage(page) {
  return page.evaluate(() => {
    const items = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    let lastVerseId = null;
    while ((node = walker.nextNode())) {
      if (node.tagName === 'SPAN' && node.classList.contains('verse') && node.id && node.id.startsWith('NKRV.')) {
        const text = node.textContent;
        if (node.id !== lastVerseId) {
          items.push({ type: 'verse', id: node.id, text });
          lastVerseId = node.id;
        } else {
          items[items.length - 1].text += ' ' + text;
        }
      } else if (
        node.tagName === 'SPAN' &&
        node.classList.contains('text-grayMedium') &&
        !node.classList.contains('verse') &&
        node.textContent.trim() &&
        /[가-힣a-zA-Z0-9]/.test(node.textContent)
      ) {
        const core = node.textContent.trim().replace(/\s*\([^)]*\)?\s*$/, '').trim();
        if (core) items.push({ type: 'heading', text: core });
      }
    }
    return items;
  });
}

function coreHeading(text) {
  return (text || '').replace(/\s*\([^)]*\)?\s*$/, '').trim();
}

function findSpilloverSplit(newHeadingText, oldHeadingTexts) {
  // bskorea sometimes renders a section heading that falls mid-verse by
  // absorbing the verse's own continuation text (or parallel-passage
  // citation debris) into the same "heading" span, with no separating
  // punctuation. Known-good local heading titles are used as prefixes to
  // detect and split this off, mirroring regenerate-bible-text.js exactly
  // so verification reflects the same model that produced the data.
  let best = null;
  for (const old of oldHeadingTexts) {
    const oldCore = coreHeading(old);
    if (oldCore && newHeadingText.startsWith(oldCore)) {
      if (!best || oldCore.length > best.oldCore.length) best = { old, oldCore };
    }
  }
  if (!best) return { title: newHeadingText, spill: '' };
  let spill = newHeadingText.slice(best.oldCore.length).trim();
  if (spill && (/\d/.test(spill) || /[상하]\)$/.test(spill))) spill = '';
  return { title: best.old, spill };
}

function buildRemoteModel(items, localHeadingTexts, code, chapterNum) {
  const verses = {};
  const headingBeforeVerse = {};
  const seenVerseNums = new Set();
  let pendingHeadings = [];
  let lastVerseNum = null;
  for (const item of items) {
    if (item.type === 'heading') {
      pendingHeadings.push(item.text);
    } else {
      // Same guard as regenerate-bible-text.js: skip verses that bled in
      // from a neighboring chapter, or that repeat a verse number already
      // seen on this page (a rare duplicated-render glitch).
      const [, idBook, idChapter, idVerse] = item.id.split('.');
      const verseNum = Number(idVerse);
      const belongsHere = idBook === code && Number(idChapter) === chapterNum;
      if (!belongsHere || seenVerseNums.has(verseNum)) {
        pendingHeadings = [];
        continue;
      }
      seenVerseNums.add(verseNum);

      let text = item.text;
      if (pendingHeadings.length) {
        const joined = pendingHeadings.join(' ');
        const { title, spill } = findSpilloverSplit(joined, localHeadingTexts || []);
        headingBeforeVerse[verseNum] = [title];
        if (spill) {
          if (lastVerseNum !== null) verses[lastVerseNum] = normalize(verses[lastVerseNum] + ' ' + spill);
          else text = spill + ' ' + text;
        }
        pendingHeadings = [];
      }
      verses[verseNum] = text;
      lastVerseNum = verseNum;
    }
  }
  return { verses, headingBeforeVerse, trailingHeadings: pendingHeadings };
}

function buildLocalModel(localVerses) {
  const verses = {};
  const headingBeforeVerse = {};
  const duplicateVerseNums = [];
  const seen = new Set();
  for (const v of localVerses) {
    if (seen.has(v.v)) duplicateVerseNums.push(v.v);
    seen.add(v.v);
    verses[v.v] = v.t;
    if (v.h) headingBeforeVerse[v.v] = [v.h];
  }
  return { verses, headingBeforeVerse, duplicateVerseNums };
}

function compareChapter(remote, local) {
  const issues = [];
  if (local.duplicateVerseNums.length) {
    issues.push({ kind: 'duplicate_verse', verses: [...new Set(local.duplicateVerseNums)] });
  }
  const remoteVerseNums = Object.keys(remote.verses).map(Number).sort((a, b) => a - b);
  const localVerseNums = Object.keys(local.verses).map(Number).sort((a, b) => a - b);

  const remoteSet = new Set(remoteVerseNums);
  const localSet = new Set(localVerseNums);

  const missingInLocal = remoteVerseNums.filter((n) => !localSet.has(n));
  const extraInLocal = localVerseNums.filter((n) => !remoteSet.has(n));

  if (missingInLocal.length) issues.push({ kind: 'missing_verse', verses: missingInLocal });
  if (extraInLocal.length) issues.push({ kind: 'extra_verse', verses: extraInLocal });

  for (const n of remoteVerseNums) {
    if (!localSet.has(n)) continue;
    const remoteText = normalize(remote.verses[n]);
    const localText = normalize(local.verses[n]);
    if (remoteText !== localText) {
      const despace = (s) => s.replace(/\s+/g, '');
      const kind = despace(remoteText) === despace(localText) ? 'spacing_only' : 'text_mismatch';
      issues.push({ kind, verse: n, remote: remoteText, local: localText });
    }
  }

  const allVerseNums = new Set([...remoteVerseNums, ...localVerseNums]);
  for (const n of allVerseNums) {
    const remoteH = (remote.headingBeforeVerse[n] || []).join(' ');
    const localH = (local.headingBeforeVerse[n] || []).join(' ');
    if (remoteH !== localH) {
      issues.push({ kind: 'heading_mismatch', verse: n, remote: remoteH || null, local: localH || null });
    }
  }

  return issues;
}

async function processChapter(page, chapter) {
  const code = getBookCode(chapter);
  if (!code) return { chapter, code: null, error: 'no_book_code' };

  const local = loadLocalVerses(code, chapter.chapter);
  if (!local) return { chapter, code, error: 'no_local_file' };

  const summary = { id: chapter.id, book: chapter.book, chapter: chapter.chapter, link: chapter.link };

  let lastErr = null;
  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      await page.goto(chapter.link, { waitUntil: 'networkidle', timeout: 30000 });
      const items = await extractFromPage(page);
      if (!items.length) throw new Error('no_verse_spans_found');
      const localModel = buildLocalModel(local);
      const localHeadingTexts = local.filter((v) => v.h).map((v) => v.h);
      const remote = buildRemoteModel(items, localHeadingTexts, code, chapter.chapter);
      const issues = compareChapter(remote, localModel);
      return { chapter: summary, code, issues };
    } catch (err) {
      lastErr = err.message;
      await page.waitForTimeout(1000 * attempt);
    }
  }
  return { chapter: summary, code, error: lastErr };
}

module.exports = {
  PROJECT_ROOT,
  loadChapters,
  getBookCode,
  normalize,
  loadLocalVerses,
  extractFromPage,
  buildRemoteModel,
  buildLocalModel,
  compareChapter,
  processChapter,
};
