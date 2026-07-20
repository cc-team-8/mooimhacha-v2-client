# CLAUDE.md — 무임하차 클라이언트

팀플 협업 보조 웹 애플리케이션 (React SPA).

---

## 1. 기술 스택

| 라이브러리             | 버전 | 역할                          |
| ---------------------- | ---- | ----------------------------- |
| React                  | 18.3 | UI 렌더링                     |
| TypeScript             | 5.4  | 타입 안전성 (strict 모드)     |
| Vite                   | 5.4  | 번들러, 개발 서버 (포트 3000) |
| React Router           | 7.6  | 클라이언트 라우팅             |
| Zustand                | 5.0  | 전역 상태 관리                |
| PostCSS + Autoprefixer | -    | CSS 후처리                    |

UI 라이브러리 없음. **Plain CSS + CSS 커스텀 프로퍼티(변수)** 로 스타일링.  
아이콘은 **Tabler Icons** (`ti ti-*` 클래스).

---

## 2. 프로젝트 구조

```
src/
├── main.tsx              앱 진입점. BrowserRouter + global.css import
├── App.tsx               최상위 라우터
├── styles/
│   ├── global.css        CSS 변수(토큰), 리셋, 공통 컴포넌트 스타일
│   ├── login.css         로그인 페이지 전용
│   ├── onboarding.css    온보딩 페이지 전용
│   ├── home.css          홈 페이지 전용
│   └── dashboard.css     대시보드 + 서브페이지 전용
├── components/
│   ├── Card.tsx          카드 공통 컴포넌트
│   └── Modal.tsx         모달 공통 컴포넌트
├── pages/
│   ├── login/
│   │   └── LoginPage.tsx
│   ├── onboarding/
│   │   └── OnboardingPage.tsx
│   ├── home/
│   │   └── HomePage.tsx
│   └── dashboard/
│       ├── DashboardPage.tsx   사이드바 + 중첩 라우터 셸
│       ├── overview/OverviewPage.tsx
│       ├── meeting/MeetingPage.tsx
│       ├── tasks/TasksPage.tsx
│       └── report/ReportPage.tsx
├── stores/
│   └── themeStore.ts
├── hooks/
│   └── useToast.ts
├── lib/                  (비어있음)
└── types/                (비어있음)
```

---

## 3. 라우팅

```
/               → LoginPage
/onboarding     → OnboardingPage
/home           → HomePage
/dashboard/*    → DashboardPage (중첩 라우터)
  /dashboard/overview
  /dashboard/meeting
  /dashboard/tasks
  /dashboard/report
```

`App.tsx`에서 catch-all `*` → `/` 리다이렉트.

---

## 4. CSS 규칙

**global.css만** `main.tsx`에서 import. 페이지 전용 CSS는 **해당 페이지 컴포넌트 상단**에서 import.

```tsx
// LoginPage.tsx
import "@/styles/login.css";

// DashboardPage.tsx (서브페이지 포함 전체 커버)
import "@/styles/dashboard.css";
```

CSS 변수 예시 (`global.css` 정의):

```css
var(--green)        /* 주 강조색 */
var(--surface)      /* 배경 */
var(--surface-2)    /* 카드/패널 배경 */
var(--surface-3)    /* hover 배경 */
var(--text-main)    /* 본문 텍스트 */
var(--text-soft)    /* 보조 텍스트 */
var(--border-2)     /* 구분선 */
```

다크모드: `document.documentElement.dataset.theme = "dark"` 로 전환 (`themeStore` 참고).

---

## 5. 컴포넌트 패턴

### import 순서

```tsx
import { useState, useRef } from "react"; // 1. React
import { useNavigate } from "react-router-dom"; // 2. 외부 라이브러리
import Card from "@/components/Card"; // 3. 내부 컴포넌트 (@/ 절대경로)
import { useThemeStore } from "@/stores/themeStore"; // 4. 스토어/훅
import "@/styles/home.css"; // 5. CSS (페이지 컴포넌트만)
```

### Props 타입 — `interface` 사용

```tsx
// Good
interface CardProps {
  icon: string;
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}

export default function Card({ icon, title, extra, children }: CardProps) { ... }
```

### Export 방식

- 컴포넌트, 페이지: `export default function`
- 훅: `export function useXxx`
- 스토어: `export const useXxxStore`

---

## 6. 공통 컴포넌트

### Card (`src/components/Card.tsx`)

카드 헤더(`card-head`) 패턴을 추상화. `.card` wrapper + `.card-head` 포함.

```tsx
<Card
  icon="ti ti-checklist"
  title="내 태스크"
  titleSuffix={<span className="live-dot" />} // 타이틀 옆 요소 (선택)
  extra={<span className="badge b-green">3</span>} // 우측 영역 (선택)
  style={{ marginBottom: 14 }}
>
  {/* 카드 내용 */}
</Card>
```

### Modal (`src/components/Modal.tsx`)

배경 클릭 시 닫힘 처리 포함.

```tsx
<Modal
  title="태스크 추가"
  onClose={() => setOpen(false)}
  actions={
    <button className="btn btn-primary" onClick={handleSave}>
      저장
    </button>
  }
>
  <div className="modal-sub">
    <label className="field">...</label>
  </div>
</Modal>
```

---

## 7. 상태 관리

### Zustand 스토어 패턴 (`src/stores/themeStore.ts`)

```ts
import { create } from "zustand";

interface ThemeStore {
  theme: "light" | "dark";
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  toggle: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      return { theme: next };
    }),
}));
```

- 파일명: `src/stores/xxxStore.ts`
- export명: `useXxxStore`
- 타입은 반드시 `interface`로 정의 후 `create<Interface>()` 에 전달

### useToast (`src/hooks/useToast.ts`)

DOM을 직접 조작하는 명령형 훅. `App.tsx` 의 `#toast` 엘리먼트를 대상으로 함.

```ts
const { showToast } = useToast();
showToast("저장됐어요");
```

---

## 8. 절대 하면 안 되는 것

- **Tailwind 클래스 사용 금지** — 설치는 됐으나 이 프로젝트에서 사용하지 않음
- **인라인 `modal-bg` / `card-head` JSX 직접 작성 금지** — `Modal`, `Card` 컴포넌트 사용
- **페이지 CSS를 `main.tsx`에 import 금지** — 각 페이지 컴포넌트에서 직접 import
- **`global.css`에 페이지 전용 클래스 추가 금지** — 해당 페이지의 CSS 파일에 추가
- **스타일에 하드코딩된 색상 금지** — `var(--green)` 등 CSS 변수 사용

---

## 9. 새 페이지 추가 체크리스트

- [ ] `src/pages/xxx/XxxPage.tsx` 생성
- [ ] `src/styles/xxx.css` 생성, 페이지 컴포넌트 상단에서 import
- [ ] `App.tsx` 또는 `DashboardPage.tsx` 에 Route 추가
- [ ] 공통 레이아웃이 필요하면 `Card` / `Modal` 컴포넌트 활용
- [ ] 전역 상태가 필요하면 `src/stores/` 에 Zustand 스토어 추가
