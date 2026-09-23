# Verbum — 성경 통독 퀴즈 웹앱

성경 66권 1,189장을 개역개정 본문으로 읽고, 장마다 퀴즈를 풀어 통독 진행도를 기록하는 PWA입니다. 빌드 과정 없이 바닐라 JS와 Firebase만으로 동작하는 정적 웹앱입니다.

## 주요 기능

- **본문 읽기**: 장별 개역개정 본문, 글자 크기/굵게 설정, 구절 단위로 넘겨보는 리더
- **구절 선택·복사**: 구절을 탭할 때마다 선택이 토글되어 떨어진 구절도 함께 고를 수 있고, 복사하면 `창세기 1:2-5,9` 같은 참조가 붙습니다
- **형광펜**: 선택한 구절에 4가지 색(핑크·노랑·초록·하늘)을 칠하고 지울 수 있습니다. 로그인 계정은 장별로 저장하고, 게스트는 화면에만 유지합니다
- **장별 퀴즈**: 정답을 맞히면 해당 장이 완료로 기록됩니다
- **진행도·연속 통독·하루 목표**, **칭호(업적)**, **공유 순위(빌보드)**
- **순간의 말씀**: 하루 중 무작위 시각에 말씀을 보내는 푸시 알림 (Cloud Functions + FCM)
- **로그인 없이 둘러보기**: 계정 없이 앱을 둘러볼 수 있는 게스트 모드. 서버에는 아무것도 저장하지 않습니다
- 다크 모드, 홈 화면에 설치(PWA), 오프라인 캐시(서비스 워커)

## 구성

- `index.html` / `styles.css` / `app.js`: 화면, 스타일, 앱 로직 전체(진행도 저장, 로그인, 읽기, 퀴즈, 알림 설정 등)
- `data/bible-data.js`: 66권 1,189장의 메타데이터와 퀴즈
- `data/bible-text/{책코드}/{장}.json`: 장별 개역개정 본문(읽을 때 필요한 장만 불러옴)
- `data/bible-search-index.json`: 본문검색(단어 검색)용 전체 구절 인덱스(책코드별 장·절·본문 한 파일), `tools/build_search_index.js`가 생성
- `data/achievements.js`: 칭호 목록과 달성 조건
- `data/verses.js`: 앱에서 무작위로 보여주는 "오늘의 말씀" 구절 목록
- `service-worker.js`, `manifest.json`: PWA 캐시·설치·푸시 수신
- `firestore.rules`: Firestore 보안 규칙
- `functions/`: Cloud Functions (순간의 말씀 일정 생성과 발송)
- `tools/`: 데이터 생성·검증 스크립트
  - `export_bible_data.py`: 엑셀의 퀴즈 데이터를 `data/bible-data.js`로 변환
  - `regenerate_bible_text.js`: 대한성서공회 개역개정 페이지에서 `data/bible-text`를 다시 생성
  - `build_search_index.js`: `data/bible-text`에서 `data/bible-search-index.json`을 만듦(본문이 바뀌면 다시 실행)
  - `verify_bible_text.js`: 본문 데이터를 대한성서공회 페이지와 대조해 장/절 수 차이를 찾음
  - `convert_bible_text.py`: 예전 방식(`개역개정-text/*.txt` 변환)

## 로컬 실행

본문을 `fetch`로 불러오므로 `index.html`을 더블클릭(`file://`)해서는 본문이 나오지 않습니다. 이 폴더에서 로컬 서버를 띄워 접속하세요.

```bash
python3 -m http.server 8000
```

그 후 `http://localhost:8000/index.html`로 접속합니다. Windows에서는 `run-local.bat`을 더블클릭해도 됩니다.

> 로컬 서버로 열어도 Firebase 설정은 배포본과 같아서 **실제 서비스의 Auth/Firestore에 연결됩니다.** 테스트할 때는 로그인 없이 둘러보기(게스트)를 쓰거나 실제 계정 데이터를 건드리지 않게 주의하세요.

## Firebase

- **Auth**: 이메일/비밀번호 로그인과 Google 로그인
- **Firestore**
  - `users/{uid}`: 프로필, 하루 목표, 통독 진행도, 공유 여부
  - `users/{uid}/highlights/{장 ID}`: 장별 형광펜 (`{ verses: { "절번호": "색" } }`)
  - `users/{uid}/notificationDevices/{기기 ID}`: 푸시 토큰
  - `notificationDailyPlans`, `yesterdaylog`: 순간의 말씀 일정. Cloud Functions만 접근하고 클라이언트는 접근할 수 없습니다
- **규칙 배포**: `firebase deploy --only firestore:rules`
- **함수 배포**: `firebase deploy --only functions`
- 복구를 위해 Firestore의 Point-in-time recovery(7일)를 켜두었습니다

## 배포

폴더 전체를 정적 호스팅에 올리면 됩니다. Firebase Console → Authentication → Settings → 승인된 도메인에 배포 주소를 추가해야 그 주소에서 로그인이 동작합니다.

`app.js`나 `styles.css`를 고칠 때는 `index.html`의 해당 파일 `?v=` 값을 함께 올려야 사용자가 새 버전을 받습니다.
