/**
 * The Node harness: the app's data code against a real WebDAV server, no emulator.
 *
 *   node node_modules/jest/bin/jest.js --config test/node/jest.config.js
 *
 * The project's own jest config (preset, alias, transform) with three differences: it looks only under
 * test/node, it runs one test at a time (devices share servers), and it has no coverage and no thresholds.
 */
const base = require("../../package.json").jest;

module.exports = {
  ...base,
  rootDir: "../..",
  roots: ["<rootDir>/test/node"],
  testMatch: ["<rootDir>/test/node/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  collectCoverage: false,
  coverageThreshold: undefined,
  setupFilesAfterEnv: [
    ...(base.setupFilesAfterEnv ?? []),
    "<rootDir>/test/node/harness/useNodeFetch.ts",
  ],
  maxWorkers: 1,
  testTimeout: 300000,
};
