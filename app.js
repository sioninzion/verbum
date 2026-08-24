const DATA = BIBLE_APP_DATA;
const LEGACY_PROGRESS_KEY = "bible-reading-quiz-progress-v1";
const TODAY = new Date().toISOString().slice(0, 10);
const OPTION_MARKS = ["①", "②", "③", "④"];
const USER_DOMAIN = "jybible.local";
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

try {
  firebase.analytics();
} catch {
  // Analytics unsupported in this browser/environment; safe to skip.
}

const chaptersByBook = DATA.books.reduce((map, book) => {
  map[book.name] = DATA.chapters.filter((chapter) => chapter.book === book.name);
  return map;
}, {});

const chaptersById = new Map(DATA.chapters.map((chapter) => [chapter.id, chapter]));

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
};

// Debug hook only — lets you inspect/mutate state from the browser console.
window.__appState = state;

const elements = {
  splashScreen: document.querySelector("#splashScreen"),
  appShell: document.querySelector("#appShell"),
  loginGate: document.querySelector("#loginGate"),
  authModeButtons: document.querySelectorAll("[data-auth-mode]"),
  gateLoginForm: document.querySelector("#gateLoginForm"),
  gateLoginId: document.querySelector("#gateLoginId"),
  gateLoginPassword: document.querySelector("#gateLoginPassword"),
  gateSignupForm: document.querySelector("#gateSignupForm"),
  gateSignupId: document.querySelector("#gateSignupId"),
  gateSignupPassword: document.querySelector("#gateSignupPassword"),
  gateSignupPasswordConfirm: document.querySelector("#gateSignupPasswordConfirm"),
  passwordMatchMessage: document.querySelector("#passwordMatchMessage"),
  passwordToggleButtons: document.querySelectorAll("[data-password-target]"),
  gateSignupName: document.querySelector("#gateSignupName"),
  gateSignupNickname: document.querySelector("#gateSignupNickname"),
  gateSignupPhone: document.querySelector("#gateSignupPhone"),
  signupIdError: document.querySelector("#signupIdError"),
  signupPhoneError: document.querySelector("#signupPhoneError"),
  loginSubmitBtn: document.querySelector("#loginSubmitBtn"),
  signupSubmitBtn: document.querySelector("#signupSubmitBtn"),
  gateLoginMessage: document.querySelector("#gateLoginMessage"),
  dashboard: document.querySelector("#dashboard"),
  viewTabs: document.querySelectorAll("[data-view-tab]"),
  viewPanels: document.querySelectorAll("[data-view-panel]"),
  jumpButtons: document.querySelectorAll("[data-jump-view]"),
  homeTitle: document.querySelector("#homeTitle"),
  homeGreeting: document.querySelector("#homeGreeting"),
  homeVerseText: document.querySelector("#homeVerseText"),
  homeVerseRef: document.querySelector("#homeVerseRef"),
  homePercent: document.querySelector("#homePercent"),
  homeStreak: document.querySelector("#homeStreak"),
  homeTarget: document.querySelector("#homeTarget"),
  homeRank: document.querySelector("#homeRank"),
  homeNextBtn: document.querySelector("#homeNextBtn"),
  nextChapterTitle: document.querySelector("#nextChapterTitle"),
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
  chapterBackBtn: document.querySelector("#chapterBackBtn"),
  quizBackBtn: document.querySelector("#quizBackBtn"),
  selectedTestament: document.querySelector("#selectedTestament"),
  selectedBook: document.querySelector("#selectedBook"),
  bookPercent: document.querySelector("#bookPercent"),
  bookCount: document.querySelector("#bookCount"),
  chapterGrid: document.querySelector("#chapterGrid"),
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
  resetBtn: document.querySelector("#resetBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  accountUserId: document.querySelector("#accountUserId"),
  accountName: document.querySelector("#accountName"),
  profileForm: document.querySelector("#profileForm"),
  profileNickname: document.querySelector("#profileNickname"),
  profileDailyTarget: document.querySelector("#profileDailyTarget"),
  shareProfile: document.querySelector("#shareProfile"),
  profileMessage: document.querySelector("#profileMessage"),
  leaderboard: document.querySelector("#leaderboard"),
  achievementCount: document.querySelector("#achievementCount"),
  achievementGroups: document.querySelector("#achievementGroups"),
  representativeTitleSelect: document.querySelector("#representativeTitleSelect"),
  achievementModal: document.querySelector("#achievementModal"),
  achievementModalRarity: document.querySelector("#achievementModalRarity"),
  achievementModalName: document.querySelector("#achievementModalName"),
  achievementModalCondition: document.querySelector("#achievementModalCondition"),
  achievementModalCloseBtn: document.querySelector("#achievementModalCloseBtn"),
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

  return {
    totalRead: progress.totalChaptersRead || 0,
    longestStreak,
    completedBooks: getCompletedBooksSet(progress),
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

function getSignedOutUser() {
  return {
    uid: "",
    userId: "",
    name: "방문자",
    nickname: "방문자",
    title: DEFAULT_TITLE,
    titleAchievementId: null,
    phoneNumber: "",
    share: false,
  };
}

function normalizeUserId(value) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function userIdToEmail(userId) {
  return `${normalizeUserId(userId)}@${USER_DOMAIN}`;
}

function normalizePhoneNumber(value) {
  const compact = value.trim().replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("0")) return `+82${compact.slice(1)}`;
  return compact;
}

function validatePhoneNumber(value) {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(value));
}

function getPhoneKey(phoneNumber) {
  return normalizePhoneNumber(phoneNumber).replace(/[^\d]/g, "");
}

function getPhoneInputMessage() {
  return "전화번호는 01012345678 형식으로 입력해 주세요.";
}

function validateUserId(userId) {
  return /^[a-z0-9._-]{3,24}$/.test(normalizeUserId(userId));
}

function getAuthErrorMessage(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "이미 사용 중인 아이디입니다.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "아이디 또는 비밀번호를 확인해 주세요.";
  }
  if (code.includes("weak-password")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (code.includes("invalid-phone-number")) return getPhoneInputMessage();
  if (code.includes("credential-already-in-use") || code.includes("phone-number-already-exists")) {
    return "이미 다른 계정에 연결된 전화번호입니다.";
  }
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

function calculateStreak(progress = state.progress) {
  const days = new Set(Object.values(progress.completed || {}).map((entry) => entry.date));
  let count = 0;
  const cursor = new Date(`${TODAY}T00:00:00`);

  while (days.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

function getUserDocRef(uid = state.firebaseUser?.uid) {
  return db.collection("users").doc(uid);
}

function getPhoneDocRef(phoneNumber) {
  return db.collection("phoneNumbers").doc(getPhoneKey(phoneNumber));
}

async function isPhoneNumberTaken(phoneNumber) {
  try {
    const snapshot = await getPhoneDocRef(phoneNumber).get();
    return snapshot.exists;
  } catch {
    return false;
  }
}

function buildProfilePayload() {
  const done = getCompletedCount(DATA.chapters);
  return {
    uid: state.firebaseUser.uid,
    userId: state.user.userId,
    email: state.firebaseUser.email,
    name: state.user.name,
    nickname: state.user.nickname,
    title: state.user.title,
    titleAchievementId: state.user.titleAchievementId || null,
    phoneNumber: state.user.phoneNumber || state.firebaseUser.phoneNumber || "",
    share: Boolean(state.user.share),
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
    const userId = firebaseUser.email.split("@")[0];
    return {
      user: {
        uid: firebaseUser.uid,
        userId,
        name: firebaseUser.displayName || userId,
        nickname: firebaseUser.displayName || userId,
        title: DEFAULT_TITLE,
        titleAchievementId: null,
        phoneNumber: firebaseUser.phoneNumber || "",
        share: true,
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
        userId: data.userId || firebaseUser.email.split("@")[0],
        name: data.name || firebaseUser.displayName || "통독자",
        nickname: data.nickname || data.name || "통독자",
        title: computeDisplayTitle(titleAchievementId),
        titleAchievementId,
        phoneNumber: data.phoneNumber || firebaseUser.phoneNumber || "",
        share: Boolean(data.share),
      },
      progress: { ...createProgress(), ...(data.progress || {}) },
    };
  }

  const userId = firebaseUser.email.split("@")[0];
  const user = {
    uid: firebaseUser.uid,
    userId,
    name: firebaseUser.displayName || userId,
    nickname: firebaseUser.displayName || userId,
    title: DEFAULT_TITLE,
    titleAchievementId: null,
    phoneNumber: firebaseUser.phoneNumber || "",
    share: true,
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

  const snapshot = await db.collection("users").where("share", "==", true).get();
  state.leaderboard = snapshot.docs
    .map((item) => {
      const data = item.data();
      const progress = { ...createProgress(), ...(data.progress || {}) };
      const done = data.completedCount ?? getCompletedCount(DATA.chapters, progress);
      return {
        uid: item.id,
        name: data.nickname || data.name || data.userId || "통독자",
        title: data.title || DEFAULT_TITLE,
        done,
        totalPercent: percent(done, DATA.chapters.length),
        today: getTodayCompleted(progress),
        streak: data.streakDays ?? calculateStreak(progress),
        target: data.dailyTarget || progress.dailyTarget || 3,
      };
    })
    .sort((a, b) => b.done - a.done || b.streak - a.streak || a.name.localeCompare(b.name, "ko"));
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

function updateHome() {
  const done = getCompletedCount(DATA.chapters);
  const allPercent = percent(done, DATA.chapters.length);
  const streak = calculateStreak();
  const next = getNextIncompleteChapter();

  elements.homeTitle.textContent = state.user.title;
  elements.homeGreeting.textContent = `${state.user.nickname || state.user.name}님, ${getTimeGreeting()}`;
  elements.homeVerseText.textContent = `“${state.dailyVerse.text}”`;
  elements.homeVerseRef.textContent = state.dailyVerse.ref;
  elements.homePercent.textContent = `${allPercent}%`;
  elements.homeStreak.textContent = `${streak}일`;
  elements.homeTarget.textContent = `${state.progress.dailyTarget || 3}장`;
  elements.homeRank.textContent = getMyRank();
  elements.nextChapterTitle.textContent = `${next.book} ${next.chapter}장`;
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

function renderBookGrid() {
  elements.bookGrid.replaceChildren(
    ...DATA.books.map((book) => {
      const chapters = chaptersByBook[book.name];
      const done = getCompletedCount(chapters);
      const bookPercent = percent(done, chapters.length);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `book-tile${book.name === state.selectedBook ? " active" : ""}`;
      button.setAttribute("aria-label", `${book.name} (${done} / ${chapters.length}장, ${bookPercent}% 완료)`);
      button.innerHTML = `
        <span class="book-tile-fill" aria-hidden="true" data-percent="${bookPercent}" style="height: ${bookPercent}%"></span>
        <span class="book-tile-label">${SHORT_BOOK_NAMES[book.name] || book.name.slice(0, 2)}</span>
      `;
      button.addEventListener("click", () => selectBook(book.name));
      return button;
    })
  );
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
  elements.chapterLink.href = chapter.link || "#";
  elements.chapterLink.hidden = !chapter.link;
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
  elements.accountUserId.textContent = state.user.userId || "-";
  elements.accountName.textContent = state.user.name || "-";
  elements.profileNickname.value = state.user.nickname;
  elements.profileDailyTarget.value = state.progress.dailyTarget || 3;
  elements.shareProfile.checked = Boolean(state.user.share);
  elements.shareProfile.disabled = !state.isAuthenticated;
  elements.profileNickname.disabled = !state.isAuthenticated;
  renderRepresentativeTitlePicker();
}

function renderLeaderboard() {
  if (!state.leaderboard.length) {
    elements.leaderboard.innerHTML = `<p class="empty-state">아직 공유 중인 계정이 없습니다.</p>`;
    return;
  }

  elements.leaderboard.replaceChildren(
    ...state.leaderboard.map((row, index) => {
      const item = document.createElement("article");
      item.className = `leader-row${row.uid === state.firebaseUser?.uid ? " mine" : ""}`;
      item.innerHTML = `
        <div class="rank">${index + 1}</div>
        <div>
          <strong>${row.name}</strong>
          <span>${row.title}</span>
        </div>
        <div class="leader-stats">
          <span>${row.done}장</span>
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
  const countLabel = `${unlockedIds.length}/${ACHIEVEMENTS.length}`;
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
            <span class="achievement-card-icon rarity-${rarityKey}">${unlocked ? "✓" : "🔒"}</span>
            <div class="achievement-card-body">
              <strong>${achievement.name}</strong>
              <span>${achievement.condition}</span>
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
  document.querySelectorAll("[data-quiz-step]").forEach((panel) => {
    panel.classList.toggle("step-active", panel.dataset.quizStep === state.quizStep);
  });
  if (state.quizStep === "books") animateBookGridFill();
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
  setFieldError(elements.signupIdError, "");
  setFieldError(elements.signupPhoneError, "");
  elements.gateSignupId.classList.remove("field-invalid");
  elements.gateSignupPhone.classList.remove("field-invalid");
}

function setAuthMode(mode) {
  const isSignup = mode === "signup";
  elements.gateLoginForm.classList.toggle("hidden", isSignup);
  elements.gateSignupForm.classList.toggle("hidden", !isSignup);
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
  button.textContent = willShow ? "숨기기" : "보기";
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

function updateSignupIdStatus() {
  const value = elements.gateSignupId.value.trim();
  const valid = !value || validateUserId(value);
  elements.gateSignupId.classList.toggle("field-invalid", !valid);
  setFieldError(elements.signupIdError, valid ? "" : "영문 소문자, 숫자, ., _, - 조합 3~24자로 입력해 주세요.");
}

function updateSignupPhoneStatus() {
  const value = elements.gateSignupPhone.value.trim();
  const valid = !value || validatePhoneNumber(value);
  elements.gateSignupPhone.classList.toggle("field-invalid", !valid);
  setFieldError(elements.signupPhoneError, valid ? "" : getPhoneInputMessage());
}

async function selectBook(bookName) {
  state.selectedBook = bookName;
  const firstIncomplete = chaptersByBook[bookName].find((chapter) => !isComplete(chapter.id));
  state.selectedChapterId = firstIncomplete?.id || chaptersByBook[bookName][0].id;
  state.progress.lastChapterId = state.selectedChapterId;
  state.quizStep = "chapters";
  render();
  await saveProgress();
}

async function selectChapter(chapterId) {
  const chapter = DATA.chapters.find((item) => item.id === chapterId);
  state.selectedBook = chapter.book;
  state.selectedChapterId = chapter.id;
  state.progress.lastChapterId = chapter.id;
  state.quizStep = "quiz";
  render();
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
    };
    state.progress.totalChaptersRead = (state.progress.totalChaptersRead || 0) + 1;
    const hour = new Date().getHours();
    if (hour < 4) {
      state.progress.midnightCount = (state.progress.midnightCount || 0) + 1;
    } else if (hour < 6) {
      state.progress.earlyMorningCount = (state.progress.earlyMorningCount || 0) + 1;
    }
    newlyUnlocked = runAchievementPipeline(state.progress);
    elements.feedback.textContent = "정답입니다. 이 장이 완료 처리되었습니다.";
  } else {
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
  const userId = normalizeUserId(elements.gateLoginId.value);
  const password = elements.gateLoginPassword.value;

  if (!userId || !password) {
    setAuthBanner("아이디와 비밀번호를 모두 입력해 주세요.");
    return;
  }

  if (!validateUserId(userId)) {
    setAuthBanner("아이디는 영문 소문자, 숫자, ., _, - 조합 3~24자로 입력해 주세요.");
    return;
  }

  setAuthBanner("로그인 중입니다.", "success");
  setSubmitLoading(elements.loginSubmitBtn, true);
  try {
    await auth.signInWithEmailAndPassword(userIdToEmail(userId), password);
    elements.gateLoginForm.reset();
    setAuthBanner("");
  } catch (error) {
    setAuthBanner(getAuthErrorMessage(error));
  } finally {
    setSubmitLoading(elements.loginSubmitBtn, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  clearSignupFieldErrors();
  setAuthBanner("");

  const userId = normalizeUserId(elements.gateSignupId.value);
  const password = elements.gateSignupPassword.value;
  const passwordConfirm = elements.gateSignupPasswordConfirm.value;
  const name = elements.gateSignupName.value.trim();
  const nickname = elements.gateSignupNickname.value.trim();
  const phoneNumber = normalizePhoneNumber(elements.gateSignupPhone.value);

  let hasFieldError = false;

  if (!validateUserId(userId)) {
    elements.gateSignupId.classList.add("field-invalid");
    setFieldError(elements.signupIdError, "영문 소문자, 숫자, ., _, - 조합 3~24자로 입력해 주세요.");
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

  if (!validatePhoneNumber(phoneNumber)) {
    elements.gateSignupPhone.classList.add("field-invalid");
    setFieldError(elements.signupPhoneError, getPhoneInputMessage());
    hasFieldError = true;
  }

  if (hasFieldError) return;

  setSubmitLoading(elements.signupSubmitBtn, true);

  if (await isPhoneNumberTaken(phoneNumber)) {
    elements.gateSignupPhone.classList.add("field-invalid");
    setFieldError(elements.signupPhoneError, "이미 사용 중인 전화번호입니다.");
    setSubmitLoading(elements.signupSubmitBtn, false);
    return;
  }

  setAuthBanner("계정을 만드는 중입니다.", "success");
  let credential;
  state.creatingAccount = true;
  try {
    credential = await auth.createUserWithEmailAndPassword(userIdToEmail(userId), password);
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
    userId,
    name,
    nickname: nickname || name,
    title: DEFAULT_TITLE,
    titleAchievementId: null,
    phoneNumber,
    share: true,
  };
  state.firebaseUser = credential.user;
  syncUser(user, progress);

  let signupNotice = "";
  const profilePayload = {
    ...user,
    email: credential.user.email,
    phoneNumber,
    progress,
    completedCount: getCompletedCount(DATA.chapters, progress),
    streakDays: calculateStreak(progress),
    dailyTarget: progress.dailyTarget || 3,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastActive: TODAY,
  };

  try {
    const batch = db.batch();
    batch.set(getUserDocRef(credential.user.uid), profilePayload);
    batch.set(getPhoneDocRef(phoneNumber), {
      uid: credential.user.uid,
      phoneNumber,
      userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    try {
      await getUserDocRef(credential.user.uid).set({
        ...user,
        email: credential.user.email,
        phoneNumber,
      progress,
      completedCount: getCompletedCount(DATA.chapters, progress),
      streakDays: calculateStreak(progress),
      dailyTarget: progress.dailyTarget || 3,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: TODAY,
      });
      signupNotice = "계정은 만들어졌습니다. 전화번호 중복 방지는 Firestore 규칙 배포 후 적용됩니다.";
    } catch {
      signupNotice = "계정은 만들어졌습니다. 다만 Firestore 프로필 저장은 규칙 배포 후 다시 동기화됩니다.";
    }
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

async function handleProfileSave(event) {
  event.preventDefault();
  if (!state.isAuthenticated) return;

  state.progress.dailyTarget = Math.max(1, Number(elements.profileDailyTarget.value) || 3);
  state.user.nickname = elements.profileNickname.value.trim() || state.user.nickname;
  state.user.phoneNumber = state.user.phoneNumber || state.firebaseUser?.phoneNumber || "";
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
  state.progress = {
    ...createProgress(),
    cycles: state.progress.cycles,
    totalChaptersRead: state.progress.totalChaptersRead,
    readDates: state.progress.readDates,
    earlyMorningCount: state.progress.earlyMorningCount,
    midnightCount: state.progress.midnightCount,
    unlockedAchievements: state.progress.unlockedAchievements,
  };
  state.selectedBook = DATA.books[0].name;
  state.selectedChapterId = DATA.chapters[0].id;
  render();
  await saveProgress();
  await refreshLeaderboard();
  render();
}

elements.achievementModalCloseBtn.addEventListener("click", showNextAchievementModal);

elements.authModeButtons.forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

elements.passwordToggleButtons.forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

elements.gateSignupPassword.addEventListener("input", updatePasswordMatchStatus);
elements.gateSignupPasswordConfirm.addEventListener("input", updatePasswordMatchStatus);
elements.gateSignupId.addEventListener("input", updateSignupIdStatus);
elements.gateSignupPhone.addEventListener("input", updateSignupPhoneStatus);
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
  button.addEventListener("click", () => setView(button.dataset.jumpView));
});

elements.chapterBackBtn.addEventListener("click", () => {
  state.quizStep = "books";
  renderQuizStep();
});

elements.quizBackBtn.addEventListener("click", () => {
  state.quizStep = "chapters";
  renderQuizStep();
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
elements.profileForm.addEventListener("submit", handleProfileSave);
elements.logoutBtn.addEventListener("click", logout);

auth.onAuthStateChanged(async (firebaseUser) => {
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

    state.isAuthenticated = true;
    state.firebaseUser = firebaseUser;
    const { user, progress } = await loadUserProfile(firebaseUser);
    syncUser(user, progress);
    await saveProgress();
    await refreshLeaderboard();
    setView("home");
    render();
  } catch (error) {
    setAuthBanner(getAuthErrorMessage(error));
    state.isAuthenticated = false;
    render();
  }
});

render();
document.documentElement.dataset.appReady = "true";

setTimeout(() => {
  elements.splashScreen.classList.add("splash-hidden");
}, 2000);
