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
    // e2e/ holds Playwright specs: they run with `yarn test:e2e`, not vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
