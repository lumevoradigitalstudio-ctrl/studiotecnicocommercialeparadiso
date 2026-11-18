const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.join(root, "packages")];
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules")];
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = {
  "@ritmo/core": path.join(root, "packages/core/src"),
  "@ritmo/ai": path.join(root, "packages/ai/src"),
  "@ritmo/nutrition": path.join(root, "packages/nutrition/src"),
};
module.exports = config;
