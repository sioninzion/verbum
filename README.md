# 성경통독 퀴즈 웹앱

엑셀 파일의 66권 1,189장 퀴즈 데이터를 사용해 만든 정적 웹앱입니다. 각 장의 핵심내용을 읽고 퀴즈 정답을 맞히면 빨간 장 버튼이 초록색 완료 버튼으로 바뀝니다.

## 구성

- `index.html`: 앱 화면
- `styles.css`: 반응형 UI 스타일
- `app.js`: 진행도 저장, 권/장 선택, 퀴즈 채점 로직
- `data/bible-data.js`: 엑셀에서 변환된 1,189장 데이터
- `tools/export_bible_data.py`: 엑셀 수정 후 데이터를 다시 변환하는 스크립트

## 실행

`index.html`을 더블클릭해서 바로 열어도 됩니다. (예전 버전은 모듈 스크립트를 써서 `file://`로 열면 조용히 아무 반응이 없는 문제가 있었는데, Firebase를 일반 `<script>` 태그 방식(compat SDK)으로 바꾸면서 더블클릭만으로도 정상 동작하도록 고쳤습니다.)

로컬 서버로 열고 싶다면(선택 사항):

- Windows에서는 `run-local.bat`을 더블클릭하면 서버가 뜨고 브라우저가 자동으로 열립니다.
- 또는 이 폴더에서 터미널로 직접 실행:

```powershell
python -m http.server 8000
```

그 후 `http://localhost:8000/index.html`로 접속하세요.

GitHub Pages에는 이 폴더 전체를 올리고 Pages 소스를 루트로 지정하면 바로 배포할 수 있습니다. 배포한 뒤에는 Firebase Console → Authentication → Settings → 승인된 도메인에 배포 주소(예: `username.github.io`)를 반드시 추가해야 로그인/회원가입이 그 주소에서도 동작합니다.

## Firebase 로그인/공유 기능

현재 버전은 Firebase Auth와 Firestore에 연결되어 있습니다.

- 화면에서는 아이디로 가입/로그인합니다.
- 내부 Firebase Auth 이메일은 `아이디@jybible.local` 형태로 자동 변환됩니다.
- 프로필, 하루 목표, 통독 진행도, 공유 순위 데이터는 Firestore `users/{uid}` 문서에 저장됩니다.
- 전화번호는 SMS 인증 없이 저장되며, Firestore `phoneNumbers/{phoneKey}` 예약 문서로 같은 번호의 중복 가입을 막습니다. 이 중복 방지는 `firestore.rules` 배포 후 적용됩니다.

Firebase Console에서 Email/Password 로그인을 활성화하고, Firestore Rules에는 `firestore.rules` 내용을 적용하세요.
