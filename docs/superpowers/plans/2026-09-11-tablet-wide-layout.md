# Tablet / Wide-Screen Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On wide screens (iPad both orientations, Galaxy Z Fold / iPhone Duo *unfolded*, desktop) the app uses multi-column layouts and a 2-pane master–detail Bible screen instead of a single centered column, while the phone layout stays pixel-identical.

**Architecture:** All wide-screen CSS lives in **one new `@media` block appended to the end of `styles.css`** (so it wins the cascade against the late top-level `.dashboard{grid-template-columns:1fr}` rule at `styles.css:3551-3562`). One shared media-query string is used for both that CSS block and a JS `matchMedia` (`WIDE_MQ`); its `change` event re-renders the Bible pane and the dashboard. The 2-pane Bible screen reuses the four existing `data-view-panel="quiz"` panels (`library-panel`, `chapter-panel`, `reading-panel`, `quiz-panel`) — CSS places them into two columns and `renderQuizStep()` gets a wide-mode branch that marks the left-column panels `.step-active` simultaneously.

**Tech Stack:** Vanilla JS classic script (non-module), plain CSS, no build step, no test framework. Verification = `node --check app.js` + headless Chrome screenshots/DOM dumps against a local `python -m http.server`.

**Spec:** `docs/superpowers/specs/2026-09-10-tablet-wide-ui-design.md` (sections 1–9; section 10 is a separate plan)

## Global Constraints

- **Zero phone regression.** Any viewport that matches neither `WIDE_MQ` nor the cover-reader query must render byte-identically to today. Every wide rule is inside the new `@media` block; no edits to existing phone rules except explicit dead-CSS deletion in Task 2 and the orientation-lock narrowing in Task 7.
- **`WIDE_MQ` string is one literal, used verbatim in two places** — the CSS `@media` prelude and the JS `window.matchMedia(...)` argument:
  `(min-width: 768px), (min-width: 620px) and (min-height: 720px)`
- **Wide CSS block goes at the very end of `styles.css`** (after current line 3995), never earlier — it must come after `styles.css:3551-3562`.
- **Bottom tab bar** (`.mobile-tabbar`) already shows at all widths (`styles.css:3656`); keep it sticky bottom, phone size, 5 columns. Do not move it, do not resize it.
- **Cache-bust on every task that edits `styles.css`, `app.js`, or `service-worker.js`:** bump the `?v=YYYYMMDD-N` query on that file's `<script>`/`<link>` in `index.html` **and** bump `CACHE_VERSION` in `service-worker.js`. Current values at plan start: `styles.css?v=20260909-90`, `app.js?v=20260909-37`, `service-worker.js` `CACHE_VERSION = "v155"`. Increment the trailing number each time.
- **Verify workflow:** `python -m http.server 8891 &` from repo root, then
  `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) --window-size=<W>,<H> --screenshot=<out.png> "http://localhost:8891/"` and Read `<out.png>`. For DOM: swap `--screenshot=...` for `--dump-dom > out.html`. Kill with `taskkill //F //IM python.exe` — **never** `taskkill` chrome.exe (kills the user's real browser).
- Headless Chrome cannot produce real `pointer: coarse` or true device aspect ratios; the login screen also enforces a ~500px min inner width for top-level windows. Where a check can't be done headless, do a code review and say so.

---

### Task 1: Wide-mode scaffold — shared media query + empty CSS block

**Files:**
- Modify: `styles.css` (append at end, currently ends ~line 3995)
- Modify: `app.js` (near other top-level `const` device/DOM setup, e.g. after `const db = firebase.firestore();` at `app.js:195`)
- Modify: `index.html` (cache-bust)
- Modify: `service-worker.js` (cache-bust)

**Interfaces:**
- Produces: `WIDE_MQ` — a `MediaQueryList` global in `app.js`. `WIDE_MQ.matches` (boolean), `WIDE_MQ.addEventListener("change", fn)`.
- Produces: CSS marker comment `/* ===== WIDE LAYOUT (tablet / foldable unfolded / desktop) ===== */` followed by `@media (min-width: 768px), (min-width: 620px) and (min-height: 720px) { }` as the last thing in `styles.css`.

- [ ] **Step 1: Audit the current cascade (read-only, write findings into the plan file as a comment block under this task)**

Run these and record the answers inline here so later tasks don't re-derive them:
```bash
grep -n "^@media" styles.css
grep -n "\.dashboard\b\|\.dashboard\[data-view" styles.css
grep -n "\.mobile-tabbar\b" styles.css
grep -n "\.app-shell\b" styles.css
grep -n "\.view-tabs" styles.css
```
Expected known facts (confirm, note any drift):
- Top-level `@media` blocks: `(max-width: 1260px)` @2663, `(max-width: 760px)` @2669, `(max-width: 420px)` @2863, `(orientation: landscape) and (pointer: coarse)` @2939, `(max-width: 520px)` @3740, plus several `prefers-reduced-motion`.
- `.dashboard` + all `[data-view]` variants forced to `grid-template-columns: 1fr` at `styles.css:3551-3562` (top level — this is what wide rules must override).
- Per-view widths at `styles.css:180-202` are currently dead (overridden by :3551).
- `.mobile-tabbar` `display:none` @170, then `display:grid` @3656 (top level, wins).
- `.view-tabs`: **no HTML markup**; dead CSS at `styles.css:104,141,147,159,164,2691,3547`.

- [ ] **Step 2: Append the empty wide block to `styles.css`**

At the end of the file:
```css

/* ===== WIDE LAYOUT (tablet / foldable unfolded / desktop) =====================
   One block, must stay last in the file so it wins over .dashboard{1fr} at ~L3551.
   Query string is duplicated verbatim as WIDE_MQ in app.js — keep them identical. */
@media (min-width: 768px), (min-width: 620px) and (min-height: 720px) {
  /* filled in by later tasks */
}
```

- [ ] **Step 3: Add `WIDE_MQ` to `app.js`**

After `app.js:195` (`const db = firebase.firestore();`):
```js
// Wide-screen breakpoint — string MUST match the @media prelude at the end of
// styles.css verbatim (tablet, foldable unfolded, desktop). Foldable/Duo
// unfolded are near-square and can be <768 wide, hence the second clause; the
// min-height clause keeps phone-landscape out.
const WIDE_MQ = window.matchMedia("(min-width: 768px), (min-width: 620px) and (min-height: 720px)");
```

- [ ] **Step 4: Verify `node --check`**

Run: `node --check app.js`
Expected: no output (exit 0).

- [ ] **Step 5: Verify no visual change at any width**

```bash
python -m http.server 8891 &
for wh in 390,844 800,1000 1440,900; do
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox \
    --user-data-dir=$(mktemp -d) --window-size=${wh/,/ } --screenshot=/tmp/t1_${wh}.png "http://localhost:8891/" 2>/dev/null
done
taskkill //F //IM python.exe
```
Read `/tmp/t1_390,844.png`, `/tmp/t1_800,1000.png`, `/tmp/t1_1440,900.png`.
Expected: all three identical to pre-change (empty `@media` block + an unused `const` have no visual effect). The 1440 shot still shows a single narrow centered column (wide rules not written yet).

- [ ] **Step 6: Bump cache versions and commit**

In `index.html`: `styles.css?v=20260909-90` → `-91`, `app.js?v=20260909-37` → `-38`.
In `service-worker.js`: `CACHE_VERSION = "v155"` → `"v156"`.
```bash
git add styles.css app.js index.html service-worker.js docs/superpowers/plans/2026-09-11-tablet-wide-layout.md
git commit -m "wide-layout: add WIDE_MQ constant and empty wide @media block"
```

---

### Task 2: Shell width cap + dead-CSS cleanup

**Files:**
- Modify: `styles.css` (inside the wide block from Task 1; plus delete dead `.view-tabs` rules; plus the `@media (max-width: 760px)` tabbar column count)
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: the wide `@media` block from Task 1.
- Produces: `.app-shell` centered at `min(1200px, calc(100% - 48px))` in wide mode.

- [ ] **Step 1: Delete dead `.view-tabs` CSS**

Remove these rule blocks entirely (there is no `.view-tabs` element): `styles.css` lines around 104, 141, 147, 159, 164 (top-level), the `.view-tabs { display:none }` inside `@media (max-width:760px)` (~2691), and `.view-tabs { display:none }` at ~3547. Re-grep after: `grep -n "view-tabs" styles.css` must return nothing.

- [ ] **Step 2: Fix stale tab-bar column count**

In `@media (max-width: 760px)` (~`styles.css:2823`), `.mobile-tabbar { grid-template-columns: repeat(6, 1fr); ... }` → `repeat(5, 1fr)` (HTML has 5 buttons). If it already says 5, note and skip.

- [ ] **Step 3: Add shell width rule to the wide block**

Inside the wide `@media` block:
```css
  .app-shell {
    width: min(1200px, calc(100% - 48px));
    margin-inline: auto;
  }
```

- [ ] **Step 4: Verify desktop + regression**

```bash
python -m http.server 8891 &
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) --window-size=1440,900 --screenshot=/tmp/t2_desktop.png "http://localhost:8891/" 2>/dev/null
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) --window-size=390,844 --screenshot=/tmp/t2_phone.png "http://localhost:8891/" 2>/dev/null
taskkill //F //IM python.exe
```
Read both. Expected: `t2_desktop.png` — content column capped at ~1200px, generous equal side gutters, tab bar unchanged at bottom. `t2_phone.png` — identical to Task 1's phone shot.

- [ ] **Step 5: Bump cache + commit**

`styles.css?v=` → `-92`, `service-worker.js` → `"v157"` (app.js untouched this task; leave its `?v`).
```bash
git add styles.css index.html service-worker.js
git commit -m "wide-layout: cap .app-shell width in wide mode, drop dead .view-tabs CSS"
```

---

### Task 3: Home screen wide layout

**Files:**
- Modify: `styles.css` (wide block)
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: wide block; `.home-panel` markup — `.home-hero` (contains `#nextChapterTitle`, `#homeNextBtn`), `.week-strip#weekStrip`, `.home-stats-grid` (4 stat cells), `.daily-verse`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add home rules to the wide block**

```css
  .dashboard[data-view="home"] {
    width: min(1040px, calc(100% - 48px));
  }
  .home-panel .home-hero {
    /* hero + week strip side by side */
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    align-items: start;
    gap: 16px;
  }
  .home-panel .daily-verse {
    /* full width under the hero row */
  }
  .home-panel .home-stats-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: auto;
  }
```
NOTE: confirm from the audit whether `.week-strip` is currently a sibling of `.home-hero` or nested inside it (`index.html:200-222` shows `.home-hero` then `.week-strip` then `.home-stats-grid` as siblings inside `.home-panel`). If `.week-strip` is a sibling, the hero-row grid above must instead target a wrapper, or use `.home-panel { display: grid; grid-template-columns: 1.4fr 1fr; }` with explicit placement of hero (col 1), week-strip (col 2), daily-verse + stats (`grid-column: 1 / -1`). Pick whichever matches the real DOM; write the final CSS accordingly (no placeholder).

- [ ] **Step 2: Verify at 1024 and 800**

Serve, screenshot `--window-size=1024,900` → `/tmp/t3_1024.png` and `--window-size=800,1000` → `/tmp/t3_800.png`; also `390,844` → `/tmp/t3_phone.png`. Read all.
Expected: 1024 — hero and week strip on one row, daily verse full width below, 4 stat cells in a single row. 800 — same (still ≥620 & ≥720). phone — unchanged (2×2 stats, stacked).

- [ ] **Step 3: Bump cache + commit**

`styles.css?v=` → `-93`, `service-worker.js` → `"v158"`.
```bash
git add styles.css index.html service-worker.js
git commit -m "wide-layout: home — hero+weekstrip row, 4-across stats"
```

---

### Task 4: Profile screen — 3 columns

**Files:**
- Modify: `styles.css` (wide block)
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `.profile-panel` markup — `.panel-heading` then 5 direct-child cards: `.account-card`, `.theme-card`, `.notification-card`, `.profile-form`, `.danger-zone-card` (`index.html:462-554`).

- [ ] **Step 1: Add profile rules to the wide block**

```css
  .dashboard[data-view="profile"] {
    width: min(1200px, calc(100% - 48px));
  }
  .profile-panel {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
  }
  .profile-panel > .panel-heading {
    grid-column: 1 / -1;
  }
```

- [ ] **Step 2: Verify 1024 + phone regression**

Serve; screenshot `1024,1000` → `/tmp/t4_1024.png`, `390,844` → `/tmp/t4_phone.png`. Read both.
Expected: 1024 — heading spans full width, then the 5 cards flow into 3 columns (row 1: account/theme/notification, row 2: profile-form/danger-zone), tops aligned. phone — cards stacked exactly as before.

- [ ] **Step 3: Bump cache + commit**

`styles.css?v=` → `-94`, `service-worker.js` → `"v159"`.
```bash
git add styles.css index.html service-worker.js
git commit -m "wide-layout: profile — 3-column card grid"
```

---

### Task 5: Achievements + Community wide layout

**Files:**
- Modify: `styles.css` (wide block)
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `.achievements-panel` (card grid — confirm its current `grid-template-columns` selector name from the audit), `.community-panel` (`.leader-row` list).

- [ ] **Step 1: Add rules to the wide block**

```css
  .dashboard[data-view="achievements"] {
    width: min(1040px, calc(100% - 48px));
  }
  .achievements-panel .achievement-grid {   /* use the real grid selector found in audit */
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .dashboard[data-view="community"] {
    width: min(920px, calc(100% - 48px));
  }
  /* leaderboard stays single column — no rule needed; verify the
     @media(max-width:760) .leader-row { grid-template-columns: 34px 1fr }
     and .leader-stats { grid-column: 1 / -1 } do NOT leak into wide. They are
     inside max-width blocks so they won't; confirm in screenshot. */
```
Replace `.achievement-grid` with whatever the audit shows is the real container class for the achievement cards. If achievements cards are direct children of `.achievements-panel` with no inner grid wrapper, target `.achievements-panel` directly with `display:grid`.

- [ ] **Step 2: Verify**

Serve; screenshots `1024,1000` → `/tmp/t5_ach.png` (achievements view — need to switch view; use `--dump-dom` won't switch views, so screenshot the default then note that view-switch verification needs the `?` deep-link or manual). Simplest: DOM-dump at 1024 and confirm the CSS rule is present + inspect `.achievements-panel` computed layout via a second Chrome run with `--dump-dom` after appending `#achievements` won't work (app uses JS nav). Acceptable check: screenshot 1024 on default view, then a `1024` screenshot after adding a tiny query-string hook is out of scope — instead verify by temporarily setting `state.activeView` via `--virtual-time-budget` is also out of scope. **Pragmatic verification:** load at 1024, use Chrome `--dump-dom`, grep the inlined `<style>`/linked CSS is loaded, and visually confirm on `community` + `achievements` by driving the tab bar in a non-headless manual pass (note in commit that manual tab-drive was used). Also screenshot `390,844` for regression.
Expected: achievements cards 3-across at 1024; leaderboard still one column; phone unchanged.

- [ ] **Step 3: Bump cache + commit**

`styles.css?v=` → `-95`, `service-worker.js` → `"v160"`.
```bash
git add styles.css index.html service-worker.js
git commit -m "wide-layout: achievements 3-col grid, community width cap"
```

---

### Task 6: Bible 2-pane — CSS placement

**Files:**
- Modify: `styles.css` (wide block)
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `.dashboard[data-view="quiz"]`; the four panels `.library-panel`, `.chapter-panel`, `.reading-panel`, `.quiz-panel` (all `data-view-panel="quiz"`, toggled `.step-active` / `.view-active` — confirm which class actually controls visibility from `renderQuizStep()` at `app.js:1689` and `renderView()` at `app.js:1653`).
- Produces: a two-column grid on `.dashboard[data-view="quiz"]` with library+chapter in column 1 and reading/quiz in column 2. **Only fully visible after Task 7's JS.** This task verifies via forced classes.

- [ ] **Step 1: Add 2-pane grid to the wide block**

```css
  .dashboard[data-view="quiz"] {
    grid-template-columns: 300px minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    gap: 16px;
    /* cap height so each pane scrolls independently inside the .app-shell scroller */
    align-items: start;
  }
  .dashboard[data-view="quiz"] > .library-panel {
    grid-column: 1;
    grid-row: 1;
  }
  .dashboard[data-view="quiz"] > .chapter-panel {
    grid-column: 1;
    grid-row: 2;
  }
  .dashboard[data-view="quiz"] > .reading-panel,
  .dashboard[data-view="quiz"] > .quiz-panel {
    grid-column: 2;
    grid-row: 1 / -1;
  }
  /* each column independently scrollable */
  .dashboard[data-view="quiz"] > .library-panel,
  .dashboard[data-view="quiz"] > .chapter-panel,
  .dashboard[data-view="quiz"] > .reading-panel,
  .dashboard[data-view="quiz"] > .quiz-panel {
    max-height: calc(100dvh - 140px);   /* tune against real tab-bar + shell padding in Step 2 */
    overflow-y: auto;
  }
  /* reading text stays readable — don't stretch full pane width */
  .dashboard[data-view="quiz"] .reading-text {
    max-width: 640px;
    margin-inline: auto;
  }
  /* back buttons are meaningless when both panes are always visible */
  .dashboard[data-view="quiz"] #chapterBackBtn,
  .dashboard[data-view="quiz"] #readingBackBtn {
    display: none;
  }
```
Confirm the back-button IDs from `index.html` (`chapterBackBtn`, `readingBackBtn` at `index.html:376,400`).

- [ ] **Step 2: Verify via forced classes (DOM dump won't switch views; use a throwaway inline test)**

Serve. In a headless run, append `--virtual-time-budget=3000` and load `http://localhost:8891/#`, then in a SECOND step open the page and manually (non-headless) navigate to the Bible tab at `--window-size=1024,900` and screenshot `/tmp/t6_1024.png`. Because JS still only shows one `.step-active` panel, expect: the visible panel sits in its grid cell (e.g. `library-panel` fills column 1 top-left, right column empty). Tune `calc(100dvh - 140px)` if the pane clips under the tab bar or leaves a big gap.
Also screenshot `390,844` Bible tab → `/tmp/t6_phone.png`: must be unchanged (single panel, full width, back buttons visible).

- [ ] **Step 3: Bump cache + commit**

`styles.css?v=` → `-96`, `service-worker.js` → `"v161"`.
```bash
git add styles.css index.html service-worker.js
git commit -m "wide-layout: Bible screen 2-pane grid placement (CSS)"
```

---

### Task 7: Bible 2-pane — `renderQuizStep()` wide branch + resize handling

**Files:**
- Modify: `app.js` — `renderQuizStep()` at `app.js:1689-1694`; add a `WIDE_MQ` change listener near the other top-level `addEventListener` wiring (end of file, ~`app.js:2503` area)
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `WIDE_MQ` (Task 1); `state.activeView`, `state.quizStep`; the panels' visibility class (from audit — assume `.step-active` per `renderQuizStep`).
- Produces: in wide mode + `activeView==="quiz"`, `library-panel` & `chapter-panel` always `.step-active`, `reading-panel` `.step-active` unless `quizStep==="quiz"`, `quiz-panel` `.step-active` only when `quizStep==="quiz"`.

- [ ] **Step 1: Read the current function exactly**

`app.js:1689`:
```js
function renderQuizStep() {
  document.querySelectorAll("[data-quiz-step]").forEach((panel) => {
    panel.classList.toggle("step-active", panel.dataset.quizStep === state.quizStep);
  });
  if (state.quizStep === "books") animateBookGridFill();
}
```

- [ ] **Step 2: Rewrite `renderQuizStep()` with the wide branch**

```js
function renderQuizStep() {
  const wide = WIDE_MQ.matches && state.activeView === "quiz";
  document.querySelectorAll("[data-quiz-step]").forEach((panel) => {
    const step = panel.dataset.quizStep;
    let active;
    if (wide) {
      if (step === "books" || step === "chapters") active = true;
      else if (step === "reading") active = state.quizStep !== "quiz";
      else if (step === "quiz") active = state.quizStep === "quiz";
      else active = step === state.quizStep;
    } else {
      active = step === state.quizStep;
    }
    panel.classList.toggle("step-active", active);
  });
  if (state.quizStep === "books") animateBookGridFill();
}
```

- [ ] **Step 3: Add the `WIDE_MQ` change listener**

Near the end of `app.js` with the other top-level wiring:
```js
// Foldable fold/unfold or a window resize across the wide breakpoint needs a
// full re-render — the Bible pane layout and every wide CSS grid flip at once.
WIDE_MQ.addEventListener("change", () => {
  renderQuizStep();
  render();
});
```

- [ ] **Step 4: `node --check`**

Run: `node --check app.js` → exit 0.

- [ ] **Step 5: Verify wide + phone**

Serve. Non-headless manual pass at `1024,900` (headless can't drive the JS tab nav reliably): open Bible tab → expect library list + chapter grid stacked in the left column, reading pane on the right, all visible at once; tap a book → chapter grid updates in place, left column stays; tap a chapter → right pane shows that chapter's text (≤640px, centered); tap "문제 풀기" → right pane swaps to quiz, left column still there. Screenshot `/tmp/t7_1024.png`.
Headless regression: `390,844`, DOM-dump the Bible view is not switch-able headless, so instead run `node -e "…"` sanity: load `app.js` is not DOM-runnable. Acceptable: manual phone-width pass in a real browser at 390px — step through books→chapters→reading→quiz, confirm one panel at a time, back buttons present. Screenshot `/tmp/t7_phone.png`.
Also: resize the real browser from 1200 → 500 → 1200 on the Bible view; confirm layout flips both ways without a reload (the `change` listener).

- [ ] **Step 6: Bump cache + commit**

`app.js?v=` → `-39`, `styles.css?v=` unchanged, `service-worker.js` → `"v162"`.
```bash
git add app.js index.html service-worker.js
git commit -m "wide-layout: Bible 2-pane render branch + WIDE_MQ change listener"
```

---

### Task 8: Orientation lock → phone-landscape only

**Files:**
- Modify: `styles.css` — the `@media (orientation: landscape) and (pointer: coarse)` block at `styles.css:2939`
- Modify: `index.html`, `service-worker.js` (cache-bust)

**Interfaces:** none produced/consumed.

- [ ] **Step 1: Narrow the media query**

`styles.css:2939`:
```css
@media (orientation: landscape) and (pointer: coarse) {
```
→
```css
@media (orientation: landscape) and (pointer: coarse) and (max-height: 500px) {
```
Rationale (put as a comment above it): modern phones in landscape are 844–932px wide so `max-width` can't distinguish them from tablets; landscape height (~375–430 phone vs 700+ tablet/foldable) can.

- [ ] **Step 2: Verify (code review — headless can't do `pointer: coarse`)**

Confirm by reading: the block now only matches when viewport height ≤ 500 AND coarse pointer AND landscape. A tablet/foldable in landscape (height ≥ ~800) no longer triggers the rotate overlay; a phone in landscape (height ~400) still does. Note in the commit that this was verified by inspection, not headless.
Screenshot `390,844` portrait → `/tmp/t8_phone.png`: rotate overlay must NOT show (portrait), page normal — i.e. no regression to portrait phones.

- [ ] **Step 3: Bump cache + commit**

`styles.css?v=` → `-97`, `service-worker.js` → `"v163"`.
```bash
git add styles.css index.html service-worker.js
git commit -m "wide-layout: restrict portrait-lock overlay to phone landscape (max-height:500)"
```

---

### Task 9: Bible left-pane collapse toggle (620–900px)

**Files:**
- Modify: `index.html` — add a collapse toggle button inside the Bible left column (e.g. in `.library-panel .panel-heading` or a new bar). Confirm exact insertion point in the audit.
- Modify: `app.js` — `state` gets `biblePaneCollapsed: false` (near `app.js:239`); toggle handler; `renderQuizStep()` or a small `applyBiblePane()` sets a class on `.dashboard`
- Modify: `styles.css` (wide block — the 620–900 sub-range)
- Modify: `service-worker.js` (cache-bust)

**Interfaces:**
- Consumes: `WIDE_MQ`, the 2-pane grid from Task 6.
- Produces: `.dashboard.bible-pane-collapsed[data-view="quiz"]` → left column hidden, right pane full width.

- [ ] **Step 1: Markup — collapse button**

In `index.html`, inside the Bible left column heading (confirm selector), add:
```html
<button class="bible-pane-toggle" id="biblePaneToggle" type="button" aria-label="책·장 목록 접기/펼치기" hidden>☰</button>
```
`hidden` by default; JS un-hides it only in the 620–900 range.

- [ ] **Step 2: State + handler in `app.js`**

Add to `state` (`app.js:239` area): `biblePaneCollapsed: false,`
Add near end-of-file wiring:
```js
const NARROW_WIDE_MQ = window.matchMedia("(min-width: 620px) and (max-width: 899px)");
function applyBiblePane() {
  const inRange = NARROW_WIDE_MQ.matches;
  elements.biblePaneToggle.hidden = !inRange || state.activeView !== "quiz";
  elements.dashboard.classList.toggle("bible-pane-collapsed", inRange && state.biblePaneCollapsed);
}
elements.biblePaneToggle.addEventListener("click", () => {
  state.biblePaneCollapsed = !state.biblePaneCollapsed;
  applyBiblePane();
});
NARROW_WIDE_MQ.addEventListener("change", applyBiblePane);
```
Add `biblePaneToggle: document.querySelector("#biblePaneToggle"),` to the `elements` map. Call `applyBiblePane()` at the end of `renderQuizStep()` and `renderView()`.

- [ ] **Step 3: CSS for collapsed state (wide block)**

```css
  @media (max-width: 899px) {
    .dashboard[data-view="quiz"] { grid-template-columns: 240px minmax(0, 1fr); }
    .dashboard.bible-pane-collapsed[data-view="quiz"] {
      grid-template-columns: 1fr;
    }
    .dashboard.bible-pane-collapsed[data-view="quiz"] > .library-panel,
    .dashboard.bible-pane-collapsed[data-view="quiz"] > .chapter-panel {
      display: none;
    }
  }
```
(This nested `@media` sits inside the outer wide block.)

- [ ] **Step 4: `node --check` + verify at 800**

`node --check app.js` → exit 0.
Serve; manual pass at `800,1000` on the Bible view: toggle button visible; tap → left column hides, reading pane goes full width; tap again → restored. Screenshot `/tmp/t9_800_open.png` and `/tmp/t9_800_collapsed.png`. At `1024` the toggle is hidden (out of range). At `390` the button stays `hidden`.

- [ ] **Step 5: Bump cache + commit**

`app.js?v=` → `-40`, `styles.css?v=` → `-98`, `service-worker.js` → `"v164"`.
```bash
git add app.js styles.css index.html service-worker.js
git commit -m "wide-layout: collapsible Bible left pane for 620-900px"
```

---

### Task 10: Full regression sweep + final cache bump

**Files:**
- Modify: `index.html`, `service-worker.js` (final cache-bust only if anything changed in the sweep)

- [ ] **Step 1: Screenshot matrix**

```bash
python -m http.server 8891 &
for wh in 360,780 390,844 414,896 620,760 720,940 820,1180 1180,820 1440,900; do
  d=$(mktemp -d)
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-sandbox \
    --user-data-dir="$d" --window-size=${wh/,/ } --screenshot=/tmp/sweep_${wh}.png "http://localhost:8891/" 2>/dev/null
done
taskkill //F //IM python.exe
```
Read each `/tmp/sweep_*.png`.
Expected:
- 360/390/414 — phone layout, byte-identical to main-branch baseline (compare against a checkout of the pre-plan commit if unsure).
- 620×760 — wide (2nd clause: 620≥620, 760≥720). Multi-column home/profile, 2-pane Bible with collapse toggle.
- 720×940 — wide, same.
- 820×1180 (iPad portrait) — wide, 2-pane Bible with collapse toggle (in 620–900 range → 240px left).
- 1180×820 (iPad landscape) — wide, ≥900 → fixed 300px left pane, no toggle.
- 1440×900 — wide desktop, `.app-shell` capped ~1200.

- [ ] **Step 2: Per-view DOM check**

For a 1024-wide non-headless session, drive the tab bar through home / stats / 성경 / 빌보드 / 칭호 / 내정보 and confirm each `.dashboard[data-view=...]` gets its wide width and the panels' `.view-active` / `.step-active` are correct. Record pass/fail per view here.

- [ ] **Step 3: Phone byte-regression gate**

```bash
git stash   # if any uncommitted; else skip
git checkout <pre-plan-commit> -- styles.css app.js
# screenshot 390,844 baseline → /tmp/base_390.png
git checkout HEAD -- styles.css app.js
# screenshot 390,844 current → /tmp/cur_390.png
```
Read both, confirm pixel-identical. If not, the regression must be fixed before this task's commit.

- [ ] **Step 4: Final commit**

If the sweep required any tweak, bump `styles.css?v=`/`app.js?v=` and `CACHE_VERSION` once more and:
```bash
git add -A
git commit -m "wide-layout: regression sweep fixes + final cache bump"
```
If nothing changed, note "sweep clean, no commit" here.

---

## Self-Review

**Spec coverage:**
- §1 (shell/nav) → Tasks 1, 2 (WIDE_MQ, shell cap, dead `.view-tabs` cleanup; nav already unified — noted).
- §1.3 (breakpoint definition, WIDE_MQ constant) → Task 1.
- §2 (Bible 2-pane) → Tasks 6 (CSS), 7 (JS), 9 (collapse).
- §3 (profile 3-col) → Task 4.
- §4 (home) → Task 3.
- §5 (achievements) → Task 5.
- §6 (community) → Task 5.
- §7 (orientation) → Task 8.
- §8 (risks) → addressed in Global Constraints + Task 1 audit + Task 10 regression gate.
- §9 (testing) → Task 10 + per-task verify steps.
- Gap: §2.2 "책 미선택 시 우 pane 빈 안내" — add as a sub-step of Task 7 Step 2 (when `state.selectedChapterId` is unset in wide mode, `reading-panel` shows a placeholder). Executor: include a `.reading-text` empty-state string "왼쪽에서 장을 선택하세요" gated on `!state.selectedChapterId && WIDE_MQ.matches` inside `renderReading()` / `renderQuizStep()`.

**Placeholder scan:** Task 3 Step 1 and Task 5 Step 1/2 contain "confirm the real selector / pick whichever matches real DOM" — these are deliberate: the audit in Task 1 resolves them and the executor writes the final CSS with no placeholder. Task 6 `calc(100dvh - 140px)` is a starting value explicitly tuned in Step 2. No "TODO/TBD/handle edge cases" left.

**Type consistency:** `WIDE_MQ` (Task 1) used in Tasks 7, 9. `renderQuizStep()` signature unchanged. `applyBiblePane()` / `NARROW_WIDE_MQ` / `state.biblePaneCollapsed` / `#biblePaneToggle` all introduced together in Task 9. `.step-active` is the visibility class throughout (confirm in Task 1 audit; if it's actually `.view-active` for these panels, Tasks 6/7 selectors and the `renderQuizStep` toggle target change accordingly — flagged).
