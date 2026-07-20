# 무임하차 — 웹 클라이언트

팀플 협업 보조 웹 애플리케이션(React SPA). 회의 진행 중 안건·기여도를 실시간으로 보여주고, 태스크·회의록을 관리한다.

React 18 + TypeScript 5 + Vite 5 기반. 백엔드 API 서버는 별도 저장소에서 관리한다.

## 빠른 시작

```bash
npm install        # 최초 1회
npm run dev        # 개발 서버 (Vite, HMR, 포트 3000)
```

## 주요 명령

| 명령              | 용도                                                |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | 개발 서버 (Vite, HMR)                               |
| `npm run build`   | TypeScript 컴파일 → Vite 빌드 (`dist/`에 정적 산출) |
| `npm run preview` | 빌드 산출물 로컬 미리보기                           |
| `npm run test`    | Vitest 유닛 테스트                                  |

## 기술 스택

| 라이브러리                | 역할                          |
| ------------------------- | ----------------------------- |
| React 18 / React Router 7 | UI · 클라이언트 라우팅        |
| TypeScript 5 (strict)     | 타입 안전성                   |
| Vite 5                    | 번들러 · 개발 서버            |
| Zustand 5                 | 전역 상태 관리                |
| socket.io-client          | 서버와 실시간(WebSocket) 통신 |
| framer-motion             | 애니메이션                    |
| react-markdown            | 마크다운 렌더링               |

UI 라이브러리는 쓰지 않는다. **Plain CSS + CSS 커스텀 프로퍼티**로 스타일링하며, 아이콘은 Tabler Icons(`ti ti-*`)를 쓴다. (Tailwind는 설치돼 있으나 이 프로젝트에서는 사용하지 않는다.)

## 폴더 구조

```
├── index.html              메인 앱 진입 HTML
├── companion.html          회의 중 보조 창(별도 브라우저 창) 진입 HTML
├── src/
│   ├── main.tsx            앱 진입점 (BrowserRouter)
│   ├── App.tsx             최상위 라우터
│   ├── companion.tsx       보조 창 진입점
│   ├── pages/              페이지 (login, onboarding, home, dashboard, meeting …)
│   ├── components/         공용 컴포넌트 (Card, Modal 등)
│   ├── lib/                API 호출·WebSocket·STT 등 로직 계층
│   ├── hooks/              커스텀 훅
│   ├── stores/             Zustand 스토어
│   └── styles/             전역·페이지별 CSS
├── public/                 정적 자산
├── test/                   Vitest 테스트
├── vite.config.ts          멀티 페이지(index + companion) 빌드 설정
└── Dockerfile              정적 산출물(dist/) 빌드 전용 멀티스테이지
```

## 환경 변수

`.env` 파일에 백엔드 엔드포인트를 지정한다(`.env.sample` 참고). Vite는 `VITE_` 접두사가 붙은 값만 클라이언트 번들에 노출한다.

```bash
# 백엔드 API 서버 (미지정 시 기본값 http://localhost:3000)
VITE_API_BASE_URL=http://localhost:3000
# WebSocket 엔드포인트 (미지정 시 VITE_API_BASE_URL 사용)
VITE_WS_URL=ws://localhost:3000
```

> 실제 기능(로그인·회의·태스크 등)은 백엔드 API 서버가 함께 떠 있어야 동작한다. UI 개발·빌드는 서버 없이도 가능하다.

## 배포

`Dockerfile`은 정적 산출물(`dist/`)만 생성하는 빌드 전용 멀티스테이지 이미지다. 빌드타임에 `VITE_API_BASE_URL` / `VITE_WS_URL`을 주입하고, 산출된 `dist/`를 정적 서버(예: Caddy)로 서빙한다.
