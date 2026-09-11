const DATA = BIBLE_APP_DATA;
const LEGACY_PROGRESS_KEY = "bible-reading-quiz-progress-v1";
const THEME_PREF_KEY = "themePreference";

// Applied as early as possible (before the splash screen is removed) so
// there's no flash of the light theme — per-device only (localStorage),
// not synced to the account. New/first-time users always start light.
(function applyStoredThemePreference() {
  try {
    if (localStorage.getItem(THEME_PREF_KEY) === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch {
    // Private mode / storage disabled — just stay on the light default.
  }
})();

// Local calendar date (not UTC) — using toISOString() here shifts the date by
// a day for part of the day in any UTC+ timezone (e.g. KST), since it
// converts through UTC before formatting.
function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const TODAY = localDateStr();
const OPTION_MARKS = ["①", "②", "③", "④"];
const DEFAULT_TITLE = "성경 통독자";

const SHORT_BOOK_NAMES = {
  창세기: "창",
  출애굽기: "출",
  레위기: "레",
  민수기: "민",
  신명기: "신",
  여호수아: "수",
  사사기: "삿",
  룻기: "룻",
  사무엘상: "삼상",
  사무엘하: "삼하",
  열왕기상: "왕상",
  열왕기하: "왕하",
  역대상: "대상",
  역대하: "대하",
  에스라: "스",
  느헤미야: "느",
  에스더: "에",
  욥기: "욥",
  시편: "시",
  잠언: "잠",
  전도서: "전",
  아가: "아",
  이사야: "사",
  예레미야: "렘",
  예레미야애가: "애",
  에스겔: "겔",
  다니엘: "단",
  호세아: "호",
  요엘: "욜",
  아모스: "암",
  오바댜: "옵",
  요나: "욘",
  미가: "미",
  나훔: "나",
  하박국: "합",
  스바냐: "습",
  학개: "학",
  스가랴: "슥",
  말라기: "말",
  마태복음: "마",
  마가복음: "막",
  누가복음: "눅",
  요한복음: "요",
  사도행전: "행",
  로마서: "롬",
  고린도전서: "고전",
  고린도후서: "고후",
  갈라디아서: "갈",
  에베소서: "엡",
  빌립보서: "빌",
  골로새서: "골",
  데살로니가전서: "살전",
  데살로니가후서: "살후",
  디모데전서: "딤전",
  디모데후서: "딤후",
  디도서: "딛",
  빌레몬서: "몬",
  히브리서: "히",
  야고보서: "약",
  베드로전서: "벧전",
  베드로후서: "벧후",
  요한일서: "요일",
  요한이서: "요이",
  요한삼서: "요삼",
  유다서: "유",
  요한계시록: "계",
};

const BOOK_ENGLISH_NAMES = {
  창세기: "Genesis",
  출애굽기: "Exodus",
  레위기: "Leviticus",
  민수기: "Numbers",
  신명기: "Deuteronomy",
  여호수아: "Joshua",
  사사기: "Judges",
  룻기: "Ruth",
  사무엘상: "1 Samuel",
  사무엘하: "2 Samuel",
  열왕기상: "1 Kings",
  열왕기하: "2 Kings",
  역대상: "1 Chronicles",
  역대하: "2 Chronicles",
  에스라: "Ezra",
  느헤미야: "Nehemiah",
  에스더: "Esther",
  욥기: "Job",
  시편: "Psalms",
  잠언: "Proverbs",
  전도서: "Ecclesiastes",
  아가: "Song of songs",
  이사야: "Isaiah",
  예레미야: "Jeremiah",
  예레미야애가: "Lamentations",
  에스겔: "Ezekiel",
  다니엘: "Daniel",
  호세아: "Hosea",
  요엘: "Joel",
  아모스: "Amos",
  오바댜: "Obadiah",
  요나: "Jonah",
  미가: "Micah",
  나훔: "Nahum",
  하박국: "Habakkuk",
  스바냐: "Zephaniah",
  학개: "Haggai",
  스가랴: "Zechariah",
  말라기: "Malachi",
  마태복음: "Matthew",
  마가복음: "Mark",
  누가복음: "Luke",
  요한복음: "John",
  사도행전: "Acts",
  로마서: "Romans",
  고린도전서: "1 Corinthians",
  고린도후서: "2 Corinthians",
  갈라디아서: "Galatians",
  에베소서: "Ephesians",
  빌립보서: "Philippians",
  골로새서: "Colossians",
  데살로니가전서: "1 Thessalonians",
  데살로니가후서: "2 Thessalonians",
  디모데전서: "1 Timothy",
  디모데후서: "2 Timothy",
  디도서: "Titus",
  빌레몬서: "Philemon",
  히브리서: "Hebrews",
  야고보서: "James",
  베드로전서: "1 Peter",
  베드로후서: "2 Peter",
  요한일서: "1 John",
  요한이서: "2 John",
  요한삼서: "3 John",
  유다서: "Jude",
  요한계시록: "Revelation",
};

// DAILY_VERSES ({ref, text}[]) comes from data/verses.js.
function pickRandomVerse() {
  return DAILY_VERSES[Math.floor(Math.random() * DAILY_VERSES.length)];
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "좋은 아침이에요";
  if (hour >= 12 && hour < 18) return "좋은 오후예요";
  if (hour >= 18 && hour < 22) return "좋은 저녁이에요";
  return "편안한 밤 보내세요";
}

const firebaseConfig = {
  apiKey: "AIzaSyAVVsLkuKvU7La0exZ8mJ6eqXzLZYzSUXQ",
  authDomain: "jybible-2d580.firebaseapp.com",
  projectId: "jybible-2d580",
  storageBucket: "jybible-2d580.firebasestorage.app",
  messagingSenderId: "393921773529",
  appId: "1:393921773529:web:f1a84acca2ef22c717a3c8",
  measurementId: "G-MNJZMH38XJ",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Wide-screen breakpoint — string MUST match the @media prelude at the end of
// styles.css verbatim (tablet, foldable unfolded, desktop). Foldable/Duo
// unfolded are near-square and can be <768 wide, hence the second clause; the
// min-height clause keeps phone-landscape out.
const WIDE_MQ = window.matchMedia("(min-width: 768px), (min-width: 620px) and (min-height: 720px)");

// Sub-range of the wide layout (Task 9) where the Bible screen's left column
// (library + chapter panels) is narrow enough that a collapse toggle is
// worth offering. Deliberately separate from WIDE_MQ above — this is NOT a
// redefinition of "wide", just the band within wide where the toggle button
// shows. At >=900px the toggle stays hidden and the pane is always expanded.
const NARROW_WIDE_MQ = window.matchMedia("(min-width: 620px) and (max-width: 899px)");

db.enablePersistence().catch(() => {
  // Multiple tabs open, or the browser doesn't support persistence — offline
  // reads/writes just won't be queued locally, which is fine, not fatal.
});

try {
  firebase.analytics();
} catch {
  // Analytics unsupported in this browser/environment; safe to skip.
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Offline caching just won't be available; the app still works online.
    });
  });
}

const chaptersByBook = DATA.books.reduce((map, book) => {
  map[book.name] = DATA.chapters.filter((chapter) => chapter.book === book.name);
  return map;
}, {});

const chaptersById = new Map(DATA.chapters.map((chapter) => [chapter.id, chapter]));

const READING_PREFS_KEY = "readingPrefs";

function loadReadingPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(READING_PREFS_KEY));
    return {
      size: ["small", "medium", "large"].includes(parsed?.size) ? parsed.size : "medium",
      bold: Boolean(parsed?.bold),
    };
  } catch {
    return { size: "medium", bold: false };
  }
}

const state = {
  activeView: "home",
  quizStep: "books",
  selectedBook: DATA.books[0].name,
  selectedChapterId: DATA.chapters[0].id,
  isAuthenticated: false,
  firebaseUser: null,
  creatingAccount: false,
  user: getSignedOutUser(),
  progress: createProgress(),
  leaderboard: [],
  achievementQueue: [],
  currentAchievementModal: null,
  dailyVerse: pickRandomVerse(),
  readingPrefs: loadReadingPrefs(),
  bookSearchQuery: "",
  bookTestamentFilter: "old",
  biblePaneCollapsed: false,
};

// Debug hook only — lets you inspect/mutate state from the browser console.
window.__appState = state;

const elements = {
  splashScreen: document.querySelector("#splashScreen"),
  appShell: document.querySelector("#appShell"),
  loginGate: document.querySelector("#loginGate"),
  loginScroll: document.querySelector("#loginScroll"),
  backToLoginRow: document.querySelector("#backToLoginRow"),
  authModeButtons: document.querySelectorAll("[data-auth-mode]"),
  gateLoginForm: document.querySelector("#gateLoginForm"),
  gateLoginEmail: document.querySelector("#gateLoginEmail"),
  gateLoginPassword: document.querySelector("#gateLoginPassword"),
  forgotPasswordBtn: document.querySelector("#forgotPasswordBtn"),
  googleLoginBtn: document.querySelector("#googleLoginBtn"),
  naverLoginBtn: document.querySelector("#naverLoginBtn"),
  socialLoginRow: document.querySelector("#socialLoginRow"),
  gateSocialProfileForm: document.querySelector("#gateSocialProfileForm"),
  socialProfileMessage: document.querySelector("#socialProfileMessage"),
  socialNameField: document.querySelector("#socialNameField"),
  socialProfileName: document.querySelector("#socialProfileName"),
  socialProfileNickname: document.querySelector("#socialProfileNickname"),
  socialProfileSubmitBtn: document.querySelector("#socialProfileSubmitBtn"),
  gateSignupForm: document.querySelector("#gateSignupForm"),
  gateSignupEmail: document.querySelector("#gateSignupEmail"),
  gateSignupPassword: document.querySelector("#gateSignupPassword"),
  gateSignupPasswordConfirm: document.querySelector("#gateSignupPasswordConfirm"),
  passwordMatchMessage: document.querySelector("#passwordMatchMessage"),
  passwordToggleButtons: document.querySelectorAll("[data-password-target]"),
  gateSignupName: document.querySelector("#gateSignupName"),
  gateSignupNickname: document.querySelector("#gateSignupNickname"),
  signupEmailError: document.querySelector("#signupEmailError"),
  loginSubmitBtn: document.querySelector("#loginSubmitBtn"),
  signupSubmitBtn: document.querySelector("#signupSubmitBtn"),
  gateLoginMessage: document.querySelector("#gateLoginMessage"),
  installBanner: document.querySelector("#installBanner"),
  installBannerTitle: document.querySelector("#installBannerTitle"),
  installBannerBody: document.querySelector("#installBannerBody"),
  installActionBtn: document.querySelector("#installActionBtn"),
  installTutorialBtn: document.querySelector("#installTutorialBtn"),
  installBannerCloseBtn: document.querySelector("#installBannerCloseBtn"),
  homeInstallBanner: document.querySelector("#homeInstallBanner"),
  homeInstallBannerTitle: document.querySelector("#homeInstallBannerTitle"),
  homeInstallBannerBody: document.querySelector("#homeInstallBannerBody"),
  homeInstallActionBtn: document.querySelector("#homeInstallActionBtn"),
  homeInstallTutorialBtn: document.querySelector("#homeInstallTutorialBtn"),
  homeInstallBannerCloseBtn: document.querySelector("#homeInstallBannerCloseBtn"),
  tutorialModal: document.querySelector("#tutorialModal"),
  tutorialSkipBtn: document.querySelector("#tutorialSkipBtn"),
  tutorialNextBtn: document.querySelector("#tutorialNextBtn"),
  tutorialSteps: document.querySelectorAll("#tutorialModal .tutorial-step"),
  tutorialDots: document.querySelectorAll("#tutorialDots .tutorial-dot"),
  installTutorialModal: document.querySelector("#installTutorialModal"),
  installTutorialSkipBtn: document.querySelector("#installTutorialSkipBtn"),
  installTutorialNextBtn: document.querySelector("#installTutorialNextBtn"),
  installTutorialSteps: document.querySelectorAll("#installTutorialModal .tutorial-step"),
  installTutorialDots: document.querySelectorAll("#installTutorialDots .tutorial-dot"),
  dashboard: document.querySelector("#dashboard"),
  viewTabs: document.querySelectorAll("[data-view-tab]"),
  viewPanels: document.querySelectorAll("[data-view-panel]"),
  jumpButtons: document.querySelectorAll("[data-jump-view]"),
  homeTitle: document.querySelector("#homeTitle"),
  homeGreeting: document.querySelector("#homeGreeting"),
  homeStreak: document.querySelector("#homeStreak"),
  homeNextBtn: document.querySelector("#homeNextBtn"),
  nextChapterTitle: document.querySelector("#nextChapterTitle"),
  heroBookEnglish: document.querySelector("#heroBookEnglish"),
  weekStrip: document.querySelector("#weekStrip"),
  homeTotalDone: document.querySelector("#homeTotalDone"),
  homeTotalCount: document.querySelector("#homeTotalCount"),
  homeTotalBar: document.querySelector("#homeTotalBar"),
  homeTotalPercent: document.querySelector("#homeTotalPercent"),
  homeTodayProgress: document.querySelector("#homeTodayProgress"),
  homeOldCount: document.querySelector("#homeOldCount"),
  homeOldProgress: document.querySelector("#homeOldProgress"),
  homeNewCount: document.querySelector("#homeNewCount"),
  homeNewProgress: document.querySelector("#homeNewProgress"),
  totalRing: document.querySelector("#totalRing"),
  totalPercent: document.querySelector("#totalPercent"),
  totalCompleted: document.querySelector("#totalCompleted"),
  remainingText: document.querySelector("#remainingText"),
  todayCount: document.querySelector("#todayCount"),
  streakCount: document.querySelector("#streakCount"),
  longestStreakCount: document.querySelector("#longestStreakCount"),
  oldProgress: document.querySelector("#oldProgress"),
  newProgress: document.querySelector("#newProgress"),
  dailyTarget: document.querySelector("#dailyTarget"),
  targetBar: document.querySelector("#targetBar"),
  targetText: document.querySelector("#targetText"),
  statusTableBody: document.querySelector("#statusTableBody"),
  bookGrid: document.querySelector("#bookGrid"),
  bookSearchInput: document.querySelector("#bookSearchInput"),
  bookGridEmpty: document.querySelector("#bookGridEmpty"),
  librarySubtitle: document.querySelector("#librarySubtitle"),
  biblePaneToggle: document.querySelector("#biblePaneToggle"),
  librarySectionLabel: document.querySelector("#librarySectionLabel"),
  librarySectionCount: document.querySelector("#librarySectionCount"),
  testamentToggleButtons: document.querySelectorAll("#testamentToggle [data-testament]"),
  testamentToggleThumb: document.querySelector("#testamentToggleThumb"),
  chapterBackBtn: document.querySelector("#chapterBackBtn"),
  quizBackBtn: document.querySelector("#quizBackBtn"),
  selectedTestament: document.querySelector("#selectedTestament"),
  selectedBook: document.querySelector("#selectedBook"),
  bookPercent: document.querySelector("#bookPercent"),
  bookCount: document.querySelector("#bookCount"),
  chapterGrid: document.querySelector("#chapterGrid"),
  readingBackBtn: document.querySelector("#readingBackBtn"),
  readingKicker: document.querySelector("#readingKicker"),
  readingText: document.querySelector("#readingText"),
  readingSizeButtons: document.querySelectorAll("[data-font-size]"),
  readingSizeThumb: document.querySelector("#readingSizeThumb"),
  readingBoldBtn: document.querySelector("#readingBoldBtn"),
  startQuizBtn: document.querySelector("#startQuizBtn"),
  chapterKicker: document.querySelector("#chapterKicker"),
  chapterStatus: document.querySelector("#chapterStatus"),
  chapterLink: document.querySelector("#chapterLink"),
  questionText: document.querySelector("#questionText"),
  hintBtn: document.querySelector("#hintBtn"),
  hintText: document.querySelector("#hintText"),
  optionsList: document.querySelector("#optionsList"),
  feedback: document.querySelector("#feedback"),
  nextBtn: document.querySelector("#nextBtn"),
  undoBtn: document.querySelector("#undoBtn"),
  quizExitBtn: document.querySelector("#quizExitBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  accountEmail: document.querySelector("#accountEmail"),
  accountName: document.querySelector("#accountName"),
  darkModeToggle: document.querySelector("#darkModeToggle"),
  notificationStatusText: document.querySelector("#notificationStatusText"),
  momentVerseToggle: document.querySelector("#momentVerseToggle"),
  momentVerseCountRow: document.querySelector("#momentVerseCountRow"),
  momentVerseCountSelect: document.querySelector("#momentVerseCountSelect"),
  notificationPwaStatus: document.querySelector("#notificationPwaStatus"),
  notificationPwaActions: document.querySelector("#notificationPwaActions"),
  notificationInstallActionBtn: document.querySelector("#notificationInstallActionBtn"),
  notificationInstallTutorialBtn: document.querySelector("#notificationInstallTutorialBtn"),
  profileForm: document.querySelector("#profileForm"),
  profileNickname: document.querySelector("#profileNickname"),
  profileDailyTarget: document.querySelector("#profileDailyTarget"),
  shareProfile: document.querySelector("#shareProfile"),
  profileMessage: document.querySelector("#profileMessage"),
  leaderboard: document.querySelector("#leaderboard"),
  leaderboardCountdown: document.querySelector("#leaderboardCountdown"),
  achievementCount: document.querySelector("#achievementCount"),
  achievementGroups: document.querySelector("#achievementGroups"),
  representativeTitleSelect: document.querySelector("#representativeTitleSelect"),
  achievementModal: document.querySelector("#achievementModal"),
  achievementModalRarity: document.querySelector("#achievementModalRarity"),
  achievementModalName: document.querySelector("#achievementModalName"),
  achievementModalCondition: document.querySelector("#achievementModalCondition"),
  achievementModalCloseBtn: document.querySelector("#achievementModalCloseBtn"),
  viewRecordsBtn: document.querySelector("#viewRecordsBtn"),
  calendarModal: document.querySelector("#calendarModal"),
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarPrevBtn: document.querySelector("#calendarPrevBtn"),
  calendarNextBtn: document.querySelector("#calendarNextBtn"),
  calendarCloseBtn: document.querySelector("#calendarCloseBtn"),
};

function createProgress() {
  return {
    completed: {},
    attempts: {},
    dailyTarget: 3,
    lastChapterId: 1,
    cycles: 0,
    totalChaptersRead: 0,
    readDates: [],
    earlyMorningCount: 0,
    midnightCount: 0,
    unlockedAchievements: {},
    quizCorrectStreak: 0,
  };
}

function loadLegacyProgress() {
  try {
    return { ...createProgress(), ...JSON.parse(localStorage.getItem(LEGACY_PROGRESS_KEY)) };
  } catch {
    return createProgress();
  }
}

// ── Achievements ("칭호") ──────────────────────────────────────────────
// Conditions live in data/achievements.js (window.ACHIEVEMENTS). Everything
// here just derives the numbers those conditions check against.

function getUniqueSortedReadDates(progress) {
  const dates = new Set(progress.readDates || []);
  Object.values(progress.completed || {}).forEach((entry) => {
    if (entry?.date) dates.add(entry.date);
  });
  return [...dates].sort();
}

function calculateLongestStreakFromDates(sortedDates) {
  if (!sortedDates.length) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDay = new Date(`${sortedDates[i - 1]}T00:00:00`);
    const currDay = new Date(`${sortedDates[i]}T00:00:00`);
    const diffDays = Math.round((currDay - prevDay) / 86400000);
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

function calculateSundayStreakFromDates(sortedDates) {
  const sundays = sortedDates.filter((d) => new Date(`${d}T00:00:00`).getDay() === 0);
  if (!sundays.length) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sundays.length; i++) {
    const prevSunday = new Date(`${sundays[i - 1]}T00:00:00`);
    const currSunday = new Date(`${sundays[i]}T00:00:00`);
    const diffDays = Math.round((currSunday - prevSunday) / 86400000);
    current = diffDays === 7 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

function getCompletedBooksSet(progress) {
  const done = new Set();
  DATA.books.forEach((book) => {
    const chapters = chaptersByBook[book.name];
    if (chapters.every((chapter) => Boolean(progress.completed[chapter.id]))) {
      done.add(book.name);
    }
  });
  return done;
}

function getReadsByDate(progress) {
  const byDate = new Map();
  Object.entries(progress.completed || {}).forEach(([chapterId, entry]) => {
    if (!entry?.date) return;
    const chapter = chaptersById.get(Number(chapterId));
    if (!chapter) return;
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date).push(chapter);
  });
  return byDate;
}

function buildAchievementContext(progress) {
  const sortedDates = getUniqueSortedReadDates(progress);
  const longestStreak = calculateLongestStreakFromDates(sortedDates);
  const readsByDate = getReadsByDate(progress);

  let maxChaptersInOneDay = 0;
  let hasTodayDateMatch = false;
  let hasMalachi4AndMatthew1SameDay = false;
  readsByDate.forEach((chapters, date) => {
    maxChaptersInOneDay = Math.max(maxChaptersInOneDay, chapters.length);
    const dayOfMonth = Number(date.slice(8, 10));
    if (chapters.some((chapter) => chapter.chapter === dayOfMonth)) {
      hasTodayDateMatch = true;
    }
    const hasMalachi4 = chapters.some((chapter) => chapter.book === "말라기" && chapter.chapter === 4);
    const hasMatthew1 = chapters.some((chapter) => chapter.book === "마태복음" && chapter.chapter === 1);
    if (hasMalachi4 && hasMatthew1) hasMalachi4AndMatthew1SameDay = true;
  });

  // Sorting every completed chapter by its completion timestamp and comparing
  // that order to the canonical chapter-id sequence (1 = Genesis 1 ... 1189 =
  // Revelation 22) tells us whether the whole Bible was just read start-to-end
  // without ever skipping ahead or doubling back.
  const completedByCompletionOrder = Object.entries(progress.completed || {})
    .map(([id, entry]) => ({ id: Number(id), completedAt: entry?.completedAt || "" }))
    .sort((a, b) => (a.completedAt < b.completedAt ? -1 : a.completedAt > b.completedAt ? 1 : a.id - b.id));
  const readInCanonicalOrder =
    completedByCompletionOrder.length === DATA.chapters.length &&
    completedByCompletionOrder.every((entry, index) => entry.id === index + 1);

  return {
    totalRead: progress.totalChaptersRead || 0,
    longestStreak,
    completedBooks: getCompletedBooksSet(progress),
    completedChapterIds: new Set(Object.keys(progress.completed || {}).map(Number)),
    overallPercent: percent(getCompletedCount(DATA.chapters, progress), DATA.chapters.length),
    cycles: progress.cycles || 0,
    cumulativeDaysRead: sortedDates.length,
    earlyMorningCount: progress.earlyMorningCount || 0,
    midnightCount: progress.midnightCount || 0,
    sundayStreak: calculateSundayStreakFromDates(sortedDates),
    hasReturnedAfterBreak: sortedDates.length > longestStreak,
    hasTodayDateMatch,
    maxChaptersInOneDay,
    hasMalachi4AndMatthew1SameDay,
    quizCorrectStreak: progress.quizCorrectStreak || 0,
    readInCanonicalOrder,
    // Same object as progress.unlockedAchievements (not a copy): achievements
    // earlier in ACHIEVEMENTS that unlock during this same pipeline pass are
    // immediately visible here, which is what lets Post Tenebras Lux fire in
    // the same pass as the fifth Sola achievement it depends on.
    unlockedAchievements: progress.unlockedAchievements || {},
  };
}

// Backfills fields that didn't exist before the achievement system shipped, from
// data that was already there (completed chapters). Safe to call every time —
// it only ever raises totalChaptersRead/readDates, never lowers them.
function migrateLegacyProgressFields(progress) {
  const completedIds = Object.keys(progress.completed || {});
  const derivedDates = completedIds
    .map((id) => progress.completed[id]?.date)
    .filter(Boolean);
  progress.readDates = [...new Set([...(progress.readDates || []), ...derivedDates])].sort();
  // One-time backfill only: totalChaptersRead is a lifetime counter incremented in
  // answerQuiz(), so it must survive the completed-map wipe a cycle reset does.
  // Deriving it from completed.length on every call (instead of just once, here,
  // for pre-existing users) would cap it at one Bible's worth per reset.
  if (!progress.totalChaptersRead && completedIds.length) {
    progress.totalChaptersRead = completedIds.length;
  } else if (typeof progress.totalChaptersRead !== "number") {
    progress.totalChaptersRead = 0;
  }
  if (!progress.unlockedAchievements) progress.unlockedAchievements = {};
  if (typeof progress.cycles !== "number") progress.cycles = 0;
  if (typeof progress.earlyMorningCount !== "number") progress.earlyMorningCount = 0;
  if (typeof progress.midnightCount !== "number") progress.midnightCount = 0;
  if (typeof progress.quizCorrectStreak !== "number") progress.quizCorrectStreak = 0;
}

// Runs the full achievement pipeline: migrate legacy fields, detect+process a
// completed 66-book cycle, evaluate every not-yet-unlocked achievement against
// the resulting context, and record newly-unlocked ones. Returns the list of
// achievements unlocked by THIS call (empty on a no-op check).
function runAchievementPipeline(progress) {
  migrateLegacyProgressFields(progress);

  const totalChapters = DATA.chapters.length;
  const justCompletedCycle = getCompletedCount(DATA.chapters, progress) >= totalChapters;
  if (justCompletedCycle) {
    progress.cycles = (progress.cycles || 0) + 1;
  }

  const ctx = buildAchievementContext(progress);
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach((achievement) => {
    if (progress.unlockedAchievements[achievement.id]) return;
    if (achievement.check(ctx)) {
      progress.unlockedAchievements[achievement.id] = { unlockedAt: TODAY };
      newlyUnlocked.push(achievement);
    }
  });

  if (justCompletedCycle) {
    progress.completed = {};
    progress.attempts = {};
  }

  return newlyUnlocked;
}

function computeDisplayTitle(titleAchievementId) {
  const achievement = ACHIEVEMENTS.find((item) => item.id === titleAchievementId);
  return achievement ? achievement.name : DEFAULT_TITLE;
}

// "순간의 말씀" push notifications: ON by default with 3/day, per the fixed
// spec (never derive a different default). dailyCount is always clamped to
// 1–51 here so a bad/missing Firestore value can never leak further than
// this one function.
function normalizeNotificationSettings(raw) {
  const enabled = typeof raw?.momentVerseEnabled === "boolean" ? raw.momentVerseEnabled : true;
  let dailyCount = Number(raw?.momentVerseDailyCount);
  if (!Number.isFinite(dailyCount)) dailyCount = 3;
  dailyCount = Math.min(51, Math.max(1, Math.round(dailyCount)));
  return { momentVerseEnabled: enabled, momentVerseDailyCount: dailyCount };
}

function getSignedOutUser() {
  return {
    uid: "",
    email: "",
    name: "방문자",
    nickname: "방문자",
    title: DEFAULT_TITLE,
    titleAchievementId: null,
    share: false,
    hasSeenTutorial: false,
    notificationSettings: normalizeNotificationSettings(),
  };
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function getAuthErrorMessage(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "이미 가입된 이메일입니다.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "이메일 또는 비밀번호를 확인해 주세요.";
  }
  if (code.includes("invalid-email")) return "올바른 이메일 형식으로 입력해 주세요.";
  if (code.includes("weak-password")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (code.includes("operation-not-allowed")) {
    return "Firebase Authentication에서 Email/Password 로그인을 활성화해 주세요.";
  }
  if (code.includes("unauthorized-domain")) {
    return "Firebase Authentication 승인된 도메인에 현재 사이트 주소를 추가해 주세요.";
  }
  if (code.includes("captcha-check-failed")) return "reCAPTCHA 확인에 실패했습니다. 다시 시도해 주세요.";
  if (code.includes("network-request-failed")) return "네트워크 연결을 확인해 주세요.";
  if (code.includes("permission-denied")) return "Firestore 권한 설정을 확인해 주세요.";
  return "처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
}

function percent(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function isComplete(chapterId) {
  return Boolean(state.progress.completed[chapterId]);
}

function getCurrentChapter() {
  return DATA.chapters.find((chapter) => chapter.id === state.selectedChapterId) || DATA.chapters[0];
}

function getBookMeta(bookName) {
  return DATA.books.find((book) => book.name === bookName);
}

function getCompletedCount(chapters, progress = state.progress) {
  return chapters.filter((chapter) => Boolean(progress.completed?.[chapter.id])).length;
}

function getTodayCompleted(progress = state.progress) {
  return Object.values(progress.completed || {}).filter((entry) => entry.date === TODAY).length;
}

// Weekly leaderboard window resets every Sunday at 5:30 PM local time.
function getCurrentWeekBoundary(now = new Date()) {
  const boundary = new Date(now);
  boundary.setHours(17, 30, 0, 0);
  boundary.setDate(boundary.getDate() - boundary.getDay());
  if (now < boundary) {
    boundary.setDate(boundary.getDate() - 7);
  }
  return boundary;
}

function getWeeklyChapterCount(progress, boundary = getCurrentWeekBoundary()) {
  const boundaryDate = localDateStr(boundary);
  return Object.values(progress.completed || {}).filter((entry) => {
    if (!entry) return false;
    if (entry.completedAt) return new Date(entry.completedAt) >= boundary;
    return Boolean(entry.date) && entry.date >= boundaryDate;
  }).length;
}

function updateLeaderboardCountdown() {
  const now = new Date();
  const nextReset = getCurrentWeekBoundary(now);
  nextReset.setDate(nextReset.getDate() + 7);

  let remaining = Math.max(0, nextReset - now);
  const day = Math.floor(remaining / 86400000);
  remaining -= day * 86400000;
  const hour = Math.floor(remaining / 3600000);
  remaining -= hour * 3600000;
  const minute = Math.floor(remaining / 60000);
  remaining -= minute * 60000;
  const second = Math.floor(remaining / 1000);

  const pad = (value) => String(value).padStart(2, "0");
  elements.leaderboardCountdown.textContent = `${day}일 ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function calculateStreak(progress = state.progress) {
  const days = new Set(Object.values(progress.completed || {}).map((entry) => entry.date));
  const cursor = new Date(`${TODAY}T00:00:00`);

  // Not read yet today doesn't mean the streak is broken — the day isn't
  // over. Only count today as the streak's end if today's already been
  // read; otherwise start from yesterday, and only actually drop to 0 once
  // yesterday's ALSO empty (i.e. a full day was skipped with no reading).
  if (!days.has(localDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDateStr(cursor))) return 0;
  }

  let count = 0;
  while (days.has(localDateStr(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

function getUserDocRef(uid = state.firebaseUser?.uid) {
  return db.collection("users").doc(uid);
}

// --- Push notifications (FCM) --------------------------------------------
// Public VAPID key for Web Push — this identifies the Firebase project to
// the browser's push service, it is not a secret and is meant to ship in
// client code (unlike a server key or Admin SDK credential).
const FCM_VAPID_KEY =
  "BLPCbLuqaNhcW2ilRjILOa00yYfCVlxtd4wKP7BpHODxrR-kxS7lhL5WR6_cLCINsgR-AfdBu0vFdSQg7SsRUeU";

// FCM tokens can occasionally contain characters (e.g. "/") that are unsafe
// or at least unwise to use directly as a Firestore document ID, so devices
// are keyed by a SHA-256 hash of their token instead. This is deterministic
// (same token -> same doc every time), which is what makes the "already
// registered on this device? just touch lastSeenAt" upsert in
// saveNotificationToken() work without a separate lookup query.
async function safeDeviceIdFromToken(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Stores/refreshes this device's FCM token under
// users/{uid}/notificationDevices/{hash(token)} — one document per device,
// so a single account can have notifications on an iPhone, an Android
// phone, and a desktop browser at the same time without overwriting a
// single shared token field.
async function saveNotificationToken(token) {
  const deviceId = await safeDeviceIdFromToken(token);
  const deviceRef = getUserDocRef().collection("notificationDevices").doc(deviceId);
  const existing = await deviceRef.get();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  if (existing.exists) {
    await deviceRef.update({ enabled: true, lastSeenAt: now });
  } else {
    await deviceRef.set({
      token,
      enabled: true,
      createdAt: now,
      lastSeenAt: now,
      userAgent: navigator.userAgent,
    });
  }
}

function setNotificationStatus(text) {
  if (elements.notificationStatusText) {
    elements.notificationStatusText.textContent = text;
  }
}

const MOMENT_VERSE_DEFAULT_HINT = "알림을 켜면 하루 중 무작위 시각에 짧은 말씀 한 구절을 이 기기로 받아볼 수 있어요.";

// What the hint line under the toggle should say absent any just-happened
// error — read fresh each time rather than cached, since Notification.
// permission can change at any point behind our back (browser settings).
function defaultNotificationHint() {
  if (!("Notification" in window)) return "이 브라우저는 알림을 지원하지 않아요";
  if (Notification.permission === "denied") return "알림이 차단돼 있어요 — 브라우저 설정에서 허용해주세요";
  return MOMENT_VERSE_DEFAULT_HINT;
}

// The single "알림" toggle now does double duty: turning it on both grants
// this device permission (browser prompt + FCM token, same work the old
// separate "알림 켜기" button used to do) AND flips the Firestore
// preference on, so what used to be a button-plus-switch pair collapses
// into the one switch every other setting in this app already uses.
// Turning it back off only touches the Firestore preference — the device
// stays registered so turning it on again later never needs to re-prompt.
//
// The permission prompt still only ever fires from this direct click
// handler, never on its own, same as before.
async function handleMomentVerseToggleChange() {
  if (!elements.momentVerseToggle.checked) {
    await saveMomentVerseSettings();
    setNotificationStatus(defaultNotificationHint());
    return;
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    setNotificationStatus("이 브라우저는 알림을 지원하지 않아요");
    elements.momentVerseToggle.checked = false;
    renderMomentVerseSettings();
    renderNotificationPwaStatus();
    return;
  }

  let supported = true;
  try {
    if (firebase.messaging?.isSupported) {
      supported = await firebase.messaging.isSupported();
    }
  } catch {
    supported = false;
  }
  if (!supported) {
    setNotificationStatus("이 브라우저/환경에서는 푸시 알림을 지원하지 않아요");
    elements.momentVerseToggle.checked = false;
    renderMomentVerseSettings();
    renderNotificationPwaStatus();
    return;
  }

  if (Notification.permission === "denied") {
    setNotificationStatus("알림이 차단돼 있어요 — 브라우저 설정에서 허용해주세요");
    elements.momentVerseToggle.checked = false;
    renderMomentVerseSettings();
    renderNotificationPwaStatus();
    return;
  }

  elements.momentVerseToggle.disabled = true;
  try {
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationStatus(
          permission === "denied"
            ? "알림이 차단됐어요 — 브라우저 설정에서 허용해주세요"
            : "알림 권한이 허용되지 않았어요"
        );
        elements.momentVerseToggle.checked = false;
        return;
      }
    }

    // Reuse the PWA's own already-registered worker instead of letting the
    // SDK auto-register a second one at the same scope (see
    // firebase-messaging-sw.js for why that would be risky).
    const swRegistration = await navigator.serviceWorker.ready;
    const messaging = firebase.messaging();
    const token = await messaging.getToken({
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      setNotificationStatus("알림 토큰을 발급받지 못했어요. 잠시 후 다시 시도해주세요");
      elements.momentVerseToggle.checked = false;
      return;
    }

    console.log("[FCM] registration token:", token);
    if (state.isAuthenticated && state.firebaseUser) {
      await saveNotificationToken(token);
    }
    await saveMomentVerseSettings();
    setNotificationStatus(defaultNotificationHint());
  } catch (error) {
    console.error("[FCM] enable failed", error);
    setNotificationStatus("알림을 켜는 중 문제가 발생했어요. 잠시 후 다시 시도해주세요");
    elements.momentVerseToggle.checked = false;
  } finally {
    elements.momentVerseToggle.disabled = false;
    renderMomentVerseSettings();
    renderNotificationPwaStatus();
  }
}

function buildProfilePayload() {
  const done = getCompletedCount(DATA.chapters);
  return {
    uid: state.firebaseUser.uid,
    email: state.firebaseUser.email,
    name: state.user.name,
    nickname: state.user.nickname,
    title: state.user.title,
    titleAchievementId: state.user.titleAchievementId || null,
    share: Boolean(state.user.share),
    hasSeenTutorial: Boolean(state.user.hasSeenTutorial),
    notificationSettings: normalizeNotificationSettings(state.user.notificationSettings),
    progress: state.progress,
    completedCount: done,
    streakDays: calculateStreak(),
    dailyTarget: state.progress.dailyTarget || 3,
    lastActive: TODAY,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
}

async function saveProgress() {
  if (!state.isAuthenticated || !state.firebaseUser) return;
  state.progress.lastActive = TODAY;
  await getUserDocRef().set(buildProfilePayload(), { merge: true });
}

async function loadUserProfile(firebaseUser) {
  let snapshot;
  try {
    snapshot = await getUserDocRef(firebaseUser.uid).get();
  } catch {
    return {
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || "통독자",
        nickname: firebaseUser.displayName || "통독자",
        title: DEFAULT_TITLE,
        titleAchievementId: null,
        share: true,
        hasSeenTutorial: false,
        notificationSettings: normalizeNotificationSettings(),
      },
      progress: loadLegacyProgress(),
    };
  }

  if (snapshot.exists) {
    const data = snapshot.data();
    const titleAchievementId = data.titleAchievementId || null;
    return {
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: data.name || firebaseUser.displayName || "통독자",
        nickname: data.nickname || data.name || "통독자",
        title: computeDisplayTitle(titleAchievementId),
        titleAchievementId,
        share: Boolean(data.share),
        hasSeenTutorial: Boolean(data.hasSeenTutorial),
        notificationSettings: normalizeNotificationSettings(data.notificationSettings),
      },
      progress: { ...createProgress(), ...(data.progress || {}) },
    };
  }

  const user = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || "통독자",
    nickname: firebaseUser.displayName || "통독자",
    title: DEFAULT_TITLE,
    titleAchievementId: null,
    share: true,
    hasSeenTutorial: false,
    notificationSettings: normalizeNotificationSettings(),
  };
  const progress = loadLegacyProgress();
  try {
    await getUserDocRef(firebaseUser.uid).set({
      ...user,
      email: firebaseUser.email,
      progress,
      completedCount: getCompletedCount(DATA.chapters, progress),
      streakDays: calculateStreak(progress),
      dailyTarget: progress.dailyTarget || 3,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActive: TODAY,
    });
  } catch {
    // Keep Auth login usable even when Firestore rules are not deployed yet.
  }
  return { user, progress };
}

function syncUser(user, progress) {
  state.user = user;
  state.progress = progress;
  if (state.progress.lastChapterId) {
    const chapter = DATA.chapters.find((item) => item.id === state.progress.lastChapterId);
    if (chapter) {
      state.selectedBook = chapter.book;
      state.selectedChapterId = chapter.id;
    }
  }
  // Retroactively grant any achievement the user already qualifies for (e.g. an
  // existing user's history now satisfies a condition added after they signed up).
  // Silent on purpose — no celebration popups for things earned in the past.
  runAchievementPipeline(state.progress);
  state.user.title = computeDisplayTitle(state.user.titleAchievementId);
}

async function refreshLeaderboard() {
  if (!state.isAuthenticated) {
    state.leaderboard = [];
    return;
  }

  const weekBoundary = getCurrentWeekBoundary();
  const snapshot = await db.collection("users").where("share", "==", true).get();
  state.leaderboard = snapshot.docs
    .map((item) => {
      const data = item.data();
      const progress = { ...createProgress(), ...(data.progress || {}) };
      const done = data.completedCount ?? getCompletedCount(DATA.chapters, progress);
      // Completing a read-through resets `completed` (and so `done`) back to 0
      // for the next cycle, so the leaderboard percent has to fold in cycles
      // already finished — otherwise it would cap at 100% forever instead of
      // reflecting repeat readers (a 2nd full read-through reads as 200%).
      const cycles = progress.cycles || 0;
      return {
        uid: item.id,
        name: data.nickname || data.name || "통독자",
        title: data.title || DEFAULT_TITLE,
        done,
        weeklyCount: getWeeklyChapterCount(progress, weekBoundary),
        totalPercent: percent(cycles * DATA.chapters.length + done, DATA.chapters.length),
        today: getTodayCompleted(progress),
        streak: data.streakDays ?? calculateStreak(progress),
        target: data.dailyTarget || progress.dailyTarget || 3,
      };
    })
    .sort(
      (a, b) => b.weeklyCount - a.weeklyCount || b.done - a.done || a.name.localeCompare(b.name, "ko")
    );
}

function getMyRank() {
  if (!state.isAuthenticated || !state.user.share) return "-";
  const index = state.leaderboard.findIndex((row) => row.uid === state.firebaseUser?.uid);
  return index >= 0 ? `${index + 1}위` : "-";
}

function getNextIncompleteChapter() {
  const afterCurrent = DATA.chapters.filter((chapter) => chapter.id >= state.selectedChapterId);
  return [...afterCurrent, ...DATA.chapters].find((chapter) => !isComplete(chapter.id)) || DATA.chapters[0];
}

function renderWeekStrip() {
  const readCounts = {};
  Object.values(state.progress.completed || {}).forEach((entry) => {
    readCounts[entry.date] = (readCounts[entry.date] || 0) + 1;
  });
  const labels = ["일", "월", "화", "수", "목", "금", "토"];
  const today = new Date(`${TODAY}T00:00:00`);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  elements.weekStrip.replaceChildren(
    ...labels.map((label, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const dateStr = localDateStr(date);
      const isToday = dateStr === TODAY;
      const count = readCounts[dateStr] || 0;
      const cell = document.createElement("div");
      cell.className = `week-day${isToday ? " today" : ""}${count > 0 ? " done" : ""}`;
      cell.innerHTML = `
        <span class="week-day-label">${label}</span>
        <span class="week-day-date">${date.getDate()}</span>
        <span class="week-day-count">${count}장</span>
      `;
      return cell;
    })
  );
}

function updateHome() {
  const done = getCompletedCount(DATA.chapters);
  const allPercent = percent(done, DATA.chapters.length);
  const streak = calculateStreak();
  const next = getNextIncompleteChapter();
  const target = Math.max(1, Number(state.progress.dailyTarget) || 3);
  const todayDone = getTodayCompleted();
  const oldChapters = DATA.chapters.filter((chapter) => chapter.testament === "old");
  const newChapters = DATA.chapters.filter((chapter) => chapter.testament === "new");
  const oldBooks = DATA.books.filter((book) => book.testament === "old");
  const newBooks = DATA.books.filter((book) => book.testament === "new");
  const completedBooks = getCompletedBooksSet(state.progress);
  const oldBooksDone = oldBooks.filter((book) => completedBooks.has(book.name)).length;
  const newBooksDone = newBooks.filter((book) => completedBooks.has(book.name)).length;

  elements.homeTitle.textContent = state.user.title;
  elements.homeGreeting.textContent = `${state.user.nickname || state.user.name}님, ${getTimeGreeting()}`;
  elements.nextChapterTitle.textContent = `${next.book} ${next.chapter}장`;
  elements.heroBookEnglish.textContent = BOOK_ENGLISH_NAMES[next.book] || "";
  elements.homeTotalDone.textContent = done;
  elements.homeTotalCount.textContent = DATA.chapters.length;
  elements.homeTotalBar.style.width = `${allPercent}%`;
  elements.homeTotalPercent.textContent = `${allPercent}%`;
  elements.homeStreak.textContent = `${streak}일`;
  elements.homeTodayProgress.textContent = `${todayDone} / ${target}장`;
  elements.homeOldCount.textContent = `${oldBooksDone}/${oldBooks.length}`;
  elements.homeOldProgress.textContent = `${percent(getCompletedCount(oldChapters), oldChapters.length)}%`;
  elements.homeNewCount.textContent = `${newBooksDone}/${newBooks.length}`;
  elements.homeNewProgress.textContent = `${percent(getCompletedCount(newChapters), newChapters.length)}%`;
  renderWeekStrip();
}

function updateOverview() {
  const done = getCompletedCount(DATA.chapters);
  const allPercent = percent(done, DATA.chapters.length);
  const oldChapters = DATA.chapters.filter((chapter) => chapter.testament === "old");
  const newChapters = DATA.chapters.filter((chapter) => chapter.testament === "new");
  const todayDone = getTodayCompleted();
  const streak = calculateStreak();
  const longestStreak = calculateLongestStreakFromDates(getUniqueSortedReadDates(state.progress));
  const target = Math.max(1, Number(state.progress.dailyTarget) || 3);

  elements.totalRing.style.background = `conic-gradient(var(--green) ${allPercent * 3.6}deg, #e7dfcf 0deg)`;
  elements.totalPercent.textContent = `${allPercent}%`;
  elements.totalCompleted.textContent = `${done} / ${DATA.chapters.length}장`;
  elements.remainingText.textContent = `남은 장 ${DATA.chapters.length - done}`;
  elements.todayCount.textContent = `${todayDone}장`;
  elements.streakCount.textContent = `${streak}일`;
  elements.longestStreakCount.textContent = `${longestStreak}일`;
  elements.oldProgress.textContent = `${percent(getCompletedCount(oldChapters), oldChapters.length)}%`;
  elements.newProgress.textContent = `${percent(getCompletedCount(newChapters), newChapters.length)}%`;
  elements.dailyTarget.value = target;
  elements.targetBar.style.width = `${Math.min(100, percent(todayDone, target))}%`;
  elements.targetText.textContent = `오늘 ${target}장 중 ${todayDone}장 완료`;
}

function getReadCountsByDate(progress) {
  const counts = new Map();
  Object.values(progress.completed || {}).forEach((entry) => {
    if (!entry?.date) return;
    counts.set(entry.date, (counts.get(entry.date) || 0) + 1);
  });
  return counts;
}

function getCalendarLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function renderCalendarModal() {
  const viewDate = state.calendarViewDate;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  elements.calendarMonthLabel.textContent = `${year}년 ${month + 1}월`;

  const counts = getReadCountsByDate(state.progress);
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day calendar-day-empty";
    cells.push(empty);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = counts.get(dateStr) || 0;
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.dataset.level = String(getCalendarLevel(count));
    if (dateStr === TODAY) cell.classList.add("calendar-day-today");
    cell.setAttribute("aria-label", `${month + 1}월 ${day}일, ${count}장 통독`);

    const dayLabel = document.createElement("span");
    dayLabel.textContent = day;
    cell.appendChild(dayLabel);

    if (count > 0) {
      const countLabel = document.createElement("span");
      countLabel.className = "calendar-day-count";
      countLabel.textContent = `${count}장`;
      cell.appendChild(countLabel);
    }
    cells.push(cell);
  }
  while (cells.length < 42) {
    const trailing = document.createElement("div");
    trailing.className = "calendar-day calendar-day-empty";
    cells.push(trailing);
  }

  elements.calendarGrid.replaceChildren(...cells);

  const now = new Date();
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const viewMonthIndex = year * 12 + month;
  elements.calendarNextBtn.disabled = viewMonthIndex >= currentMonthIndex + 1;
}

function openCalendarModal() {
  if (!state.calendarViewDate) {
    state.calendarViewDate = new Date();
  }
  renderCalendarModal();
  elements.calendarModal.hidden = false;
}

function closeCalendarModal() {
  elements.calendarModal.hidden = true;
}

let tutorialStepIndex = 0;

function renderTutorialStep() {
  elements.tutorialSteps.forEach((step, index) => {
    step.hidden = index !== tutorialStepIndex;
  });
  elements.tutorialDots.forEach((dot, index) => {
    dot.classList.toggle("active", index === tutorialStepIndex);
  });
  elements.tutorialNextBtn.textContent =
    tutorialStepIndex === elements.tutorialSteps.length - 1 ? "시작하기" : "다음";
}

function showTutorial() {
  tutorialStepIndex = 0;
  renderTutorialStep();
  elements.tutorialModal.hidden = false;
}

async function completeTutorial() {
  elements.tutorialModal.hidden = true;
  if (state.user.hasSeenTutorial) return;
  state.user.hasSeenTutorial = true;
  try {
    await saveProgress();
  } catch {
    // Non-critical — worst case the tutorial reappears next login.
  }
}

let installTutorialStepIndex = 0;

function renderInstallTutorialStep() {
  elements.installTutorialSteps.forEach((step, index) => {
    step.hidden = index !== installTutorialStepIndex;
  });
  elements.installTutorialDots.forEach((dot, index) => {
    dot.classList.toggle("active", index === installTutorialStepIndex);
  });
  elements.installTutorialNextBtn.textContent =
    installTutorialStepIndex === elements.installTutorialSteps.length - 1 ? "완료" : "다음";
}

function showInstallTutorial() {
  installTutorialStepIndex = 0;
  renderInstallTutorialStep();
  elements.installTutorialModal.hidden = false;
}

function closeInstallTutorial() {
  elements.installTutorialModal.hidden = true;
}

function renderStatusTable() {
  const rows = DATA.books.map((book) => {
    const chapters = chaptersByBook[book.name];
    const done = getCompletedCount(chapters);
    const bookPercent = percent(done, chapters.length);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${book.name}</td>
      <td>${done} / ${chapters.length}</td>
      <td><span class="table-bar"><i style="width: ${bookPercent}%"></i></span><strong>${bookPercent}%</strong></td>
    `;
    row.addEventListener("click", () => {
      selectBook(book.name);
      setView("quiz");
    });
    return row;
  });
  elements.statusTableBody.replaceChildren(...rows);
}

function setTestamentToggleUI(testament) {
  elements.testamentToggleButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.testament === testament);
  });
  elements.testamentToggleThumb.classList.toggle("position-new", testament === "new");
}

function syncTestamentFilterToBook(bookName) {
  const book = getBookMeta(bookName);
  if (!book || state.bookTestamentFilter === book.testament) return;
  state.bookTestamentFilter = book.testament;
  setTestamentToggleUI(book.testament);
}

function getBookColorTier(bookPercent, done) {
  if (bookPercent >= 100) return "tier-complete";
  if (done <= 0) return "tier-empty";
  if (bookPercent >= 50) return "tier-purple";
  return "tier-orange";
}

function renderBookGrid() {
  const query = (state.bookSearchQuery || "").trim().toLowerCase();
  const isSearching = query.length > 0;
  const books = isSearching
    ? DATA.books.filter((book) => {
        const shortName = (SHORT_BOOK_NAMES[book.name] || "").toLowerCase();
        return book.name.toLowerCase().includes(query) || shortName.includes(query);
      })
    : DATA.books.filter((book) => book.testament === state.bookTestamentFilter);

  if (isSearching) {
    elements.librarySectionLabel.textContent = "검색 결과";
    elements.librarySectionCount.textContent = `${books.length}권`;
  } else {
    const testamentChapters = DATA.chapters.filter((chapter) => chapter.testament === state.bookTestamentFilter);
    elements.librarySectionLabel.textContent = state.bookTestamentFilter === "old" ? "구약" : "신약";
    elements.librarySectionCount.textContent = `${books.length}권 · ${testamentChapters.length}장`;
  }

  elements.bookGrid.replaceChildren(
    ...books.map((book) => {
      const chapters = chaptersByBook[book.name];
      const done = getCompletedCount(chapters);
      const bookPercent = percent(done, chapters.length);
      const tier = getBookColorTier(bookPercent, done);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `book-tile ${tier}${book.name === state.selectedBook ? " active" : ""}`;
      button.setAttribute("aria-label", `${book.name} (${done} / ${chapters.length}장, ${bookPercent}% 완료)`);
      button.innerHTML = `
        <span class="book-tile-code">${book.name}</span>
        <span class="book-tile-name">${BOOK_ENGLISH_NAMES[book.name] || ""}</span>
        <span class="book-tile-meta">${done} / ${chapters.length}</span>
        <span class="book-tile-bar"><i style="width: ${bookPercent}%"></i></span>
      `;
      button.addEventListener("click", () => selectBook(book.name));
      return button;
    })
  );

  if (elements.bookGridEmpty) {
    elements.bookGridEmpty.hidden = books.length > 0;
  }
}

function renderChapters() {
  const chapters = chaptersByBook[state.selectedBook];
  const book = getBookMeta(state.selectedBook);
  const done = getCompletedCount(chapters);
  const bookPercent = percent(done, chapters.length);

  elements.selectedTestament.textContent = book.testament === "old" ? "구약" : "신약";
  elements.selectedBook.textContent = state.selectedBook;
  elements.bookPercent.textContent = `${bookPercent}%`;
  elements.bookCount.textContent = `${done} / ${chapters.length}장`;

  elements.chapterGrid.replaceChildren(
    ...chapters.map((chapter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = [
        "chapter-btn",
        isComplete(chapter.id) ? "completed" : "",
        chapter.id === state.selectedChapterId ? "current" : "",
      ]
        .filter(Boolean)
        .join(" ");
      button.textContent = chapter.chapter;
      button.setAttribute("aria-label", `${chapter.book} ${chapter.chapter}장`);
      button.addEventListener("click", () => selectChapter(chapter.id));
      return button;
    })
  );
}

function renderQuiz() {
  const chapter = getCurrentChapter();
  const complete = isComplete(chapter.id);
  const attempt = state.progress.attempts[chapter.id];

  elements.chapterKicker.textContent = `${chapter.book} ${chapter.chapter}장`;
  elements.chapterStatus.textContent = complete ? "완료" : "미완료";
  elements.chapterStatus.classList.toggle("done", complete);
  elements.questionText.textContent = chapter.question;
  elements.hintText.textContent = chapter.hint;
  elements.hintText.hidden = true;
  elements.hintBtn.textContent = "힌트 보기";
  elements.feedback.textContent = complete
    ? `정답입니다. ${chapter.answerText}`
    : attempt
      ? "아직 정답이 아닙니다. 힌트와 핵심내용을 다시 확인해 보세요."
      : "";
  elements.feedback.classList.toggle("correct", complete);
  elements.feedback.classList.toggle("wrong", !complete && Boolean(attempt));

  elements.optionsList.replaceChildren(
    ...chapter.options.map((option, index) => {
      const answerNumber = index + 1;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-button";
      button.textContent = `${OPTION_MARKS[index]} ${option}`;
      button.disabled = complete;

      if (complete && answerNumber === chapter.answer) {
        button.classList.add("correct");
      } else if (attempt?.selected === answerNumber && !attempt.correct) {
        button.classList.add("wrong");
      }

      button.addEventListener("click", () => answerQuiz(answerNumber));
      return button;
    })
  );
}

function renderProfile() {
  elements.logoutBtn.hidden = !state.isAuthenticated;
  elements.accountEmail.textContent = state.user.email || "-";
  elements.accountName.textContent = state.user.name || "-";
  elements.profileNickname.value = state.user.nickname;
  elements.profileDailyTarget.value = state.progress.dailyTarget || 3;
  elements.shareProfile.checked = Boolean(state.user.share);
  elements.shareProfile.disabled = !state.isAuthenticated;
  elements.profileNickname.disabled = !state.isAuthenticated;
  renderRepresentativeTitlePicker();
  renderMomentVerseSettings();
  renderNotificationPwaStatus();
}

// Populated once; re-run is harmless (replaceChildren just re-creates the
// same 51 options) but only the checked/value sync needs to happen on every
// render, so this stays split out from that.
function populateMomentVerseCountOptions() {
  if (!elements.momentVerseCountSelect || elements.momentVerseCountSelect.options.length) return;
  const options = [];
  for (let n = 1; n <= 51; n++) {
    const option = document.createElement("option");
    option.value = String(n);
    option.textContent = `${n}개`;
    options.push(option);
  }
  elements.momentVerseCountSelect.replaceChildren(...options);
}

function renderMomentVerseSettings() {
  if (!elements.momentVerseToggle || !elements.momentVerseCountSelect) return;
  populateMomentVerseCountOptions();
  const settings = normalizeNotificationSettings(state.user.notificationSettings);
  elements.momentVerseToggle.checked = settings.momentVerseEnabled;
  elements.momentVerseCountSelect.value = String(settings.momentVerseDailyCount);
  elements.momentVerseToggle.disabled = !state.isAuthenticated;
  elements.momentVerseCountSelect.disabled = !state.isAuthenticated;
  // Only worth configuring a count while the toggle itself is on.
  if (elements.momentVerseCountRow) {
    elements.momentVerseCountRow.hidden = !settings.momentVerseEnabled;
  }
}

// Both controls save straight to Firestore the moment they change (per spec
// — no separate "save" button for this card), independent of the big
// profile form's own submit-to-save flow.
async function saveMomentVerseSettings() {
  if (!state.isAuthenticated || !state.firebaseUser) return;
  state.user.notificationSettings = normalizeNotificationSettings({
    momentVerseEnabled: elements.momentVerseToggle.checked,
    momentVerseDailyCount: elements.momentVerseCountSelect.value,
  });
  renderMomentVerseSettings();
  await getUserDocRef().set(
    { notificationSettings: state.user.notificationSettings },
    { merge: true }
  );
}

function renderLeaderboard() {
  if (!state.leaderboard.length) {
    elements.leaderboard.innerHTML = `<p class="empty-state">아직 공유 중인 계정이 없습니다.</p>`;
    return;
  }

  elements.leaderboard.replaceChildren(
    ...state.leaderboard.map((row, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? ` rank-${rank}` : "";
      const item = document.createElement("article");
      item.className = `leader-row${row.uid === state.firebaseUser?.uid ? " mine" : ""}${rankClass}`;
      item.innerHTML = `
        <div class="rank">${index + 1}</div>
        <div>
          <strong>${row.name}</strong>
          <span>${row.title}</span>
        </div>
        <div class="leader-stats">
          <span>이번 주 ${row.weeklyCount}장</span>
          <span>${row.totalPercent}%</span>
          <span>${row.streak}일 연속</span>
        </div>
      `;
      return item;
    })
  );
}

function renderAchievements() {
  const unlockedIds = Object.keys(state.progress.unlockedAchievements || {});
  const countLabel = `${unlockedIds.length} / ${ACHIEVEMENTS.length} 수집됨`;
  elements.achievementCount.textContent = countLabel;

  const byRarity = Object.keys(RARITY_META).sort((a, b) => RARITY_META[a].order - RARITY_META[b].order);

  elements.achievementGroups.replaceChildren(
    ...byRarity.map((rarityKey) => {
      const items = ACHIEVEMENTS.filter((achievement) => achievement.rarity === rarityKey);
      const unlockedInGroup = items.filter((achievement) => state.progress.unlockedAchievements[achievement.id]).length;

      const group = document.createElement("section");
      group.className = "achievement-rarity-group";
      group.innerHTML = `
        <div class="achievement-rarity-heading">
          <span class="rarity-badge rarity-${rarityKey}">${RARITY_META[rarityKey].label}</span>
          <span class="achievement-rarity-count">${unlockedInGroup} / ${items.length}</span>
        </div>
      `;

      const grid = document.createElement("div");
      grid.className = "achievement-grid";
      grid.append(
        ...items.map((achievement) => {
          const unlocked = Boolean(state.progress.unlockedAchievements[achievement.id]);
          const card = document.createElement("article");
          card.className = `achievement-card${unlocked ? " unlocked" : " locked"}`;
          card.innerHTML = `
            <span class="achievement-card-icon rarity-${rarityKey}">${
              unlocked
                ? "✓"
                : '<span class="icon-mask achievement-lock-icon" style="--icon-src:url(\'icon-assets/glyphs/lock.png\')" aria-hidden="true"></span>'
            }</span>
            <div class="achievement-card-body">
              <strong>${achievement.name}</strong>
              <span>${achievement.rarity === "hidden" && !unlocked ? "?????" : achievement.condition}</span>
            </div>
          `;
          return card;
        })
      );
      group.appendChild(grid);
      return group;
    })
  );
}

function renderRepresentativeTitlePicker() {
  const byRarity = Object.keys(RARITY_META).sort((a, b) => RARITY_META[a].order - RARITY_META[b].order);
  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) => state.progress.unlockedAchievements[achievement.id]);
  const currentValue = state.user.titleAchievementId || "";
  elements.representativeTitleSelect.replaceChildren(
    ...(unlockedAchievements.length
      ? [
          (() => {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = `기본 (${DEFAULT_TITLE})`;
            return option;
          })(),
          ...byRarity.map((rarityKey) => {
            const items = unlockedAchievements.filter((achievement) => achievement.rarity === rarityKey);
            if (!items.length) return null;
            const group = document.createElement("optgroup");
            group.label = RARITY_META[rarityKey].label;
            group.append(
              ...items.map((achievement) => {
                const option = document.createElement("option");
                option.value = achievement.id;
                option.textContent = achievement.name;
                return option;
              })
            );
            return group;
          }).filter(Boolean),
        ]
      : [
          (() => {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "아직 획득한 칭호가 없어요";
            return option;
          })(),
        ])
  );
  elements.representativeTitleSelect.value = currentValue;
  elements.representativeTitleSelect.disabled = !state.isAuthenticated || !unlockedAchievements.length;
}

function queueAchievementUnlocks(newlyUnlocked) {
  if (!newlyUnlocked.length) return;
  state.achievementQueue.push(...newlyUnlocked);
  if (!state.currentAchievementModal) showNextAchievementModal();
}

function showNextAchievementModal() {
  state.currentAchievementModal = state.achievementQueue.shift() || null;
  renderAchievementModal();
}

function renderAchievementModal() {
  const achievement = state.currentAchievementModal;
  elements.achievementModal.hidden = !achievement;
  if (!achievement) return;
  elements.achievementModalRarity.textContent = RARITY_META[achievement.rarity].label;
  elements.achievementModalRarity.className = `rarity-badge rarity-${achievement.rarity}`;
  elements.achievementModalName.textContent = achievement.name;
  elements.achievementModalCondition.textContent = achievement.condition;
}

function renderView() {
  elements.dashboard.dataset.view = state.activeView;
  elements.viewPanels.forEach((panel) => {
    const views = panel.dataset.viewPanel.split(" ");
    panel.classList.toggle("view-active", views.includes(state.activeView));
  });

  elements.viewTabs.forEach((button) => {
    const active = button.dataset.viewTab === state.activeView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  applyBiblePane();
}

function renderAuthGate() {
  elements.appShell.classList.toggle("app-locked", !state.isAuthenticated);
  elements.appShell.setAttribute("aria-hidden", state.isAuthenticated ? "false" : "true");
  elements.loginGate.classList.toggle("login-hidden", state.isAuthenticated);
}

function animateBookGridFill() {
  const fills = elements.bookGrid.querySelectorAll(".book-tile-fill");
  fills.forEach((fill) => {
    fill.style.transition = "none";
    fill.style.height = "0%";
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fills.forEach((fill) => {
        fill.style.transition = "";
        fill.style.height = `${fill.dataset.percent}%`;
      });
    });
  });
}

function renderQuizStep() {
  // Wide layout (Task 6's 2-column Bible grid) keeps library+chapter panels
  // both visible in the left column while reading/quiz alternate on the
  // right — narrow phones keep the original one-panel-at-a-time behavior.
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
  applyBiblePane();
}

// Task 9: collapsible Bible left pane, 620-899px only (NARROW_WIDE_MQ above).
// The toggle button only ever shows in that sub-range while the Bible/quiz
// tab is active; outside it (phones, or >=900px) the pane is always
// expanded and the button stays hidden, regardless of state.biblePaneCollapsed.
// Also requires WIDE_MQ.matches: NARROW_WIDE_MQ's 620-899 range has no
// min-height clause, so on its own it would also match phone-landscape
// (e.g. 667x375) — widths WIDE_MQ deliberately excludes via its height
// clause (see WIDE_MQ's comment above). Gating on both keeps the toggle
// from appearing on phones turned sideways, where there is no 2-column
// grid to collapse in the first place.
function applyBiblePane() {
  const inRange = NARROW_WIDE_MQ.matches && WIDE_MQ.matches;
  elements.biblePaneToggle.hidden = !inRange || state.activeView !== "quiz";
  elements.dashboard.classList.toggle("bible-pane-collapsed", inRange && state.biblePaneCollapsed);
}

function render() {
  updateHome();
  updateOverview();
  renderStatusTable();
  renderBookGrid();
  renderChapters();
  renderQuiz();
  renderProfile();
  renderLeaderboard();
  renderAchievements();
  renderView();
  renderQuizStep();
  renderAuthGate();
}

function setView(view) {
  state.activeView = view;
  if (view === "home") {
    state.dailyVerse = pickRandomVerse();
    updateHome();
  }
  if (view === "community") {
    refreshLeaderboard().then(renderLeaderboard);
  }
  renderView();
  renderQuizStep();
}

function setAuthBanner(message, tone = "error") {
  elements.gateLoginMessage.textContent = message || "";
  elements.gateLoginMessage.classList.remove("error", "success");
  if (message) {
    elements.gateLoginMessage.hidden = false;
    elements.gateLoginMessage.classList.add(tone);
  } else {
    elements.gateLoginMessage.hidden = true;
  }
}

function setFieldError(element, message) {
  if (!element) return;
  element.textContent = message || "";
}

function setSubmitLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.classList.toggle("loading", loading);
}

function clearSignupFieldErrors() {
  setFieldError(elements.signupEmailError, "");
  elements.gateSignupEmail.classList.remove("field-invalid");
}

function setAuthMode(mode) {
  const isSignup = mode === "signup";
  elements.gateLoginForm.classList.toggle("hidden", isSignup);
  elements.gateSignupForm.classList.toggle("hidden", !isSignup);
  elements.backToLoginRow.classList.toggle("hidden", !isSignup);
  elements.loginScroll.classList.toggle("signup-mode", isSignup);
  elements.authModeButtons.forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  clearSignupFieldErrors();
  setAuthBanner("");
}

function togglePasswordVisibility(button) {
  const input = document.getElementById(button.dataset.passwordTarget);
  if (!input) return;

  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  const icon = button.querySelector(".password-toggle-icon");
  if (icon) {
    icon.style.setProperty(
      "--icon-src",
      `url('icon-assets/glyphs/${willShow ? "eye" : "eye-off"}.png')`
    );
  }
  button.setAttribute("aria-pressed", String(willShow));
  button.setAttribute(
    "aria-label",
    `${input.id === "gateLoginPassword" ? "로그인 비밀번호" : input.id === "gateSignupPassword" ? "회원가입 비밀번호" : "비밀번호 확인 내용"} ${willShow ? "숨기기" : "보기"}`
  );
}

function updatePasswordMatchStatus() {
  const password = elements.gateSignupPassword.value;
  const confirmation = elements.gateSignupPasswordConfirm.value;
  const hasConfirmation = confirmation.length > 0;
  const matches = hasConfirmation && password === confirmation;

  elements.gateSignupPasswordConfirm.classList.toggle("password-valid", matches);
  elements.gateSignupPasswordConfirm.classList.toggle(
    "password-invalid",
    hasConfirmation && !matches
  );
  elements.gateSignupPasswordConfirm.setAttribute(
    "aria-invalid",
    String(hasConfirmation && !matches)
  );
  elements.passwordMatchMessage.textContent = hasConfirmation
    ? matches
      ? "비밀번호가 일치합니다."
      : "비밀번호가 일치하지 않습니다."
    : "";
  elements.passwordMatchMessage.className = `field-message${
    hasConfirmation ? (matches ? " match" : " mismatch") : ""
  }`;
}

function updateSignupEmailStatus() {
  const value = elements.gateSignupEmail.value.trim();
  const valid = !value || validateEmail(value);
  elements.gateSignupEmail.classList.toggle("field-invalid", !valid);
  setFieldError(elements.signupEmailError, valid ? "" : "올바른 이메일 형식으로 입력해 주세요.");
}

async function selectBook(bookName) {
  state.selectedBook = bookName;
  syncTestamentFilterToBook(bookName);
  const firstIncomplete = chaptersByBook[bookName].find((chapter) => !isComplete(chapter.id));
  state.selectedChapterId = firstIncomplete?.id || chaptersByBook[bookName][0].id;
  state.progress.lastChapterId = state.selectedChapterId;
  state.quizStep = "chapters";
  render();
  await saveProgress();
}

const bibleTextCache = {};

function getBookCode(chapter) {
  const match = /NKRV\/([A-Z0-9]+)\./.exec(chapter.link || "");
  return match ? match[1] : null;
}

async function loadChapterVerses(chapter) {
  const code = getBookCode(chapter);
  if (!code) return [];
  if (!bibleTextCache[chapter.id]) {
    bibleTextCache[chapter.id] = fetch(`data/bible-text/${code}/${chapter.chapter}.json`).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  }
  try {
    return (await bibleTextCache[chapter.id]) || [];
  } catch (err) {
    delete bibleTextCache[chapter.id];
    throw err;
  }
}

function saveReadingPrefs() {
  try {
    localStorage.setItem(READING_PREFS_KEY, JSON.stringify(state.readingPrefs));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function applyReadingPrefs() {
  const { size, bold } = state.readingPrefs;
  elements.readingText.dataset.fontSize = size;
  elements.readingText.classList.toggle("bold", bold);
  elements.readingSizeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.fontSize === size);
  });
  const sizePosition = { medium: " position-medium", large: " position-large", xlarge: " position-xlarge" }[size] || "";
  elements.readingSizeThumb.className = "reading-size-toggle-thumb" + sizePosition;
  elements.readingBoldBtn.setAttribute("aria-pressed", String(bold));
}

function setReadingFontSize(size) {
  state.readingPrefs.size = size;
  saveReadingPrefs();
  applyReadingPrefs();
}

function toggleReadingBold() {
  state.readingPrefs.bold = !state.readingPrefs.bold;
  saveReadingPrefs();
  applyReadingPrefs();
}

async function renderReading() {
  applyReadingPrefs();
  const chapter = getCurrentChapter();
  elements.readingKicker.textContent = `${chapter.book} ${chapter.chapter}장`;
  elements.readingText.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "reading-loading";
  loading.textContent = "본문을 불러오는 중...";
  elements.readingText.append(loading);

  const requestedChapterId = chapter.id;
  let verses = [];
  let failed = false;
  try {
    verses = await loadChapterVerses(chapter);
  } catch (err) {
    failed = true;
  }
  if (state.selectedChapterId !== requestedChapterId) return;

  if (failed || !verses.length) {
    elements.readingText.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "reading-loading";
    empty.textContent =
      location.protocol === "file:"
        ? "파일을 직접 열어서는 본문을 불러올 수 없어요. 웹 서버(또는 실제 배포된 주소)로 접속해 주세요."
        : "본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    elements.readingText.append(empty);
    return;
  }

  elements.readingText.replaceChildren(
    ...verses.flatMap((verse) => {
      const nodes = [];
      if (verse.h) {
        const heading = document.createElement("p");
        heading.className = "reading-heading";
        heading.textContent = verse.h;
        nodes.push(heading);
      }
      const line = document.createElement("p");
      line.className = "reading-verse";
      const num = document.createElement("span");
      num.className = "v-num";
      num.textContent = verse.v;
      line.append(num, document.createTextNode(verse.t));
      nodes.push(line);
      return nodes;
    })
  );
}

function startQuiz() {
  state.quizStep = "quiz";
  renderQuizStep();
}

async function selectChapter(chapterId) {
  const chapter = DATA.chapters.find((item) => item.id === chapterId);
  state.selectedBook = chapter.book;
  syncTestamentFilterToBook(chapter.book);
  state.selectedChapterId = chapter.id;
  state.progress.lastChapterId = chapter.id;
  state.quizStep = "reading";
  render();
  renderReading();
  await saveProgress();
}

async function answerQuiz(selected) {
  const chapter = getCurrentChapter();
  const correct = selected === chapter.answer;
  state.progress.attempts[chapter.id] = {
    selected,
    correct,
    date: TODAY,
  };

  let newlyUnlocked = [];
  if (correct) {
    state.progress.completed[chapter.id] = {
      date: TODAY,
      answer: selected,
      completedAt: new Date().toISOString(),
    };
    state.progress.totalChaptersRead = (state.progress.totalChaptersRead || 0) + 1;
    const hour = new Date().getHours();
    if (hour < 4) {
      state.progress.midnightCount = (state.progress.midnightCount || 0) + 1;
    } else if (hour < 6) {
      state.progress.earlyMorningCount = (state.progress.earlyMorningCount || 0) + 1;
    }
    state.progress.quizCorrectStreak = (state.progress.quizCorrectStreak || 0) + 1;
    newlyUnlocked = runAchievementPipeline(state.progress);
    elements.feedback.textContent = "정답입니다. 이 장이 완료 처리되었습니다.";
  } else {
    state.progress.quizCorrectStreak = 0;
    elements.feedback.textContent = "아직 정답이 아닙니다. 힌트와 핵심내용을 다시 확인해 보세요.";
  }

  render();
  await saveProgress();
  await refreshLeaderboard();
  render();
  queueAchievementUnlocks(newlyUnlocked);
}

function goToNextChapter() {
  const currentIndex = DATA.chapters.findIndex((chapter) => chapter.id === state.selectedChapterId);
  const next = DATA.chapters[currentIndex + 1] || DATA.chapters[0];
  selectChapter(next.id);
  setView("quiz");
}

function goToNextIncomplete() {
  const next = getNextIncompleteChapter();
  selectChapter(next.id);
  setView("quiz");
}

async function handleLogin(event) {
  event.preventDefault();
  const email = normalizeEmail(elements.gateLoginEmail.value);
  const password = elements.gateLoginPassword.value;

  if (!email || !password) {
    setAuthBanner("이메일과 비밀번호를 모두 입력해 주세요.");
    return;
  }

  if (!validateEmail(email)) {
    setAuthBanner("올바른 이메일 형식으로 입력해 주세요.");
    return;
  }

  setAuthBanner("로그인 중입니다.", "success");
  setSubmitLoading(elements.loginSubmitBtn, true);
  try {
    await auth.signInWithEmailAndPassword(email, password);
    elements.gateLoginForm.reset();
    setAuthBanner("");
  } catch (error) {
    setAuthBanner(getAuthErrorMessage(error));
  } finally {
    setSubmitLoading(elements.loginSubmitBtn, false);
  }
}

async function handleForgotPassword() {
  const email = normalizeEmail(elements.gateLoginEmail.value);
  if (!validateEmail(email)) {
    setAuthBanner("비밀번호를 재설정할 이메일을 먼저 입력해 주세요.");
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    setAuthBanner("비밀번호 재설정 메일을 보냈습니다. 받은 편지함을 확인해 주세요.", "success");
  } catch (error) {
    setAuthBanner(getAuthErrorMessage(error));
  }
}

async function handleSignup(event) {
  event.preventDefault();
  clearSignupFieldErrors();
  setAuthBanner("");

  const email = normalizeEmail(elements.gateSignupEmail.value);
  const password = elements.gateSignupPassword.value;
  const passwordConfirm = elements.gateSignupPasswordConfirm.value;
  const name = elements.gateSignupName.value.trim();
  const nickname = elements.gateSignupNickname.value.trim();

  let hasFieldError = false;

  if (!validateEmail(email)) {
    elements.gateSignupEmail.classList.add("field-invalid");
    setFieldError(elements.signupEmailError, "올바른 이메일 형식으로 입력해 주세요.");
    hasFieldError = true;
  }

  if (password.length < 6) {
    setAuthBanner("비밀번호는 6자 이상으로 입력해 주세요.");
    hasFieldError = true;
  } else if (password !== passwordConfirm) {
    setAuthBanner("비밀번호 확인이 일치하지 않습니다.");
    hasFieldError = true;
  }

  if (!name || !nickname) {
    setAuthBanner("이름과 닉네임을 입력해 주세요.");
    hasFieldError = true;
  }

  if (hasFieldError) return;

  setSubmitLoading(elements.signupSubmitBtn, true);
  setAuthBanner("계정을 만드는 중입니다.", "success");
  let credential;
  state.creatingAccount = true;
  try {
    credential = await auth.createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({ displayName: nickname || name });
  } catch (error) {
    state.creatingAccount = false;
    setSubmitLoading(elements.signupSubmitBtn, false);
    setAuthBanner(getAuthErrorMessage(error));
    return;
  }

  const progress = loadLegacyProgress();
  const user = {
    uid: credential.user.uid,
    email: credential.user.email,
    name,
    nickname: nickname || name,
    title: DEFAULT_TITLE,
    titleAchievementId: null,
    share: true,
  };
  state.firebaseUser = credential.user;
  syncUser(user, progress);

  let signupNotice = "";
  const profilePayload = {
    ...user,
    progress,
    completedCount: getCompletedCount(DATA.chapters, progress),
    streakDays: calculateStreak(progress),
    dailyTarget: progress.dailyTarget || 3,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastActive: TODAY,
  };

  try {
    await getUserDocRef(credential.user.uid).set(profilePayload);
  } catch {
    signupNotice = "계정은 만들어졌습니다. 다만 Firestore 프로필 저장은 규칙 배포 후 다시 동기화됩니다.";
  }

  elements.gateSignupForm.reset();
  setSubmitLoading(elements.signupSubmitBtn, false);
  setAuthBanner(signupNotice, signupNotice ? "success" : "error");
  state.creatingAccount = false;
  state.isAuthenticated = true;
  await refreshLeaderboard().catch(() => {});
  setView("home");
  render();
}

// --- Social login (Google / Naver) ---------------------------------------
// A brand-new social sign-in doesn't go through handleSignup's form at all,
// so it never gets a name/nickname the normal way. Firebase's own
// onAuthStateChanged fires the instant the redirect/custom-token sign-in
// resolves — before we'd get a chance to ask anything — so this flag is set
// first (by whichever of googleLoginBtn/naverLoginBtn's flow ran) and
// consumed once by that very next onAuthStateChanged call, which shows the
// name/nickname step instead of proceeding straight into the app.
let pendingSocialSignup = null; // { name: string } | null

const googleProvider = new firebase.auth.GoogleAuthProvider();

function showSocialProfileStep(name) {
  elements.gateLoginForm.classList.add("hidden");
  elements.gateSignupForm.classList.add("hidden");
  elements.socialLoginRow.classList.add("hidden");
  elements.backToLoginRow.classList.add("hidden");
  elements.gateSocialProfileForm.classList.remove("hidden");
  elements.socialNameField.hidden = Boolean(name);
  elements.socialProfileName.value = "";
  elements.socialProfileNickname.value = name || "";
  elements.socialProfileMessage.hidden = true;
}

function hideSocialProfileStep() {
  elements.gateSocialProfileForm.classList.add("hidden");
  elements.gateLoginForm.classList.remove("hidden");
  elements.socialLoginRow.classList.remove("hidden");
}

async function handleSocialProfileSubmit(event) {
  event.preventDefault();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return;

  const name = (pendingSocialSignup?.name || elements.socialProfileName.value).trim();
  const nickname = elements.socialProfileNickname.value.trim();
  if (!name || !nickname) {
    elements.socialProfileMessage.textContent = "이름과 닉네임을 모두 입력해 주세요.";
    elements.socialProfileMessage.hidden = false;
    return;
  }

  setSubmitLoading(elements.socialProfileSubmitBtn, true);
  try {
    const progress = createProgress();
    const user = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name,
      nickname,
      title: DEFAULT_TITLE,
      titleAchievementId: null,
      share: true,
      hasSeenTutorial: false,
      notificationSettings: normalizeNotificationSettings(),
    };
    await getUserDocRef(firebaseUser.uid).set({
      ...user,
      progress,
      completedCount: getCompletedCount(DATA.chapters, progress),
      streakDays: calculateStreak(progress),
      dailyTarget: progress.dailyTarget || 3,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActive: TODAY,
    });

    pendingSocialSignup = null;
    hideSocialProfileStep();
    state.isAuthenticated = true;
    state.firebaseUser = firebaseUser;
    syncUser(user, progress);
    await refreshLeaderboard().catch(() => {});
    setView("home");
    render();
    showTutorial();
  } catch (error) {
    elements.socialProfileMessage.textContent = getAuthErrorMessage(error);
    elements.socialProfileMessage.hidden = false;
  } finally {
    setSubmitLoading(elements.socialProfileSubmitBtn, false);
  }
}

// Firebase has no built-in Naver provider, so this does the OAuth redirect
// by hand (skips the Naver JS SDK entirely, since its only client-visible
// job here — getting an access token back via a redirect — is one URL and
// one hash-param read; the SDK otherwise insists on rendering its own
// button, which we don't want next to the Google one). The access token
// itself proves nothing on its own: naverSignIn() below re-verifies it
// server-side against Naver's own profile API before minting a Firebase
// custom token, so a forged/tampered token client-side can't sign anyone in.
const NAVER_CLIENT_ID = "vYJ9sJffUdYZRnsjFfzG";
const NAVER_OAUTH_STATE_KEY = "naverOAuthState";
const FUNCTIONS_REGION = "asia-northeast3";

function naverRedirectUri() {
  // Naver requires an exact string match against what's registered in the
  // Naver Developers console — location.pathname varies ("/", "/index.html",
  // trailing slash or not) depending on how the page was opened, so origin
  // alone (which Naver console should have registered verbatim, no
  // trailing slash) is the only value that's reliably stable.
  return location.origin;
}

async function signInWithNaver() {
  setAuthBanner("");
  const state = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    sessionStorage.setItem(NAVER_OAUTH_STATE_KEY, state);
  } catch {
    // Private mode / storage disabled — state check on return just gets
    // skipped below rather than blocking the whole login.
  }
  const authUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("client_id", NAVER_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", naverRedirectUri());
  authUrl.searchParams.set("state", state);
  location.href = authUrl.toString();
}

// Naver redirects back with the token in the URL *hash* (implicit-grant
// style), not a query param — read once at startup, then strip it so a
// later refresh doesn't try to replay a used token.
async function handleNaverRedirectReturn() {
  if (!location.hash.includes("access_token=")) return;
  const params = new URLSearchParams(location.hash.slice(1));
  const accessToken = params.get("access_token");
  const returnedState = params.get("state");
  history.replaceState(null, "", location.pathname + location.search);
  if (!accessToken) return;

  let expectedState = null;
  try {
    expectedState = sessionStorage.getItem(NAVER_OAUTH_STATE_KEY);
    sessionStorage.removeItem(NAVER_OAUTH_STATE_KEY);
  } catch {
    // No sessionStorage — can't check state, but proceed anyway rather
    // than locking private-mode users out entirely.
  }
  if (expectedState && returnedState !== expectedState) {
    setAuthBanner("네이버 로그인 상태 확인에 실패했습니다. 다시 시도해 주세요.");
    return;
  }

  try {
    const naverSignIn = firebase.app().functions(FUNCTIONS_REGION).httpsCallable("naverSignIn");
    const { data } = await naverSignIn({ accessToken });
    if (data.isNewUser) {
      pendingSocialSignup = { name: data.name || "" };
    }
    await auth.signInWithCustomToken(data.customToken);
  } catch (error) {
    setAuthBanner(getAuthErrorMessage(error));
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  if (!state.isAuthenticated) return;

  state.progress.dailyTarget = Math.max(1, Number(elements.profileDailyTarget.value) || 3);
  state.user.nickname = elements.profileNickname.value.trim() || state.user.nickname;
  state.user.share = elements.shareProfile.checked;
  state.user.titleAchievementId = elements.representativeTitleSelect.value || null;
  state.user.title = computeDisplayTitle(state.user.titleAchievementId);

  try {
    await saveProgress();
    await refreshLeaderboard();
    elements.profileMessage.textContent = "내 정보가 저장되었습니다.";
    render();
  } catch (error) {
    elements.profileMessage.textContent = getAuthErrorMessage(error);
  }
}

async function logout() {
  await auth.signOut();
}

async function resetProgress() {
  const ok = window.confirm(
    "현재 계정의 통독 진행도를 초기화할까요? (이미 획득한 칭호와 완독 횟수는 유지됩니다)"
  );
  if (!ok) return;

  // "이게 진짜일 리 없어" is event-driven (resetting with real progress on the
  // line), not state-driven, so it can't be expressed as an ACHIEVEMENTS
  // check(ctx) — by the time anything re-runs the pipeline, `completed` here
  // has already been wiped below. Unlock it directly, before the wipe.
  const doneBeforeReset = getCompletedCount(DATA.chapters, state.progress);
  let newlyUnlocked = [];
  if (doneBeforeReset >= 25 && !state.progress.unlockedAchievements["not-really"]) {
    state.progress.unlockedAchievements["not-really"] = { unlockedAt: TODAY };
    const achievement = ACHIEVEMENTS.find((item) => item.id === "not-really");
    if (achievement) newlyUnlocked = [achievement];
  }

  state.progress = {
    ...createProgress(),
    cycles: state.progress.cycles,
    totalChaptersRead: state.progress.totalChaptersRead,
    readDates: state.progress.readDates,
    earlyMorningCount: state.progress.earlyMorningCount,
    midnightCount: state.progress.midnightCount,
    unlockedAchievements: state.progress.unlockedAchievements,
    quizCorrectStreak: state.progress.quizCorrectStreak,
  };
  state.selectedBook = DATA.books[0].name;
  state.selectedChapterId = DATA.chapters[0].id;
  render();
  await saveProgress();
  await refreshLeaderboard();
  render();
  queueAchievementUnlocks(newlyUnlocked);
}

elements.achievementModalCloseBtn.addEventListener("click", showNextAchievementModal);

elements.viewRecordsBtn.addEventListener("click", openCalendarModal);
elements.calendarCloseBtn.addEventListener("click", closeCalendarModal);

// The week strip itself now opens the calendar (replaces the old separate
// "통독 캘린더 보기" button below it) — role="button" in the markup, so
// Enter/Space need to be wired by hand same as a real <button> would.
elements.weekStrip.addEventListener("click", openCalendarModal);
elements.weekStrip.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openCalendarModal();
  }
});
elements.calendarPrevBtn.addEventListener("click", () => {
  state.calendarViewDate.setMonth(state.calendarViewDate.getMonth() - 1);
  renderCalendarModal();
});
elements.calendarNextBtn.addEventListener("click", () => {
  state.calendarViewDate.setMonth(state.calendarViewDate.getMonth() + 1);
  renderCalendarModal();
});

elements.tutorialSkipBtn.addEventListener("click", completeTutorial);
elements.tutorialNextBtn.addEventListener("click", () => {
  if (tutorialStepIndex === elements.tutorialSteps.length - 1) {
    completeTutorial();
  } else {
    tutorialStepIndex += 1;
    renderTutorialStep();
  }
});

elements.installTutorialBtn.addEventListener("click", showInstallTutorial);
elements.homeInstallTutorialBtn.addEventListener("click", showInstallTutorial);
elements.installTutorialSkipBtn.addEventListener("click", closeInstallTutorial);
elements.installTutorialNextBtn.addEventListener("click", () => {
  if (installTutorialStepIndex === elements.installTutorialSteps.length - 1) {
    closeInstallTutorial();
  } else {
    installTutorialStepIndex += 1;
    renderInstallTutorialStep();
  }
});

elements.authModeButtons.forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

elements.passwordToggleButtons.forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

elements.gateSignupPassword.addEventListener("input", updatePasswordMatchStatus);
elements.gateSignupPasswordConfirm.addEventListener("input", updatePasswordMatchStatus);
elements.gateSignupEmail.addEventListener("input", updateSignupEmailStatus);
elements.forgotPasswordBtn.addEventListener("click", handleForgotPassword);
elements.gateSignupForm.addEventListener("reset", () => {
  requestAnimationFrame(() => {
    updatePasswordMatchStatus();
    clearSignupFieldErrors();
  });
});

elements.viewTabs.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.viewTab === "quiz") state.quizStep = "books";
    setView(button.dataset.viewTab);
  });
});

elements.jumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const testament = button.dataset.jumpTestament;
    if (testament) {
      state.bookTestamentFilter = testament;
      setTestamentToggleUI(testament);
      state.quizStep = "books";
      renderBookGrid();
    }
    setView(button.dataset.jumpView);
  });
});

elements.bookSearchInput.addEventListener("input", (event) => {
  state.bookSearchQuery = event.target.value;
  renderBookGrid();
});

elements.testamentToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.bookTestamentFilter = button.dataset.testament;
    setTestamentToggleUI(button.dataset.testament);
    renderBookGrid();
  });
});

elements.chapterBackBtn.addEventListener("click", () => {
  state.quizStep = "books";
  renderQuizStep();
});

elements.readingBackBtn.addEventListener("click", () => {
  state.quizStep = "chapters";
  renderQuizStep();
});

elements.startQuizBtn.addEventListener("click", () => {
  startQuiz();
});

elements.readingSizeButtons.forEach((button) => {
  button.addEventListener("click", () => setReadingFontSize(button.dataset.fontSize));
});

elements.readingBoldBtn.addEventListener("click", toggleReadingBold);

elements.quizBackBtn.addEventListener("click", () => {
  state.quizStep = "reading";
  renderQuizStep();
});

elements.chapterLink.addEventListener("click", () => {
  state.quizStep = "reading";
  renderQuizStep();
});

elements.quizExitBtn.addEventListener("click", () => {
  state.quizStep = "books";
  setView("quiz");
});

elements.dailyTarget.addEventListener("change", async (event) => {
  state.progress.dailyTarget = Math.max(1, Number(event.target.value) || 3);
  render();
  await saveProgress();
});

elements.hintBtn.addEventListener("click", () => {
  const hidden = elements.hintText.hidden;
  elements.hintText.hidden = !hidden;
  elements.hintBtn.textContent = hidden ? "힌트 닫기" : "힌트 보기";
});

elements.nextBtn.addEventListener("click", goToNextChapter);
elements.homeNextBtn.addEventListener("click", goToNextIncomplete);
elements.undoBtn.addEventListener("click", async () => {
  const chapter = getCurrentChapter();
  delete state.progress.completed[chapter.id];
  render();
  await saveProgress();
  await refreshLeaderboard();
  render();
});
elements.resetBtn.addEventListener("click", resetProgress);
elements.gateLoginForm.addEventListener("submit", handleLogin);
elements.gateSignupForm.addEventListener("submit", handleSignup);
elements.gateSocialProfileForm.addEventListener("submit", handleSocialProfileSubmit);
elements.googleLoginBtn.addEventListener("click", async () => {
  setAuthBanner("");
  try {
    const result = await auth.signInWithPopup(googleProvider);
    // Set this BEFORE anything else can react to the now-signed-in state —
    // same reasoning as resolvePendingSocialRedirect below: onAuthStateChanged
    // could otherwise process the sign-in first and fall through to the
    // normal-returning-user path before this flag is ever seen.
    if (result?.user && result.additionalUserInfo?.isNewUser) {
      pendingSocialSignup = { name: result.user.displayName || "" };
    }
  } catch (error) {
    if (error?.code !== "auth/popup-closed-by-user" && error?.code !== "auth/cancelled-popup-request") {
      setAuthBanner(getAuthErrorMessage(error));
    }
  }
});
elements.naverLoginBtn.addEventListener("click", signInWithNaver);
elements.profileForm.addEventListener("submit", handleProfileSave);
elements.logoutBtn.addEventListener("click", logout);

// Google now signs in via a popup (see googleLoginBtn above), which resolves
// its own promise directly — no page reload, so nothing needs recovering
// here for it. Naver is still a full-page redirect (nid.naver.com has no
// popup-postMessage option we control), so its return still has to be
// handled at startup, same as before: this must fully resolve BEFORE
// onAuthStateChanged is even registered below, since Naver's sign-in
// completes *inside* this call (it ends by awaiting signInWithCustomToken),
// and onAuthStateChanged's first firing needs pendingSocialSignup already
// set by the time it happens, not racing to catch up with it.
async function resolvePendingSocialRedirect() {
  await handleNaverRedirectReturn();
}

elements.darkModeToggle.checked = document.documentElement.getAttribute("data-theme") === "dark";
elements.darkModeToggle.addEventListener("change", () => {
  const isDark = elements.darkModeToggle.checked;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  try {
    localStorage.setItem(THEME_PREF_KEY, isDark ? "dark" : "light");
  } catch {
    // Private mode / storage disabled — the toggle still works for this
    // session, it just won't be remembered next time.
  }
});

setNotificationStatus(defaultNotificationHint());
if (elements.momentVerseToggle) {
  elements.momentVerseToggle.addEventListener("change", handleMomentVerseToggleChange);
}
if (elements.momentVerseCountSelect) {
  elements.momentVerseCountSelect.addEventListener("change", saveMomentVerseSettings);
}

// Foreground messages (app open + tab focused) don't go through the service
// worker's onBackgroundMessage at all — they only ever reach the page via
// this handler. Best-effort: unsupported browsers just skip it.
(async () => {
  try {
    if (firebase.messaging?.isSupported && !(await firebase.messaging.isSupported())) return;
    firebase.messaging().onMessage(async (payload) => {
      console.log("[FCM] foreground message:", payload);
      // Data-only payload (see service-worker.js) — nothing auto-displays
      // for a foreground tab either, so show it ourselves for the same
      // "✨ 순간의 말씀 / 본문 / - 출처 -" look regardless of tab focus.
      const data = payload.data || {};
      if (!data.title) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(data.title, {
          body: data.body || "",
          icon: "./icon-192.png",
          badge: "./icon-32.png",
          data,
        });
      } catch {
        // No active registration yet — safe to just skip showing it.
      }
    });
  } catch {
    // Messaging unsupported in this browser/context — nothing to wire up.
  }
})();

// "순간의 말씀" notification click → opens Verbum already on that exact
// verse. The service worker hands this off as plain URL query params
// (not postMessage) so it works the same whether the click opened a brand
// new window or focused/reloaded an existing one.
async function openPendingMomentVerseLink() {
  const params = new URLSearchParams(location.search);
  const book = params.get("moment_book");
  const chapterNum = Number(params.get("moment_chapter"));
  const verseNum = Number(params.get("moment_verse"));
  if (!book || !chapterNum) return;

  // Strip the params immediately so a later refresh doesn't re-trigger the
  // jump and fight with wherever the user has since navigated to.
  history.replaceState(null, "", location.pathname);

  const chapter = DATA.chapters.find((item) => item.book === book && item.chapter === chapterNum);
  if (!chapter) return;

  setView("quiz");
  await selectChapter(chapter.id);
  await renderReading();

  if (!verseNum) return;
  const verseEl = Array.from(elements.readingText.querySelectorAll(".reading-verse")).find(
    (line) => line.querySelector(".v-num")?.textContent === String(verseNum)
  );
  if (verseEl) {
    verseEl.scrollIntoView({ behavior: "smooth", block: "center" });
    verseEl.classList.add("verse-highlight");
    setTimeout(() => verseEl.classList.remove("verse-highlight"), 4000);
  }
}

async function handleAuthStateChange(firebaseUser) {
  try {
    if (state.creatingAccount) return;

    if (!firebaseUser) {
      state.isAuthenticated = false;
      state.firebaseUser = null;
      state.user = getSignedOutUser();
      state.progress = createProgress();
      state.leaderboard = [];
      setView("home");
      render();
      return;
    }

    if (pendingSocialSignup) {
      state.firebaseUser = firebaseUser;
      showSocialProfileStep(pendingSocialSignup.name);
      return;
    }

    state.isAuthenticated = true;
    state.firebaseUser = firebaseUser;
    const { user, progress } = await loadUserProfile(firebaseUser);
    syncUser(user, progress);
    await saveProgress();
    await refreshLeaderboard();
    setView("home");
    render();
    if (!state.user.hasSeenTutorial) {
      showTutorial();
    }
    await openPendingMomentVerseLink();
  } catch (error) {
    setAuthBanner(getAuthErrorMessage(error));
    state.isAuthenticated = false;
    render();
  }
}

resolvePendingSocialRedirect().finally(() => {
  auth.onAuthStateChanged(handleAuthStateChange);
});

// Declared here (rather than down in the "add to home screen" section below
// where it's actually populated, via the `beforeinstallprompt` listener) so
// that it's already initialized by the time `render()` on the next line
// makes its first synchronous pass through `renderNotificationPwaStatus()` —
// that `let` binding would otherwise still be in its temporal dead zone at
// this point in the file and throw.
let deferredInstallPrompt = null;

render();
document.documentElement.dataset.appReady = "true";

setTimeout(() => {
  elements.splashScreen.classList.add("splash-hidden");
}, 2000);

updateLeaderboardCountdown();
setInterval(updateLeaderboardCountdown, 1000);

// ── "Add to home screen" install banner (login screen + home screen) ─────

function isRunningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function detectInstallPlatform() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid };
}

const installBannerGroups = [
  {
    banner: elements.installBanner,
    title: elements.installBannerTitle,
    body: elements.installBannerBody,
    actionBtn: elements.installActionBtn,
    tutorialBtn: elements.installTutorialBtn,
  },
  {
    banner: elements.homeInstallBanner,
    title: elements.homeInstallBannerTitle,
    body: elements.homeInstallBannerBody,
    actionBtn: elements.homeInstallActionBtn,
    tutorialBtn: elements.homeInstallTutorialBtn,
  },
];

function hideInstallBanners() {
  installBannerGroups.forEach((group) => {
    group.banner.hidden = true;
  });
}

function showInstallBanner(platform) {
  return; // paused for now — install banner hidden while the redesign settles
  if (isRunningStandalone()) return;
  if (localStorage.getItem("installBannerDismissed") === "true") return;

  let title = "";
  let body = "";
  let showAction = false;
  let showTutorial = false;

  if (platform === "android") {
    title = "홈 화면에 추가하기";
    body = "앱처럼 더 빠르고 편하게 쓸 수 있어요. 설치 중 경고 문구가 떠도 무시하고 설치를 눌러주세요.";
    showAction = true;
  } else if (platform === "ios") {
    title = "홈 화면에 추가하기";
    body = '공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택하세요.';
    showTutorial = true;
  } else {
    return;
  }

  installBannerGroups.forEach((group) => {
    group.title.textContent = title;
    group.body.textContent = body;
    group.actionBtn.hidden = !showAction;
    group.tutorialBtn.hidden = !showTutorial;
    group.banner.hidden = false;
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBanner("android");
  // The "설치" button in the 알림 card only makes sense once this prompt is
  // actually available, and this event fires asynchronously well after the
  // profile panel may already be visible — re-render so it can appear.
  renderNotificationPwaStatus();
});

elements.installActionBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  hideInstallBanners();
});

elements.homeInstallActionBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  hideInstallBanners();
});

elements.installBannerCloseBtn.addEventListener("click", () => {
  hideInstallBanners();
  localStorage.setItem("installBannerDismissed", "true");
});

elements.homeInstallBannerCloseBtn.addEventListener("click", () => {
  hideInstallBanners();
  localStorage.setItem("installBannerDismissed", "true");
});

const { isIOS: isIOSDevice } = detectInstallPlatform();
if (isIOSDevice) {
  showInstallBanner("ios");
}

// ── 알림 카드의 PWA 수신 가능 여부 표시 ───────────────────────────────
// Web Push actually reaches the device only when BOTH conditions hold:
// (1) the platform allows it at all — iOS Safari refuses push entirely
// unless the app is already installed to the home screen (standalone
// display mode); Android/desktop can receive from a plain open tab — and
// (2) the OS/browser notification permission for this origin is actually
// "granted", not just "default" (never asked) or "denied" (blocked). Only
// (1) used to be checked; this reads live off `Notification.permission`
// too, which can change at any time behind our back via browser settings.
function getNotificationReadiness() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  const { isIOS } = detectInstallPlatform();
  if (isIOS && !isRunningStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") return "default";
  return "ready";
}

function canReceiveNotifications() {
  return getNotificationReadiness() === "ready";
}

// Defined inline (rather than as a module-level const) so this has no
// dependency on where in the file it sits relative to its first call — see
// the `deferredInstallPrompt` comment above for why that ordering matters
// here: render() makes its first synchronous pass through this function
// well before the bottom of the file finishes executing.
function renderNotificationPwaStatus() {
  if (!elements.notificationPwaStatus) return;
  const readiness = getNotificationReadiness();
  const ready = readiness === "ready";
  const { isIOS, isAndroid } = detectInstallPlatform();
  const messages = {
    ready: "알림 준비 완료",
    "needs-install": "홈 화면에 추가(PWA 설치)해야 알림을 받을 수 있어요",
    denied: "알림이 차단되어 있어요 — 기기/브라우저 설정에서 허용해주세요",
    default: "알림을 켜면 권한 요청 창이 떠요",
    unsupported: "이 브라우저는 알림을 지원하지 않아요",
  };

  elements.notificationPwaStatus.textContent = messages[readiness];
  elements.notificationPwaStatus.classList.toggle("ready", ready);

  // The install/tutorial buttons only ever help the "needs-install" case —
  // a denied/default permission is fixed via the toggle or the browser's
  // own settings, not by installing the app.
  const showInstallActions = readiness === "needs-install";
  if (elements.notificationPwaActions) {
    elements.notificationPwaActions.hidden = !showInstallActions;
  }
  if (elements.notificationInstallActionBtn) {
    elements.notificationInstallActionBtn.hidden = !showInstallActions || !isAndroid || !deferredInstallPrompt;
  }
  if (elements.notificationInstallTutorialBtn) {
    elements.notificationInstallTutorialBtn.hidden = !showInstallActions || !isIOS;
  }
}

if (elements.notificationInstallActionBtn) {
  elements.notificationInstallActionBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    renderNotificationPwaStatus();
  });
}

if (elements.notificationInstallTutorialBtn) {
  elements.notificationInstallTutorialBtn.addEventListener("click", showInstallTutorial);
}

// Foldable fold/unfold or a window resize across the wide breakpoint needs a
// full re-render — the Bible pane layout and every wide CSS grid flip at once.
WIDE_MQ.addEventListener("change", () => {
  renderQuizStep();
  render();
});

// Task 9: Bible left-pane collapse toggle, 620-899px sub-range only.
elements.biblePaneToggle.addEventListener("click", () => {
  state.biblePaneCollapsed = !state.biblePaneCollapsed;
  applyBiblePane();
});
NARROW_WIDE_MQ.addEventListener("change", applyBiblePane);
