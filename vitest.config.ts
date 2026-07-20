import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
  test: {
    root: __dirname,
    include: ["test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    testTimeout: 1000 * 29,
  },
});
