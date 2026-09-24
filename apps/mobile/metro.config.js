const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);
// This is a pnpm workspace; keep Metro's application root on the mobile app
// instead of allowing workspace discovery to resolve it to the repository root.
config.projectRoot = projectRoot;
// Expo's SDK 57 monorepo defaults also add the hoisted workspace
// node_modules directory to watchFolders. Web does not load source from the
// workspace root, so keep its watcher scope limited to the app. Native
// commands retain Expo's default workspace folders unchanged.
if (process.argv.includes("--web")) {
  config.watchFolders = [projectRoot];
}

// Expo's development root wrapper calls expo-keep-awake automatically. On
// runtimes that do not expose the native keep-awake module this rejects as an
// unhandled promise. The app has no screen that requires a wake lock, so use a
// local no-op only during development. Production builds continue to resolve
// the official Expo package.
if (process.env.NODE_ENV !== "production") {
  const keepAwakeShim = path.resolve(__dirname, "src/runtime/expo-keep-awake-shim.ts");
  const defaultResolveRequest = config.resolver?.resolveRequest;

  config.resolver = {
    ...config.resolver,
    extraNodeModules: {
      ...(config.resolver?.extraNodeModules || {}),
      "expo-keep-awake": keepAwakeShim,
    },
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === "expo-keep-awake") {
        return { type: "sourceFile", filePath: keepAwakeShim };
      }
      return defaultResolveRequest
        ? defaultResolveRequest(context, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform);
    },
  };
}

module.exports = config;
