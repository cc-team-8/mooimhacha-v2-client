import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 각 테스트 후 DOM 정리 (테스트 간 격리)
afterEach(() => {
  cleanup();
});
