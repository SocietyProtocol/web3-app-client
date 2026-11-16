import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    // e2e/ holds Playwright specs (*.spec.ts): they run with `yarn test:e2e`,
    // not vitest. Unit tests of the e2e support code (*.test.*, such as
    // e2e/support/backends/gateway) do run here.
    exclude: [
      ...configDefaults.exclude,
      "e2e/**/*.spec.*",
      "e2e/aa-stack/**",
      "e2e/.stack/**",
      "e2e/test-results/**",
      "e2e/playwright-report/**",
    ],
  },
});
