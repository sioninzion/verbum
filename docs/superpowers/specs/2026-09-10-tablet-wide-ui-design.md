# 태블릿·와이드 & 폴더블 커버 화면 UI — 설계 문서

작성일: 2026-09-10 (10장 추가: 2026-09-11)
대상: `styles.css`, `index.html`, `app.js` (정적 PWA)

## 목표

두 방향의 화면을 새로 대응한다:
1. **넓은 화면** (1~9장) — 아이패드 가로/세로, 폴더블 펼친 화면(Z Fold 내부, iPhone Duo 내부).
   화면을 제대로 활용하는 멀티컬럼 / 2-pane 레이아웃
2. **폴더블 커버 화면** (10장) — 폴더블을 접었을 때의 좁은 커버 화면 전용, "이어서 읽기"로
   진입하는 한 절씩 읽기 모드

폰(일반) 레이아웃은 그대로 두고, 새 브레이크포인트 안에서만 재배치한다.

## 대상 기기 & 화면 (참고)

CSS 폭은 물리 해상도 ÷ 추정 DPR — iPhone Duo는 미출시(2026-10-23)라 논리 해상도(pt) 미공개, DPR 3 가정 추정치.

| 기기 / 화면 | 물리 해상도 | 종횡비 (가로:세로) | 대략 CSS 폭×높이 | 대응 |
|---|---|---|---|---|
| Flip 커버 | 948×1048 | ~1:1.1 | ~380×420 | ❌ 대상 아님 (위젯 환경) |
| Flip / 일반 폰 펼침 | 1080×2520 | 1:2.33 | ~360×840 | 기존 폰 레이아웃 (작업 없음) |
| Fold 커버 | 1248×1972 | 1:1.58 | ~344–384 | 폰 레이아웃 — **344px 회귀 검증** |
| **Fold 펼침** | 2448×1848 (4:3) | ~1:1.32 | **~706–885 × ~940–1100** | 🎯 와이드 |
| iPhone Duo 커버 | 1398×2034 | 1:1.45 | ~466×678 | 폰 single-column 레이아웃 |
| **iPhone Duo 펼침** | 1878×2670 | 1:1.42 | **~626 × ~890** | 🎯 와이드 |
| iPad 세로 | 1640×2360 | ~1:1.44 | ~820×1180 | 🎯 와이드 |
| iPad 가로 | — | ~1.44:1 | ~1180×820 | 🎯 와이드 |

핵심 문제: 폴더블 펼친 화면은 **거의 정사각(가로:세로 ~1:1.3~1.45)** 인데 CSS 폭이 626~885로
768 아래에 걸치는 경우가 많다. 순수 `min-width: 768px` 트리거로는 놓친다 → 아래 1.3 참고.

## 비목표 (범위 밖)

- 퀴즈 화면(`quiz-panel`) — 집중 태스크라 폭 확장 안 함, 중앙 유지
- 로그인/회원가입(`login-card`, `gateSocialProfileForm` 등) — 중앙 카드 유지
- 뉴모피즘 → 레퍼런스 전면 리디자인(`docs`/플랜 별건) — 이 작업은 현 토큰 위에 그리드만 추가
- 좌측 네비게이션 레일 — **명시적으로 채택 안 함**
- 데스크톱 전용 최적화 — 와이드 규칙이 데스크톱에도 그대로 적용되면 그걸로 충분

## 핵심 결정 사항 (확정)

| 항목 | 결정 |
|---|---|
| 브레이크포인트 | 와이드 트리거 = `(min-width: 768px), (min-width: 620px) and (min-height: 720px)` (1.3 참고). 폴더블 펼침도 포함, 폰 가로는 높이 조건으로 제외 |
| 하단 탭바 (`.mobile-tabbar`) | **모든 폭에서** 표시. 위치·크기 폰과 동일 (sticky bottom center, 6칸) |
| 상단 가로탭 (`.view-tabs`) | **완전 제거** (마크업 + CSS + JS). 네비게이션은 하단 탭바 하나로 통일 |
| 좌측 레일 | 안 씀 |
| 세로 잠금 오버레이 | 폰 가로(`max-height: 500px`)에서만 동작. 태블릿·폴더블 펼침은 가로/세로 자유 |
| 콘텐츠 폭 | 여백은 적당히, 화면을 넉넉히 채우는 쪽. `app-shell` 최대 ~1200px |
| 성경 (와이드) | 2-pane 마스터·디테일 (좌: 책+장 / 우: 본문·퀴즈) |
| 내 정보 (와이드) | 정보 블록 3열 |
| 홈·칭호·빌보드 (와이드) | 아래 안대로 (구현자 재량 범위였음) |
| 폴더블 커버 (접힘) | "이어서 읽기" 진입 시 한 절씩 읽기 전체화면. 우 2/3 탭·왼쪽 스와이프=다음, 좌 1/3 탭·오른쪽 스와이프=이전. 마지막 절에 문제 풀기 버튼. Flip 커버 제외 (10장) |

---

## 1. 공통 셸 & 네비게이션

### 1.1 상단 가로탭 제거

- `index.html`: `.view-tabs` 마크업 삭제 (현재 위치 확인 필요 — `renderView()`가 `elements.viewTabs = document.querySelectorAll("[data-view-tab]")`로 잡음. **주의: 하단 탭바 버튼도 `data-view-tab`을 씀** → 셀렉터가 두 곳을 다 잡고 있음)
- `app.js`:
  - `elements.viewTabs` 셀렉터를 `.mobile-tabbar [data-view-tab]` 으로 좁힌다 (이제 하단 탭바만 대상)
  - `renderView()` 안의 `elements.viewTabs.forEach(... button.classList.toggle("active" ...))` 는 그대로 유지 — 하단 탭바의 active 표시에 쓰임
  - line ~2422 `elements.viewTabs.forEach(... addEventListener("click", () => setView(...)))` 도 그대로 — 하단 탭바 클릭 핸들러로 계속 동작
- `styles.css`: `.view-tabs`, `.view-tabs button`, `.view-tabs button:hover`, `.view-tabs button.active`, `@media (max-width: 760px) { .view-tabs { display: none } }` 관련 규칙 삭제

### 1.2 셸 폭 & 탭바

와이드 모드:

```
.app-shell        width: min(1200px, calc(100% - 48px));  margin: 0 auto;
                  padding-top 은 현행 var(--app-shell-pad-top) 유지
.mobile-tabbar    display: 로 노출 (현재 base 는 display:none, @max-width:760 에서만 grid)
                  → base 를 grid 로 올리거나, min-width:768 에서 다시 grid 선언
                  폭: max-width 로 폰과 동일하게 (예: min(520px, calc(100% - 32px))) 중앙 정렬
                  position: sticky; bottom: 10px; 유지
```

현재 `@media (max-width: 420px)`의 9:16 고정 프레임(`.app-shell`, `.login-card`)은 **폰 전용 그대로** — 와이드 모드와 겹치지 않음.

### 1.3 브레이크포인트 정의

**와이드 트리거** (CSS + JS 공용, 한 곳에 상수로):

```
(min-width: 768px), (min-width: 620px) and (min-height: 720px)
```

- 1절 `min-width: 768px` — iPad(양방향), 데스크톱, Fold 펼침 중 넓게 잡히는 모델
- 2절 `min-width: 620px and min-height: 720px` — "크고 거의 정사각인 캔버스". Fold 펼침(~706×940+), iPhone Duo 펼침(~626×890)을 잡는다. `min-height` 조건이 **폰 가로**(높이 ~390)를 자동 제외 — 폰 가로는 어차피 세로잠금 오버레이가 덮지만 이중 안전장치
- 놓치는 것(의도됨): Fold 커버·Duo 커버(폭 <620) → 폰 레이아웃 유지
- iPhone Duo CSS 폭이 실제로 620 미만으로 나오면 2절 `min-width`를 하향 조정 (출시 후 실측)

**JS 쪽**: `const WIDE_MQ = window.matchMedia("(min-width: 768px), (min-width: 620px) and (min-height: 720px)")`.
`WIDE_MQ.matches` 로 분기, `WIDE_MQ.addEventListener("change", ...)` 로 **폴드 접었다 펼 때 / 회전 시 즉시 재렌더**. 이 리스너는 성경 pane뿐 아니라 **모든 와이드 JS 분기**(있다면)를 다시 태워야 함. CSS만으로 되는 레이아웃(홈·내정보·칭호·빌보드 그리드)은 자동.

**모바일 브레이크포인트 정리**: 현재 `@media (max-width: 760px)` → `max-width: 767px` 로 확장해 768과 딱 붙임. 620–767px 구간은 (와이드 2절 조건 만족 시) 와이드, 아니면 모바일.

---

## 2. 성경 — 2-pane 마스터·디테일

### 2.1 현재 구조

- 4개 패널이 전부 `data-view-panel="quiz"` + `data-quiz-step` 로 구분:
  `library-panel`(books) → `chapter-panel`(chapters) → `reading-panel`(reading) → `quiz-panel`(quiz)
- `renderQuizStep()` 이 `state.quizStep` 과 일치하는 하나에만 `.step-active` 부여 (한 번에 하나만 보임)
- 흐름: 책 선택 → 장 선택 → 본문 읽기 → "문제 풀기" → 퀴즈

### 2.2 와이드 모드 레이아웃

```
┌───────────────────────────────────────────────────┐
│  좌 pane (300px)          │  우 pane (나머지)        │
│  ┌─────────────────────┐  │  ┌──────────────────┐   │
│  │ library-panel       │  │  │ reading-panel     │   │
│  │  (검색·구약/신약·     │  │  │  또는 quiz-panel  │   │
│  │   book-grid)         │  │  │  (문제 풀기 시 교체)│   │
│  ├─────────────────────┤  │  │                  │   │
│  │ chapter-panel       │  │  │  본문 칼럼은       │   │
│  │  (선택된 책의         │  │  │  max-width ~640,  │   │
│  │   chapter-grid)      │  │  │  pane 안에서 중앙  │   │
│  └─────────────────────┘  │  └──────────────────┘   │
└───────────────────────────────────────────────────┘
              (하단 중앙 탭바)
```

- **좌 pane**: `library-panel` + `chapter-panel` 을 세로로 쌓아 **동시 표시**. 자체 스크롤.
  - `library-panel` 의 `panel-heading`("성경 66권·1189장")은 유지, 크기 축소
  - `chapter-panel` 의 `back-button`(장→책 뒤로)과 `reading-panel`/`quiz-panel`의 `back-button` 은 와이드에서 **숨김** (전환이 아니라 항상 보이므로 불필요)
- **우 pane**: `reading-panel` 기본, `state.quizStep === "quiz"` 면 `quiz-panel` 로 교체
- 책 미선택 상태: 우 pane 에 비어있는 안내("왼쪽에서 장을 선택하세요") — `chapter-panel` 도 "책을 먼저 선택하세요" 빈 상태

### 2.3 렌더링 로직 변경 (`app.js`)

- `renderQuizStep()`: 와이드 여부를 `WIDE_MQ.matches` (1.3의 공용 matchMedia)로 판정
  - **와이드**: `library-panel` 과 `chapter-panel` 은 항상 `.step-active`. `reading-panel` 은 `quizStep !== "quiz"` 일 때, `quiz-panel` 은 `quizStep === "quiz"` 일 때 `.step-active`
  - **폰(현행)**: 지금처럼 `state.quizStep` 하나만 `.step-active` (변경 없음)
- `data-view="quiz"` 일 때만 2-pane 그리드 적용 (다른 뷰는 단일 컬럼)
- `WIDE_MQ.addEventListener("change", ...)` → 브레이크포인트를 넘나들 때(폴드 접었다 펴기, 회전 포함) `renderQuizStep()` + 필요 시 `render()` 재호출
- 책/장 클릭 핸들러는 그대로 `state.selectedBook` / `state.currentChapter` + `state.quizStep` 갱신 → `renderQuizStep()` 호출. 와이드에선 좌 pane 은 안 사라지고 우 pane 만 바뀜

### 2.4 좁은 와이드 (620–900px — Fold/Duo 펼침, iPad 세로)

- 좌 pane 폭 240px 로 축소
- 좌 pane 접기 버튼(우 pane 헤더 또는 좌 pane 상단에 토글) — 접으면 우 pane 전체폭
- `≥ 900px` 는 항상 2-pane 고정, 접기 버튼 없음
- iPhone Duo 펼침(~626px)은 좌 240 + 우 ~370이라 우 pane이 빠듯 → **접기 버튼이 기본 접힘 상태로** 시작하는 것도 고려 (구현 시 실측)
- (사용자 확인: "일단 ok, 경과를 봐" — 구현 후 실기기에서 조정)

### 2.5 퀴즈 단계

- 우 pane 안에서 `quiz-panel` 이 `reading-panel` 을 대체 (전체폭 아님, 우 pane 폭 유지)
- 좌 pane 은 계속 보임 → 퀴즈 중에도 다른 장으로 이동 가능

---

## 3. 내 정보 — 3열

### 3.1 현재

- `.dashboard[data-view="profile"]` : `grid-template-columns: minmax(520px, 980px)` (단일 컬럼)
- `profile-panel` 내부에 카드들이 세로로: 계정 카드, 프로필 폼(닉네임·하루목표·공유), 대표 칭호 선택, 알림 카드(`notification-card`), 테마 토글, 위험 구역(`danger-zone-card`)

### 3.2 와이드 모드

```
┌──────────────────────────────────────────────┐
│ ┌────────┐  ┌────────┐  ┌────────┐            │
│ │ 계정    │  │ 프로필  │  │ 알림    │            │
│ ├────────┤  ├────────┤  ├────────┤            │
│ │ 대표칭호│  │ 테마    │  │ 위험구역│            │
│ └────────┘  └────────┘  └────────┘            │
└──────────────────────────────────────────────┘
```

- `.dashboard[data-view="profile"]` 폭을 `min(1200px, calc(100% - 48px))` 로 확장
- `index.html`: `profile-panel` 안의 카드들을 3개 `<div class="profile-col">` 래퍼로 묶는다 (계정+대표칭호 / 프로필폼+테마 / 알림+위험구역 — 실제 배분은 구현 시 높이 보고 조정)
- `styles.css`:
  - 폰(`max-width: 767px`): `.profile-col { display: contents; }` → 래퍼가 사라져 현행 세로 스택 그대로 (픽셀 변화 0)
  - 와이드(`min-width: 768px`): `profile-panel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }` — `.profile-col` 이 각 컬럼
- `.dashboard[data-view="profile"]` 폭을 `min(1200px, calc(100% - 48px))` 로 확장
- 한 화면에 다 보이는 걸 목표로 하되, 세로 태블릿에서 넘치면 스크롤 허용 (하드 제약 아님)

---

## 4. 홈 (구현자 재량 → 아래 확정)

### 4.1 현재

- `.dashboard[data-view="home"]` : `minmax(420px, 640px)`
- `home-hero`(다음 통독 카드 + 우측 텍스트), `daily-verse`(오늘의 말씀), `home-stats-grid`(1.3fr/1fr, 2×2: 전체 진행률·연속 기록·하루 목표·공유 순위), 주간 스트립(`week-strip`, 탭하면 캘린더)

### 4.2 와이드 모드

```
┌────────────────────────────────────────────────┐
│ ┌──────────────────────┐  ┌──────────────────┐  │
│ │ home-hero            │  │ week-strip        │  │
│ │  다음 통독 [읽기 →]   │  │  일 월 화 …       │  │
│ └──────────────────────┘  └──────────────────┘  │
│ ┌────────────────────────────────────────────┐  │
│ │ daily-verse (오늘의 말씀, 풀폭)              │  │
│ └────────────────────────────────────────────┘  │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│ │전체% │ │연속  │ │하루  │ │순위  │  1×4         │
│ └──────┘ └──────┘ └──────┘ └──────┘            │
└────────────────────────────────────────────────┘
```

- `.dashboard[data-view="home"]` 폭 `min(1040px, calc(100% - 48px))`
- 상단: `home-hero` 와 `week-strip` 을 2컬럼(예: `1.4fr 1fr`)으로 나란히
- `daily-verse` 풀폭
- `home-stats-grid` → `grid-template-columns: repeat(4, minmax(0, 1fr))` (2×2 → 1×4)

## 5. 칭호 (구현자 재량 → 아래 확정)

### 5.1 현재

- `.dashboard[data-view="achievements"]` : `minmax(440px, 720px)`
- `achievements-panel` : 카드 그리드(등급별 색상 뱃지, 잠금/해제)

### 5.2 와이드 모드

- `.dashboard[data-view="achievements"]` 폭 `min(1040px, calc(100% - 48px))`
- 카드 그리드 `repeat(3, minmax(0, 1fr))` (와이드에서만; 폰 현행 유지)
- 등급/획득 필터는 이번 범위에서 **추가하지 않음** (별도 요청 시). 3열 그리드만 적용

## 6. 빌보드 (구현자 재량 → 아래 확정)

### 6.1 현재

- `.dashboard[data-view="community"]` : `minmax(440px, 720px)`
- `community-panel` : 카운트다운, 리더보드(`leader-row` 리스트)

### 6.2 와이드 모드

- `.dashboard[data-view="community"]` 폭 `min(920px, calc(100% - 48px))`
- 리더보드는 **1열 유지** (순위 위→아래 스캔이 핵심)
- 넓어진 폭 덕에 `leader-row` 의 `leader-stats` 가 한 줄에 다 들어감 (`@media (max-width: 760px)` 의 `grid-column: 1 / -1` 강제 줄바꿈이 와이드엔 적용 안 됨 — base 규칙 그대로면 OK)
- 카운트다운 + 내 순위 요약을 리스트 헤더 옆에 배치 (여유 있으면)

---

## 7. 방향(orientation) 잠금

- `styles.css` `@media (orientation: landscape) and (pointer: coarse)` 블록에 **`and (max-height: 500px)`** 추가
  → 폰(가로, 높이 ~375–430)만 "세로로 돌려주세요" 오버레이. 태블릿·Fold 펼침 가로(높이 700+)는 해제
  → `max-width` 가 아니라 `max-height` 로 판별하는 이유: 요즘 폰 가로 CSS 폭이 844~932라 `max-width: 767` 로는 못 거른다. 높이는 폰(가로) ~400 vs 태블릿(가로) 700+ 로 확실히 갈림 — 1.3의 `min-height: 720` 와 같은 논리
- `.rotate-overlay` 마크업/그 외 로직 변경 없음
- `manifest.json` 의 `"orientation": "portrait"` 는 그대로 (iOS/브라우저에서 무효라 영향 없음)

---

## 8. 위험 요소 / 주의

1. **`data-view-tab` 셀렉터 공유**: 상단 가로탭과 하단 탭바 버튼이 같은 속성을 씀. 상단탭 마크업만 지우면 `elements.viewTabs` 가 자동으로 하단탭만 가리키게 되어 `renderView()`/클릭 핸들러가 그대로 동작. **삭제 전 상단탭 마크업에 `data-view-tab` 이 실제로 붙어있는지 확인** (index.html 해당 라인 grep)
2. **`WIDE_MQ` 공용**: 와이드 판정 matchMedia는 **한 곳에 상수**로 만들고 CSS 미디어쿼리 문자열과 **글자 그대로 일치**시킬 것. `renderQuizStep()` 등 JS 분기는 `WIDE_MQ.matches`, 전환 대응은 `WIDE_MQ.addEventListener("change", ...)` 하나로
3. **좌 pane 스크롤 독립**: `.app-shell` 이 이미 자체 스크롤 컨테이너. 2-pane 은 그 안에서 `display: grid` + 각 pane `overflow-y: auto` + 높이 제한(`height: calc(100dvh - 헤더 - 탭바)` 또는 `max-height`) 필요. 계산값 검증 필수
4. **캐시 무효화**: `styles.css`/`app.js` 쿼리스트링 + `service-worker.js` `CACHE_VERSION` 항상 함께 올림
5. **회귀**: 폰(≤767px 그리고 620–767px 중 와이드 2절 조건 미충족)에서 픽셀 변화 0 이어야 함
6. **`@media (max-width: 1260px)` 의 quiz 컬럼 규칙**: 와이드 2-pane 도입 시 재검토 (지금은 단일 컬럼 폭만 조정)
7. **폴더블 전환**: 폰↔펼침을 앱 켠 채로 하면 `WIDE_MQ` change 로 레이아웃 즉시 스왑돼야 함. 성경 2-pane 뿐 아니라 홈/내정보/칭호/빌보드(CSS 자동)도 확인
8. **iPhone Duo 추정치**: 대상 기기 표의 CSS 폭은 미출시 기기 추정. 출시(10-23) 후 실측해 1.3의 `620` 임계값 재조정 가능성 열어둠
9. **Fold/Duo 커버 회귀**: 좁은 커버 화면(~344px)에서 안 깨지는지 — `chapter-grid` `repeat(5,1fr)`, `book-grid`, 로그인 카드 등 320~384px 구간 확인

---

## 9. 테스트

로컬 `python -m http.server` + 헤드리스 크롬으로:

- 폰 폭(390, 414) + 좁은 커버(344, 360) — 스크린샷 회귀: 변화 없음 + 안 깨짐
- Fold 펼침(720×940, 880×1100 상당) — 좁은 좌 pane + 접기, 내 정보 3열
- iPhone Duo 펼침(626×890 상당) — 와이드 트리거 걸리는지, 좌 pane 기본 접힘 여부
- 폰 가로(844×390 상당) — 와이드 트리거 **안** 걸리는지(높이 720 미만) + 세로 오버레이
- iPad 세로(820×1180) / 가로(1180×820) — 성경 2-pane, 세로 오버레이 안 뜸, 각 화면 폭/여백
- 데스크톱(1440) — `app-shell` 최대폭 캡, 여백
- 각 뷰(home/stats/성경/community/achievements/profile) DOM 덤프로 `.view-active` / `.step-active` 상태 검증
- `WIDE_MQ` 브레이크포인트 넘나들 때(폭·높이 양쪽) 성경 pane + 각 뷰 레이아웃 갱신 (수동/스크립트)

주의: 헤드리스 크롬은 `pointer: coarse` 를 실제로 못 만들어서 세로 오버레이의 태블릿 해제는 코드 리뷰로만 확인, 실기기 최종 검증 필요.

---

## 10. 폴더블 커버 화면 — 한 절씩 읽기 모드

와이드(1~9)와 **반대 방향** — 폴더블을 **접었을 때의 좁은 커버 화면** 전용. 규칙은 완전히 분리.

### 10.1 언제 (감지)

```
@media (max-width: 430px) and (min-aspect-ratio: 3/5) and (max-aspect-ratio: 4/5)
```

- Fold 커버(폭 ~344–384, 종횡비 w/h ~0.63)를 잡는다
- `min-aspect-ratio: 3/5`(0.6) — 일반 폰(~0.46) 제외
- `max-aspect-ratio: 4/5`(0.8) — Flip 커버(~0.9, 거의 정사각) 제외 (사용자 결정: Flip 제외)
- JS 공용 상수 `COVER_MQ` (CSS 문자열과 **글자 그대로 일치**). `COVER_MQ.matches` 로 분기, `COVER_MQ.addEventListener("change", ...)` 로 폴드 여닫을 때 대응

**⚠️ 리스크**: Fold 커버의 실제 종횡비는 모델마다 다름 (구형 Fold 5~7 커버는 ~0.43 으로 일반 폰과 겹침 / Fold 8 커버는 ~0.63 로 추정). **실기기에서 `matchMedia` 값 찍어보고 상·하한 튜닝 필수.** 미디어쿼리로 신뢰성 있게 안 갈리면 → 대안: 내 정보에 "커버 화면 한 절씩 읽기" 수동 토글 추가 (이번 범위엔 안 넣고, 실측 후 결정).

### 10.2 진입 & 점유 (사용자 결정 반영)

- **홈의 기존 "이어서 읽기"(다음 미완독 장) 버튼**으로 들어올 때만 이 모드 (`COVER_MQ.matches` && 그 버튼 클릭)
- 성경 탭 → 책 → 장 → 본문은 **기존 `reading-panel` 그대로** (이 모드 아님)
- 전체화면 오버레이 — 하단 탭바·상단 크롬 없음. `data-view-panel` 아님, 명령형으로 띄우는 별도 오버레이

### 10.3 화면

```
┌─────────────────────┐
│ ‹      창세기 1장  3/31│  ← 얇은 상단 바: 나가기 · 장 · 현재/전체
│                     │
│                     │
│    태초에 하나님이    │  ← 현재 절 하나, 크게 중앙 정렬
│   천지를 창조하시니라 │
│                     │
│                     │
│ [좌 1/3]  [우 2/3]   │  ← 보이지 않는 탭 영역 (오버레이)
└─────────────────────┘
```

- **우 2/3 탭 = 다음 절**, **좌 1/3 탭 = 이전 절**. 카드 교체 + 슬라이드 전환(~180ms transform+opacity)
- **가로 스와이프도 지원** (사용자 결정): 왼쪽으로 밀기(finger R→L) = 다음, 오른쪽으로 밀기 = 이전. 임계값 ~40px. 탭 존과 공존
- 1절에서 이전(좌탭/오른쪽 스와이프) = 무반응 + 살짝 바운스
- 표제(`h` 필드, 시편 등)는 **1절 카드 위**에 작게
- 글씨 크기: 기존 `state.readingPrefs` 소/중/대/특대 재사용. 리더 안에는 크기 컨트롤 없음(일반 읽기 화면에서 설정). 커버 기본값 미설정 시 '대'

### 10.4 마지막 절 & 완료

- 마지막 절 카드: 절 텍스트 **아래에 `[문제 풀기]` 버튼** 표시. 우탭/왼쪽 스와이프(전진) = 무반응 (전진 동작 = 버튼)
- `[문제 풀기]` → 기존 퀴즈 플로우(`quiz-panel`, `state.quizStep = "quiz"`). 커버 화면에서 퀴즈 패널 렌더는 별도 확인(좁은 폭)
- 완료 처리는 **기존 그대로** — 퀴즈 정답 시 `state.progress.completed[id]` 기록. 절만 넘기는 것으로는 완료 안 됨(현행과 동일)

### 10.5 나가기 / 뒤로

- 상단 `‹` → `closeVerseReader()` → 진입 전 화면(홈)
- 진입 시 `history.pushState` → Android 하드웨어 뒤로 / 브라우저 뒤로가 리더를 닫도록 (`popstate` 처리)
- 세로잠금 오버레이는 이 화면에도 유효 (커버 가로로 눕히면 세로 유도 — `max-height: 500` 조건에 걸림)

### 10.6 구현

- `state.verseReader = { chapterId, verses: [], index: 0, open: false }`
- `openVerseReader(chapterId)` — `loadChapterVerses(code, chapter)` 재사용해 절 배열 로드 → `index: 0` → 렌더
- `renderVerseReaderVerse()` — 현재 절 + (index===0이면 표제) + (마지막이면 문제 풀기 버튼) + 카운터
- `verseReaderNext()` / `verseReaderPrev()` — index 증감 + 경계 처리 + 전환 애니메이션
- 탭 존: 오버레이에 좌(33%)·우(67%) 자식 div, click 핸들러. 스와이프: touchstart/touchend X델타
- `closeVerseReader()` — 오버레이 숨김, state 초기화
- `COVER_MQ.matches` 아니면 `openVerseReader` 자체를 호출 안 함 (홈 버튼 핸들러에서 분기). 열려 있는데 `COVER_MQ` 가 false 로 바뀌면(펼침) → 닫고 일반 `reading-panel` 로

### 10.7 마크업 (`index.html`)

- `#verseReader` 오버레이 하나 추가 (`hidden` 기본). 상단 바 + 절 표시 영역 + 좌/우 탭 존 + (동적) 문제 풀기 버튼
- 폰(비커버)에서는 절대 안 보임

### 10.8 테스트

- Fold 커버 상당(360×~570, 종횡비 ~0.63) — `COVER_MQ` true, 홈 "이어서 읽기" → 리더 진입, 좌/우 탭·스와이프, 마지막 절 버튼, 퀴즈 연결
- 일반 폰(390×844) — `COVER_MQ` false, "이어서 읽기" → 기존 `reading-panel` (회귀)
- Flip 커버 상당(360×400, 종횡비 ~0.9) — `COVER_MQ` false
- 리더 열린 상태에서 폭 변경(펼침 시뮬) → 리더 닫히고 일반 읽기로
- 뒤로가기(popstate)로 리더 닫힘
- 표제 있는 장(시편) 1절 카드에 표제 표시
