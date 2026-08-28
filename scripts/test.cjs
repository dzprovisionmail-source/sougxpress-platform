const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const tests = [
  "tests/resolver-logic.test.ts",
  "tests/facebook-url.test.ts",
];

for (const test of tests) {
  const result = spawnSync(
    "pnpm",
    ["--dir", "apps/mobile", "exec", "tsx", test],
    { cwd: repoRoot, stdio: "inherit", shell: false },
  );

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
