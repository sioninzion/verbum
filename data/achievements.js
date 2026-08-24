// Achievement ("칭호") definitions — the single source of truth for unlock conditions.
// Each achievement's `check(ctx)` receives a pre-computed context object built by
// buildAchievementContext() in app.js. Do not hardcode achievement conditions anywhere else.

window.BOOK_GROUPS = {
  pentateuch: ["창세기", "출애굽기", "레위기", "민수기", "신명기"],
  historicalOT: [
    "여호수아", "사사기", "룻기", "사무엘상", "사무엘하",
    "열왕기상", "열왕기하", "역대상", "역대하", "에스라", "느헤미야", "에스더",
  ],
  wisdom: ["욥기", "시편", "잠언", "전도서", "아가"],
  majorProphets: ["이사야", "예레미야", "예레미야애가", "에스겔", "다니엘"],
  minorProphets: [
    "호세아", "요엘", "아모스", "오바댜", "요나", "미가",
    "나훔", "하박국", "스바냐", "학개", "스가랴", "말라기",
  ],
  gospels: ["마태복음", "마가복음", "누가복음", "요한복음"],
  pauline: [
    "로마서", "고린도전서", "고린도후서", "갈라디아서", "에베소서", "빌립보서", "골로새서",
    "데살로니가전서", "데살로니가후서", "디모데전서", "디모데후서", "디도서", "빌레몬서",
  ],
  generalEpistles: [
    "히브리서", "야고보서", "베드로전서", "베드로후서",
    "요한일서", "요한이서", "요한삼서", "유다서",
  ],
};

window.BOOK_GROUPS.oldTestamentAll = []
  .concat(window.BOOK_GROUPS.pentateuch)
  .concat(window.BOOK_GROUPS.historicalOT)
  .concat(window.BOOK_GROUPS.wisdom)
  .concat(window.BOOK_GROUPS.majorProphets)
  .concat(window.BOOK_GROUPS.minorProphets);

window.BOOK_GROUPS.newTestamentAll = []
  .concat(window.BOOK_GROUPS.gospels)
  .concat(["사도행전"])
  .concat(window.BOOK_GROUPS.pauline)
  .concat(window.BOOK_GROUPS.generalEpistles)
  .concat(["요한계시록"]);

window.RARITY_META = {
  common: { label: "일반", order: 1 },
  rare: { label: "희귀", order: 2 },
  epic: { label: "영웅", order: 3 },
  legendary: { label: "전설", order: 4 },
};

function allBooksDone(ctx, books) {
  return books.every((book) => ctx.completedBooks.has(book));
}

window.ACHIEVEMENTS = [
  // ── 일반 ─────────────────────────────────────────────────────────
  { id: "first-steps", rarity: "common", name: "첫걸음", condition: "성경 10장을 읽으세요", check: (ctx) => ctx.totalRead >= 10 },
  { id: "past-three-days", rarity: "common", name: "작심삼일을 넘어서", condition: "3일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 3 },
  { id: "seventh-day", rarity: "common", name: "일곱째 날까지", condition: "7일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 7 },
  { id: "book-genesis", rarity: "common", name: "모든 것의 시작", condition: "창세기를 완독하세요", check: (ctx) => ctx.completedBooks.has("창세기") },
  { id: "book-exodus", rarity: "common", name: "탈출!", condition: "출애굽기를 완독하세요", check: (ctx) => ctx.completedBooks.has("출애굽기") },
  { id: "book-leviticus", rarity: "common", name: "거룩하라", condition: "레위기를 완독하세요", check: (ctx) => ctx.completedBooks.has("레위기") },
  { id: "book-numbers", rarity: "common", name: "광야를 지나서", condition: "민수기를 완독하세요", check: (ctx) => ctx.completedBooks.has("민수기") },
  { id: "book-deuteronomy", rarity: "common", name: "다시 새기는 말씀", condition: "신명기를 완독하세요", check: (ctx) => ctx.completedBooks.has("신명기") },
  { id: "book-joshua", rarity: "common", name: "강하고 담대하게", condition: "여호수아를 완독하세요", check: (ctx) => ctx.completedBooks.has("여호수아") },
  { id: "book-judges", rarity: "common", name: "사사로운 시대", condition: "사사기를 완독하세요", check: (ctx) => ctx.completedBooks.has("사사기") },
  { id: "book-ruth", rarity: "common", name: "어디로 가든지", condition: "룻기를 완독하세요", check: (ctx) => ctx.completedBooks.has("룻기") },
  { id: "book-esther", rarity: "common", name: "이 때를 위함이 아닌지", condition: "에스더를 완독하세요", check: (ctx) => ctx.completedBooks.has("에스더") },
  { id: "book-ecclesiastes", rarity: "common", name: "헛되지 않은 것", condition: "전도서를 완독하세요", check: (ctx) => ctx.completedBooks.has("전도서") },
  { id: "book-matthew", rarity: "common", name: "왕이 오셨다", condition: "마태복음을 완독하세요", check: (ctx) => ctx.completedBooks.has("마태복음") },
  { id: "book-mark", rarity: "common", name: "곧바로", condition: "마가복음을 완독하세요", check: (ctx) => ctx.completedBooks.has("마가복음") },
  { id: "book-luke", rarity: "common", name: "한 마리 양", condition: "누가복음을 완독하세요", check: (ctx) => ctx.completedBooks.has("누가복음") },
  { id: "book-john", rarity: "common", name: "말씀이 육신이 되어", condition: "요한복음을 완독하세요", check: (ctx) => ctx.completedBooks.has("요한복음") },
  { id: "book-acts", rarity: "common", name: "땅 끝까지", condition: "사도행전을 완독하세요", check: (ctx) => ctx.completedBooks.has("사도행전") },
  { id: "book-romans", rarity: "common", name: "오직 믿음으로", condition: "로마서를 완독하세요", check: (ctx) => ctx.completedBooks.has("로마서") },
  { id: "book-1corinthians", rarity: "common", name: "사랑이 없으면", condition: "고린도전서를 완독하세요", check: (ctx) => ctx.completedBooks.has("고린도전서") },
  { id: "book-2corinthians", rarity: "common", name: "약할 때 강함이라", condition: "고린도후서를 완독하세요", check: (ctx) => ctx.completedBooks.has("고린도후서") },
  { id: "book-galatians", rarity: "common", name: "자유를 위하여", condition: "갈라디아서를 완독하세요", check: (ctx) => ctx.completedBooks.has("갈라디아서") },
  { id: "book-ephesians", rarity: "common", name: "하나 되어", condition: "에베소서를 완독하세요", check: (ctx) => ctx.completedBooks.has("에베소서") },
  { id: "book-philippians", rarity: "common", name: "항상 기뻐하라", condition: "빌립보서를 완독하세요", check: (ctx) => ctx.completedBooks.has("빌립보서") },
  { id: "book-colossians", rarity: "common", name: "위의 것을 찾으라", condition: "골로새서를 완독하세요", check: (ctx) => ctx.completedBooks.has("골로새서") },
  { id: "book-hebrews", rarity: "common", name: "더 나은 언약", condition: "히브리서를 완독하세요", check: (ctx) => ctx.completedBooks.has("히브리서") },
  { id: "book-james", rarity: "common", name: "행함이 있는 믿음", condition: "야고보서를 완독하세요", check: (ctx) => ctx.completedBooks.has("야고보서") },

  // ── 희귀 ─────────────────────────────────────────────────────────
  { id: "tasted-the-word", rarity: "rare", name: "이제는 익숙해!", condition: "성경 50장을 읽으세요", check: (ctx) => ctx.totalRead >= 50 },
  { id: "hundred-chapters", rarity: "rare", name: "백(부)장", condition: "성경 100장을 읽으세요", check: (ctx) => ctx.totalRead >= 100 },
  { id: "month-in-wilderness", rarity: "rare", name: "광야의 한 달", condition: "30일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 30 },
  { id: "forty-days-of-rain", rarity: "rare", name: "성벽 재건자", condition: "52일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 52 },
  { id: "start-of-kingship", rarity: "rare", name: "왕의 시작", condition: "사무엘상과 사무엘하를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["사무엘상", "사무엘하"]) },
  { id: "tales-of-kings", rarity: "rare", name: "왕들의 이야기", condition: "열왕기상과 열왕기하를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["열왕기상", "열왕기하"]) },
  { id: "returned-people", rarity: "rare", name: "돌아온 백성", condition: "에스라와 느헤미야를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["에스라", "느헤미야"]) },
  { id: "my-song", rarity: "rare", name: "나의 노래", condition: "시편 150편을 모두 완독하세요", check: (ctx) => ctx.completedBooks.has("시편") },
  { id: "weeping-prophet", rarity: "rare", name: "눈물의 선지자", condition: "예레미야와 예레미야애가를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["예레미야", "예레미야애가"]) },
  { id: "without-ceasing", rarity: "rare", name: "쉬지 말고", condition: "데살로니가전서와 데살로니가후서를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["데살로니가전서", "데살로니가후서"]) },
  { id: "good-fight", rarity: "rare", name: "선한 싸움", condition: "디모데전서와 디모데후서를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["디모데전서", "디모데후서"]) },
  { id: "living-hope", rarity: "rare", name: "산 소망", condition: "베드로전서와 베드로후서를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["베드로전서", "베드로후서"]) },
  { id: "love-one-another", rarity: "rare", name: "서로 사랑하라", condition: "요한일서, 요한이서, 요한삼서를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["요한일서", "요한이서", "요한삼서"]) },
  { id: "from-the-beginning", rarity: "rare", name: "태초부터", condition: "모세오경 5권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.pentateuch) },
  { id: "fountain-of-wisdom", rarity: "rare", name: "지혜의 샘", condition: "시가서 5권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.wisdom) },
  { id: "four-witnesses", rarity: "rare", name: "복음의 네 증인", condition: "마태복음, 마가복음, 누가복음, 요한복음을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.gospels) },
  { id: "beginning-and-end", rarity: "rare", name: "시작과 끝", condition: "창세기와 요한계시록을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["창세기", "요한계시록"]) },
  { id: "law-and-gospel", rarity: "rare", name: "율법과 복음", condition: "신명기와 로마서를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["신명기", "로마서"]) },
  { id: "wisdom-trio", rarity: "rare", name: "지혜 삼총사", condition: "욥기, 잠언, 전도서를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["욥기", "잠언", "전도서"]) },
  { id: "early-morning", rarity: "rare", name: "이른 아침에", condition: "오전 6시 이전 통독을 10회 기록하세요", check: (ctx) => ctx.earlyMorningCount >= 10 },
  { id: "midnight-word", rarity: "rare", name: "한밤중의 말씀", condition: "자정 이후 통독을 10회 기록하세요", check: (ctx) => ctx.midnightCount >= 10 },
  { id: "prodigal-returned", rarity: "rare", name: "돌아온 탕자", condition: "연속 통독이 끊긴 후에 다시 통독을 시작하세요", check: (ctx) => ctx.hasReturnedAfterBreak },
  { id: "its-today", rarity: "rare", name: "오늘이야!", condition: "당일의 날짜와 같은 숫자의 장을 읽으세요", check: (ctx) => ctx.hasTodayDateMatch },

  // ── 영웅 ─────────────────────────────────────────────────────────
  { id: "through-the-seasons", rarity: "epic", name: "계절을 지나", condition: "90일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 90 },
  { id: "hundred-days-of-the-word", rarity: "epic", name: "백일의 말씀", condition: "100일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 100 },
  { id: "five-hundred-chapters", rarity: "epic", name: "오백 장을 지나", condition: "성경 500장을 읽으세요", check: (ctx) => ctx.totalRead >= 500 },
  { id: "thousand-chapters", rarity: "epic", name: "천 장의 말씀", condition: "성경 1,000장을 읽으세요", check: (ctx) => ctx.totalRead >= 1000 },
  { id: "through-the-promised-land", rarity: "epic", name: "약속의 땅을 지나", condition: "구약 역사서 12권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.historicalOT) },
  { id: "voice-of-the-prophets", rarity: "epic", name: "선지자의 목소리", condition: "대선지서 5권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.majorProphets) },
  { id: "twelve-voices", rarity: "epic", name: "열두 목소리", condition: "소선지서 12권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.minorProphets) },
  { id: "to-the-churches", rarity: "epic", name: "교회들에게", condition: "바울서신 13권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.pauline) },
  { id: "to-the-scattered", rarity: "epic", name: "흩어진 성도들에게", condition: "공동서신을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.generalEpistles) },
  { id: "kings-and-kingdom", rarity: "epic", name: "왕과 왕국", condition: "사무엘상, 사무엘하, 열왕기상, 열왕기하를 모두 완독하세요", check: (ctx) => allBooksDone(ctx, ["사무엘상", "사무엘하", "열왕기상", "열왕기하"]) },
  { id: "old-covenant-journey", rarity: "epic", name: "옛 언약의 여정", condition: "구약 39권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.oldTestamentAll) },
  { id: "new-covenant-begins", rarity: "epic", name: "새 언약의 시작", condition: "신약 27권을 모두 완독하세요", check: (ctx) => allBooksDone(ctx, window.BOOK_GROUPS.newTestamentAll) },
  { id: "end-in-sight", rarity: "epic", name: "끝이 보인다", condition: "성경 전체의 90% 이상을 완독하세요", check: (ctx) => ctx.overallPercent >= 90 },
  { id: "sabbath-word", rarity: "epic", name: "안식일의 말씀", condition: "10주 연속으로 매주 일요일에 통독 기록을 남기세요", check: (ctx) => ctx.sundayStreak >= 10 },
  { id: "long-journey", rarity: "epic", name: "긴 여정", condition: "하루에 25장 이상 통독하세요", check: (ctx) => ctx.maxChaptersInOneDay >= 25 },
  { id: "new-promise", rarity: "epic", name: "새로운 약속", condition: "말라기 4장과 마태복음 1장을 같은 날에 통독하세요", check: (ctx) => ctx.hasMalachi4AndMatthew1SameDay },

  // ── 전설 ─────────────────────────────────────────────────────────
  { id: "year-with-the-word", rarity: "legendary", name: "한 해를 말씀과 함께", condition: "365일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 365 },
  { id: "finished", rarity: "legendary", name: "완주!", condition: "성경 66권을 모두 완독하세요", check: (ctx) => ctx.cycles >= 1 },
  { id: "second-time", rarity: "legendary", name: "다시 처음부터", condition: "성경 전체를 2회 완독하세요", check: (ctx) => ctx.cycles >= 2 },
  { id: "third-journey", rarity: "legendary", name: "삼 세 판", condition: "성경 전체를 3회 완독하세요", check: (ctx) => ctx.cycles >= 3 },
  { id: "as-in-the-beginning", rarity: "legendary", name: "처음과 같이", condition: "성경 전체를 5회 완독하세요", check: (ctx) => ctx.cycles >= 5 },
  { id: "word-became-life", rarity: "legendary", name: "말씀이 삶이 되어", condition: "성경 전체를 10회 완독하세요", check: (ctx) => ctx.cycles >= 10 },
  { id: "dwelling-in-the-word", rarity: "legendary", name: "말씀에 거하다", condition: "누적 통독 일수 1,000일을 달성하세요", check: (ctx) => ctx.cumulativeDaysRead >= 1000 },
  { id: "thousand-days-together", rarity: "legendary", name: "천 일의 동행", condition: "1,000일 연속 통독하세요", check: (ctx) => ctx.longestStreak >= 1000 },
];
