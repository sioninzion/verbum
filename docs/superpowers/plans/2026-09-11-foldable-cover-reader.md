# Foldable Cover-Screen One-Verse Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a folded Galaxy Z Fold cover screen, pressing the home "이어서 읽기" button opens a full-screen reader that shows the chapter one verse at a time — tap/swipe right to advance, left to go back, and the last verse carries a "문제 풀기" button into the existing quiz flow.

**Architecture:** A new imperatively-shown overlay (`#verseReader`, not a `data-view-panel`) driven by `state.verseReader = { chapterId, verses, index, open }`. Activation is gated by one media query, `COVER_MQ` = `(max-width: 430px) and (min-aspect-ratio: 3/5) and (max-aspect-ratio: 4/5)` — narrow width + stubby aspect ratio catches a folded Fold cover while excluding normal phones (too tall) and the near-square Flip cover (too square). The reader reuses `loadChapterVerses()` for data and hands off to the existing `startQuiz()` for completion. Nothing about this touches the phone or wide layouts.

**Tech Stack:** Vanilla JS classic script (non-module), plain CSS, no build step, no test framework. Verification = `node --check app.js` + headless Chrome screenshots against a local `python -m http.server` — and because `COVER_MQ` is a pure width/aspect query, headless `--window-size` CAN exercise it (unlike `pointer: coarse`).

**Spec:** `docs/superpowers/specs/2026-09-10-tablet-wide-ui-design.md` (section 10)

## Global Constraints

- **Cover-only.** The reader may only open when `COVER_MQ.matches` is true AND the entry point is the home "이어서 읽기" button (`#homeNextBtn`). Every other reading path (성경 tab → book → chapter → 본문) is untouched.
- **`COVER_MQ` string is one literal**, used verbatim in the CSS `@media` prelude and the JS `window.matchMedia(...)`:
  `(max-width: 430px) and (min-aspect-ratio: 3/5) and (max-aspect-ratio: 4/5)`
- **Zero regression** on any viewport where `COVER_MQ` is false — the overlay stays `hidden`, no CSS applies (all reader CSS is inside the `COVER_MQ` `@media` block or scoped to `#verseReader` which is `hidden`).
- **Completion semantics unchanged** — a chapter is only marked complete by answering its quiz correctly (existing `answerQuiz`), never by paging through verses.
- **Cache-bust on every task** editing `styles.css` / `app.js` / `service-worker.js`: bump the `?v=` query in `index.html` and `CACHE_VERSION` in `service-worker.js`. Values at plan start depend on whether Plan A ran first — read them from `index.html` / `service-worker.js` and increment.
- **Verify workflow:** `python -m http.server 8892 &`, then headless Chrome `--headless=new --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) --window-size=<W>,<H> --screenshot=<out.png> "http://localhost:8892/"`. A Fold-cover-ish viewport is `--window-size=360,572` (ratio 0.629, inside [0.6, 0.8]). A normal phone is `--window-size=390,844` (ratio 0.462, below 0.6 → COVER_MQ false). Kill with `taskkill //F //IM python.exe`; never touch chrome.exe.
- Headless Chrome enforces a ~500px minimum inner width for top-level windows on some flows; if `360` won't stick, verify the media match via a `matchMedia(...).matches` readout injected through a tiny local test HTML page instead, and screenshot the reader at the smallest width that does stick, noting the discrepancy.

---

### Task 1: Scaffold — `COVER_MQ`, overlay markup, state, base CSS

**Files:**
- Modify: `app.js` — add `COVER_MQ` after `WIDE_MQ` (or after `const db = firebase.firestore();` at `app.js:195` if Plan A hasn't run); add `verseReader` to `state` (`app.js:239` area); add `verseReader` element refs to the `elements` map (`app.js:~259+`)
- Modify: `index.html` — add `#verseReader` overlay just before `</body>`-adjacent overlays (near `.rotate-overlay` at `index.html:29`, or after `#dashboard`); bump cache
- Modify: `styles.css` — append a `@media` block for `COVER_MQ` + `#verseReader` base rules (keep after any Plan A wide block)
- Modify: `service-worker.js` — bump cache

**Interfaces:**
- Produces: `COVER_MQ` (`MediaQueryList` global). `state.verseReader = { chapterId: null, verses: [], index: 0, open: false }`. `elements.verseReader`, `elements.verseReaderVerse`, `elements.verseReaderHeading`, `elements.verseReaderCounter`, `elements.verseReaderTitle`, `elements.verseReaderBackBtn`, `elements.verseReaderQuizBtn`, `elements.verseReaderZoneLeft`, `elements.verseReaderZoneRight`.

- [x] **Step 1: Add `COVER_MQ` to `app.js`**

```js
// Folded foldable cover screen — narrow AND stubby aspect ratio. Excludes
// normal phones (taller, ratio < 3/5) and the Flip cover (near-square,
// ratio > 4/5). String MUST match the @media prelude in styles.css verbatim.
const COVER_MQ = window.matchMedia("(max-width: 430px) and (min-aspect-ratio: 3/5) and (max-aspect-ratio: 4/5)");
```

- [x] **Step 2: Add reader state**

In the `state` object (`app.js:239`), add:
```js
  verseReader: { chapterId: null, verses: [], index: 0, open: false },
```

- [x] **Step 3: Add the overlay markup to `index.html`**

Place right after the `.rotate-overlay` div (`index.html:~33`):
```html
<div class="verse-reader" id="verseReader" hidden>
  <div class="verse-reader-bar">
    <button class="verse-reader-back" id="verseReaderBackBtn" type="button" aria-label="나가기">‹</button>
    <span class="verse-reader-title" id="verseReaderTitle"></span>
    <span class="verse-reader-counter" id="verseReaderCounter"></span>
  </div>
  <div class="verse-reader-stage">
    <p class="verse-reader-heading" id="verseReaderHeading" hidden></p>
    <p class="verse-reader-verse" id="verseReaderVerse"></p>
    <button class="primary-button verse-reader-quiz" id="verseReaderQuizBtn" type="button" hidden>문제 풀기</button>
  </div>
  <button class="verse-reader-zone verse-reader-zone-left" id="verseReaderZoneLeft" type="button" aria-label="이전 절"></button>
  <button class="verse-reader-zone verse-reader-zone-right" id="verseReaderZoneRight" type="button" aria-label="다음 절"></button>
</div>
```

- [x] **Step 4: Add element refs**

In the `elements` map (`app.js`):
```js
  verseReader: document.querySelector("#verseReader"),
  verseReaderTitle: document.querySelector("#verseReaderTitle"),
  verseReaderCounter: document.querySelector("#verseReaderCounter"),
  verseReaderHeading: document.querySelector("#verseReaderHeading"),
  verseReaderVerse: document.querySelector("#verseReaderVerse"),
  verseReaderQuizBtn: document.querySelector("#verseReaderQuizBtn"),
  verseReaderBackBtn: document.querySelector("#verseReaderBackBtn"),
  verseReaderZoneLeft: document.querySelector("#verseReaderZoneLeft"),
  verseReaderZoneRight: document.querySelector("#verseReaderZoneRight"),
```

- [x] **Step 5: Base CSS**

Append to `styles.css`:
```css
/* ===== FOLDABLE COVER-SCREEN ONE-VERSE READER ============================== */
.verse-reader[hidden] { display: none !important; }
.verse-reader {
  position: fixed;
  inset: 0;
  z-index: 200;               /* above dashboard, below nothing that matters */
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--ink);
  overscroll-behavior: contain;
  touch-action: pan-y;
}
.verse-reader-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: max(8px, env(safe-area-inset-top)) 12px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
}
.verse-reader-back {
  border: 0;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: var(--ink);
  padding: 4px 8px;
}
.verse-reader-title { flex: 1; }
.verse-reader-stage {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 22px 40px;
  text-align: center;
}
.verse-reader-heading {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
}
.verse-reader-verse {
  margin: 0;
  font-size: 22px;             /* Task 5 wires this to the 소/중/대/특대 setting */
  line-height: 1.7;
  font-weight: 700;
  transition: transform 180ms ease, opacity 180ms ease;
}
.verse-reader-verse.slide-out-left  { transform: translateX(-24px); opacity: 0; }
.verse-reader-verse.slide-out-right { transform: translateX(24px);  opacity: 0; }
.verse-reader-quiz { width: auto; padding-inline: 28px; }
.verse-reader-zone {
  position: absolute;
  top: 48px;                   /* below the bar */
  bottom: 0;
  border: 0;
  background: transparent;
  padding: 0;
}
.verse-reader-zone-left  { left: 0;  width: 33.333%; }
.verse-reader-zone-right { right: 0; width: 66.667%; }
```
NOTE: the `.verse-reader` rules are scoped to the element and it is `hidden` by default, so they are inert on every non-cover viewport. No `@media` gate is strictly required, but wrapping the *activation* is JS's job (Task 2).

- [x] **Step 6: `node --check` + no-regression screenshots**

`node --check app.js` → exit 0.
```bash
python -m http.server 8892 &
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) --window-size=390,844 --screenshot=/tmp/b1_phone.png "http://localhost:8892/" 2>/dev/null
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) --window-size=1024,900 --screenshot=/tmp/b1_wide.png "http://localhost:8892/" 2>/dev/null
taskkill //F //IM python.exe
```
Read both. Expected: identical to before — `#verseReader` is `hidden`, nothing rendered.

- [x] **Step 7: Bump cache + commit**

Read current `?v=` values from `index.html` and `CACHE_VERSION` from `service-worker.js`; increment each. Then:
```bash
git add app.js index.html styles.css service-worker.js docs/superpowers/plans/2026-09-11-foldable-cover-reader.md
git commit -m "cover-reader: scaffold — COVER_MQ, #verseReader overlay, state, base CSS"
```

---

### Task 2: Open / close + entry-point wiring + back handling

**Files:**
- Modify: `app.js` — new functions `openVerseReader`, `closeVerseReader`, `renderVerseReader`; modify `goToNextIncomplete()` at `app.js:2000-2004`; `popstate` listener
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `COVER_MQ`, `state.verseReader`, `elements.verseReader*`, `getNextIncompleteChapter()` (`app.js:1074`), `loadChapterVerses(chapter)` (`app.js:1836`, returns `[{v,t,h?}]`), `selectChapter(chapterId)` (`app.js:1943`), `DATA.chapters`.
- Produces: `openVerseReader(chapterId)` (async), `closeVerseReader()`, `renderVerseReader()`.

- [x] **Step 1: Write `openVerseReader` / `closeVerseReader` / `renderVerseReader`**

Add near the other reading functions (after `renderReading()` ~`app.js:1936`):
```js
async function openVerseReader(chapterId) {
  const chapter = DATA.chapters.find((c) => c.id === chapterId);
  if (!chapter) return;
  // keep the rest of the app's notion of "current chapter" in sync so the
  // quiz hand-off (startQuiz) works unchanged
  selectChapter(chapterId);
  state.verseReader = { chapterId, verses: [], index: 0, open: true };
  elements.verseReader.hidden = false;
  elements.verseReaderVerse.textContent = "본문을 불러오는 중...";
  elements.verseReaderHeading.hidden = true;
  elements.verseReaderCounter.textContent = "";
  elements.verseReaderQuizBtn.hidden = true;
  history.pushState({ verseReader: true }, "");
  let verses = [];
  try {
    verses = await loadChapterVerses(chapter);
  } catch {
    verses = [];
  }
  if (!state.verseReader.open || state.verseReader.chapterId !== chapterId) return;
  if (!verses.length) {
    elements.verseReaderVerse.textContent = "본문을 불러오지 못했습니다.";
    return;
  }
  state.verseReader.verses = verses;
  state.verseReader.index = 0;
  renderVerseReader();
}

function closeVerseReader() {
  if (!state.verseReader.open) return;
  state.verseReader.open = false;
  elements.verseReader.hidden = true;
  elements.verseReaderVerse.className = "verse-reader-verse";
}

function renderVerseReader() {
  const { verses, index, chapterId } = state.verseReader;
  const chapter = DATA.chapters.find((c) => c.id === chapterId);
  const verse = verses[index];
  if (!verse) return;
  const isLast = index === verses.length - 1;
  elements.verseReaderTitle.textContent = `${chapter.book} ${chapter.chapter}장`;
  elements.verseReaderCounter.textContent = `${index + 1} / ${verses.length}`;
  elements.verseReaderHeading.hidden = !(index === 0 && verse.h);
  if (index === 0 && verse.h) elements.verseReaderHeading.textContent = verse.h;
  elements.verseReaderVerse.textContent = `${verse.v}  ${verse.t}`;
  elements.verseReaderQuizBtn.hidden = !isLast;
}
```

- [x] **Step 2: Branch `goToNextIncomplete()`**

`app.js:2000`:
```js
function goToNextIncomplete() {
  const next = getNextIncompleteChapter();
  if (COVER_MQ.matches) {
    openVerseReader(next.id);
    return;
  }
  selectChapter(next.id);
  setView("quiz");
}
```

- [x] **Step 3: Wire the back button + `popstate`**

Near end-of-file wiring:
```js
elements.verseReaderBackBtn.addEventListener("click", () => history.back());
window.addEventListener("popstate", () => {
  if (state.verseReader.open) closeVerseReader();
});
// If the device leaves cover mode while the reader is open (unfold), drop it.
COVER_MQ.addEventListener("change", (e) => {
  if (!e.matches && state.verseReader.open) closeVerseReader();
});
```

- [x] **Step 4: `node --check` + verify open/close**

`node --check app.js` → exit 0.
```bash
python -m http.server 8892 &
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) --window-size=360,572 --screenshot=/tmp/b2_cover_home.png "http://localhost:8892/" 2>/dev/null
taskkill //F //IM python.exe
```
Read `/tmp/b2_cover_home.png` — confirm home renders at the cover viewport (the "이어서 읽기" button is visible). Then a **manual** pass in a real browser sized ~360×572 (DevTools device toolbar, custom 360×572): log in, tap "이어서 읽기" → the full-screen reader appears showing verse 1 with "1 / N" counter and a "‹" back button; tap "‹" (or browser back) → reader closes, home visible. At 390×844 (normal phone) the same button still goes to the normal `reading-panel` (no reader).

- [x] **Step 5: Bump cache + commit**

Increment `?v=` + `CACHE_VERSION`.
```bash
git add app.js index.html service-worker.js
git commit -m "cover-reader: open/close, home button branch, back/popstate handling"
```

---

### Task 3: Verse navigation — tap zones, swipe, slide transition

**Files:**
- Modify: `app.js` — `verseReaderGo(direction)`, tap-zone listeners, touch swipe on `elements.verseReader`
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `state.verseReader`, `renderVerseReader()`, `elements.verseReaderZoneLeft/Right`, `elements.verseReader`.
- Produces: `verseReaderGo(dir)` where `dir` is `1` (next) or `-1` (prev).

- [ ] **Step 1: Write `verseReaderGo`**

After `renderVerseReader()`:
```js
function verseReaderGo(dir) {
  const st = state.verseReader;
  if (!st.open) return;
  const target = st.index + dir;
  if (target < 0) {
    // bounce at verse 1
    elements.verseReaderVerse.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(14px)" }, { transform: "translateX(0)" }],
      { duration: 180 }
    );
    return;
  }
  if (target > st.verses.length - 1) return; // last verse: forward is the quiz button
  const outClass = dir === 1 ? "slide-out-left" : "slide-out-right";
  elements.verseReaderVerse.classList.add(outClass);
  setTimeout(() => {
    st.index = target;
    renderVerseReader();
    elements.verseReaderVerse.classList.remove("slide-out-left", "slide-out-right");
  }, 150);
}
```

- [ ] **Step 2: Tap-zone listeners**

Near end-of-file wiring:
```js
elements.verseReaderZoneRight.addEventListener("click", () => verseReaderGo(1));
elements.verseReaderZoneLeft.addEventListener("click", () => verseReaderGo(-1));
```

- [ ] **Step 3: Swipe on the overlay**

```js
let vrTouchX = null;
elements.verseReader.addEventListener("touchstart", (e) => {
  vrTouchX = e.changedTouches[0].clientX;
}, { passive: true });
elements.verseReader.addEventListener("touchend", (e) => {
  if (vrTouchX === null) return;
  const dx = e.changedTouches[0].clientX - vrTouchX;
  vrTouchX = null;
  if (Math.abs(dx) < 40) return;
  verseReaderGo(dx < 0 ? 1 : -1); // swipe left (finger R→L) = next
});
```

- [ ] **Step 4: `node --check` + verify**

`node --check app.js` → exit 0.
Manual pass at 360×572: enter reader, tap the right 2/3 repeatedly → verses advance with a left slide; tap the left 1/3 → verses go back with a right slide; on verse 1, left tap → the verse nudges and stays. On a touch-capable emulation, swipe left/right does the same. Screenshot mid-chapter → `/tmp/b3_mid.png`.

- [ ] **Step 5: Bump cache + commit**

```bash
git add app.js index.html service-worker.js
git commit -m "cover-reader: tap zones, swipe, slide transition"
```

---

### Task 4: Last verse → quiz hand-off

**Files:**
- Modify: `app.js` — wire `#verseReaderQuizBtn`
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `elements.verseReaderQuizBtn`, `closeVerseReader()`, `startQuiz()` (`app.js:1938` — sets `state.quizStep = "quiz"; renderQuizStep()`), `setView("quiz")`.
- The current chapter is already `selectChapter`-ed in `openVerseReader` Step 1, so `getCurrentChapter()` inside the quiz resolves correctly.

- [ ] **Step 1: Wire the button**

```js
elements.verseReaderQuizBtn.addEventListener("click", () => {
  closeVerseReader();
  setView("quiz");
  startQuiz();
});
```

- [ ] **Step 2: `node --check` + verify the full flow**

`node --check app.js` → exit 0.
Manual pass at 360×572: enter reader via "이어서 읽기", page to the last verse → "문제 풀기" button shows under the verse; right-tap does nothing; tap "문제 풀기" → reader closes and the quiz for that chapter appears; answer correctly → chapter marked complete (check the 성경 tab / home progress afterwards). Screenshot last verse → `/tmp/b4_last.png`, quiz → `/tmp/b4_quiz.png`.
NOTE: the quiz panel at 360px wide is the existing phone quiz layout — confirm it's not visually broken at this narrow width; if it is, that's a pre-existing phone-width issue, log it but do not fix here.

- [ ] **Step 3: Bump cache + commit**

```bash
git add app.js index.html service-worker.js
git commit -m "cover-reader: last-verse quiz hand-off"
```

---

### Task 5: Font-size reuse + polish

**Files:**
- Modify: `app.js` — apply `state.readingPrefs.size` to `#verseReaderVerse`
- Modify: `styles.css` — size classes for the reader verse
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `state.readingPrefs` (`{ size, bold }`, sizes `small|medium|large|xlarge`), `renderVerseReader()`.

- [ ] **Step 1: Size classes in `styles.css`** (inside the cover-reader section)

```css
.verse-reader-verse[data-size="small"]  { font-size: 18px; }
.verse-reader-verse[data-size="medium"] { font-size: 21px; }
.verse-reader-verse[data-size="large"]  { font-size: 25px; }
.verse-reader-verse[data-size="xlarge"] { font-size: 30px; }
.verse-reader-verse.bold { font-weight: 900; }
```

- [ ] **Step 2: Apply in `renderVerseReader()`**

Add at the top of `renderVerseReader()`:
```js
  const size = state.readingPrefs?.size || "large";   // cover default = large
  elements.verseReaderVerse.dataset.size = size;
  elements.verseReaderVerse.classList.toggle("bold", !!state.readingPrefs?.bold);
```

- [ ] **Step 3: `node --check` + verify**

`node --check app.js` → exit 0.
Manual: set font to 특대 on the normal reading screen, then open the cover reader → verse text is large. Screenshot → `/tmp/b5_xl.png`.

- [ ] **Step 4: Bump cache + commit**

```bash
git add app.js styles.css index.html service-worker.js
git commit -m "cover-reader: reuse reading font-size setting"
```

---

### Task 6: Regression sweep + cache finalize

**Files:** `index.html`, `service-worker.js` (final cache-bust only if the sweep changes anything)

- [ ] **Step 1: Screenshot matrix**

```bash
python -m http.server 8892 &
for wh in 360,572 390,844 414,896 360,400 768,1024 1024,900; do
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox \
    --user-data-dir=$(mktemp -d) --window-size=${wh/,/ } --screenshot=/tmp/bsweep_${wh}.png "http://localhost:8892/" 2>/dev/null
done
taskkill //F //IM python.exe
```
Read each. Expected:
- `360,572` (Fold cover, ratio 0.63) — home renders; "이어서 읽기" opens the reader (verify manually).
- `390,844` / `414,896` (normal phones, ratio < 0.6) — `COVER_MQ` false; "이어서 읽기" → normal `reading-panel`; `#verseReader` never shows.
- `360,400` (Flip-cover-ish, ratio 0.9 > 0.8) — `COVER_MQ` false.
- `768,1024` / `1024,900` — unaffected.

- [ ] **Step 2: `matchMedia` truth check**

Create `/tmp/mq.html`:
```html
<script>document.title = matchMedia("(max-width: 430px) and (min-aspect-ratio: 3/5) and (max-aspect-ratio: 4/5)").matches</script>
```
Serve it and `--dump-dom` at `360,572` (expect title `true`), `390,844` (`false`), `360,400` (`false`). This confirms the gate independent of the ~500px headless min-width quirk.

- [ ] **Step 3: Phone byte-regression gate**

Screenshot `390,844` on `HEAD` vs the pre-plan commit (checkout `styles.css`+`app.js`+`index.html`, screenshot, restore). Read both — must be pixel-identical.

- [ ] **Step 4: Final commit**

If a fix was needed, bump `?v=` + `CACHE_VERSION` and commit `cover-reader: regression sweep fixes`. Else note "sweep clean".

---

## Self-Review

**Spec coverage (section 10):**
- §10.1 detection → Task 1 (`COVER_MQ`), Task 6 Step 2 (truth check). Risk (Fold cover aspect varies by model) is in Global Constraints + §10.1; the manual-toggle fallback is explicitly out of scope per spec and not planned.
- §10.2 entry (home button only, full screen) → Task 2 Step 2.
- §10.3 layout (bar, centered verse, hidden tap zones, heading, font size) → Task 1 markup/CSS, Task 5 font.
- §10.3 tap zones L1/3 R2/3 + swipe + slide → Task 3.
- §10.3 bounce at verse 1 → Task 3 Step 1.
- §10.4 last verse quiz button, forward no-op, completion unchanged → Task 2 (`renderVerseReader` isLast), Task 4.
- §10.5 exit `‹` + `history.pushState` / `popstate` + unfold-closes → Task 2 Step 1/3.
- §10.6 `state.verseReader`, `loadChapterVerses` reuse → Tasks 1–2.
- §10.7 `#verseReader` overlay, hidden on non-cover → Task 1.
- §10.8 tests → Task 6 + per-task verify.

**Placeholder scan:** No TODO/TBD. Font sizes in Task 5 are concrete px. The "manual pass" steps are unavoidable (headless can't tap-drive JS and enforces a min width); each names the exact viewport and expected observation. Task 4 Step 2 flags a possible pre-existing narrow-quiz issue as out-of-scope rather than hand-waving it.

**Type consistency:** `state.verseReader` shape `{ chapterId, verses, index, open }` is set identically in Task 1 Step 2, Task 2 `openVerseReader`, and read in `renderVerseReader` / `verseReaderGo` / `closeVerseReader`. `verseReaderGo(dir)` takes `1 | -1` consistently (Task 3 Steps 1–3). `elements.verseReader*` names introduced in Task 1 Step 4 match the IDs in Task 1 Step 3 markup and every later `elements.verseReader*` reference.
