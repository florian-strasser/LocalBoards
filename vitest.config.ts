import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "test/**/*.test.ts"],
    // Integration tests (real MySQL) and e2e tests (full server build) run via
    // their own configs — npm run test:integration / test:e2e. Keep the default
    // `npm test` fast and dependency-free.
    exclude: [
      ...configDefaults.exclude,
      "**/*.integration.test.ts",
      "**/*.e2e.test.ts",
    ],
  },
});
