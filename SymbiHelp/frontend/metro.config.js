// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const path = require('path');

// Enable hot reloading
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.transformer.enablePackageExports = true;
config.transformer.allowOptionalDependencies = true;

// Improve development experience
config.watchFolders = [__dirname];
config.maxWorkers = 4;

// Enable Fast Refresh
config.transformer.fastRefresh = true;

// Add additional module resolution paths
config.resolver.nodeModulesPaths = [
  `${__dirname}/node_modules`,
  `${__dirname}/utils`,
  `${__dirname}/components`,
  `${__dirname}/screens`
];

// Map problematic deps to shims to avoid web bundling failures
config.resolver.extraNodeModules = Object.assign({}, config.resolver.extraNodeModules, {
  'generator-function': path.resolve(__dirname, 'shims/generator-function.js'),
});

// Hard alias via custom resolver (works even when extraNodeModules is bypassed)
const shimPath = path.resolve(__dirname, 'shims/generator-function.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'generator-function') {
    return { type: 'sourceFile', filePath: shimPath };
  }
  return resolve(context, moduleName, platform);
};

module.exports = config; 