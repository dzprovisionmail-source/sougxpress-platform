const path = require("path");
const config = require("../metro.config.js");
const resolved = config.resolver.resolveRequest(
  {
    resolveRequest: config.resolver.resolveRequest,
  },
  "expo-keep-awake",
  "android",
);
const expected = path.resolve(__dirname, "../src/runtime/expo-keep-awake-shim.ts");
if (!resolved || resolved.type !== "sourceFile" || resolved.filePath !== expected) {
  console.error(JSON.stringify({ resolved, expected }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ resolved, expected, pass: true }, null, 2));
