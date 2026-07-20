import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  toggle: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      // React 상태 변경과 별도로 DOM에 직접 적용.
      // global.css의 [data-theme="dark"] 셀렉터가 이 속성을 읽어 색상 변수를 교체함.
      document.documentElement.dataset.theme = next;
      return { theme: next };
    }),
}));
