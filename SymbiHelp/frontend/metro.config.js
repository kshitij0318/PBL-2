// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable hot reloading
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.transformer.enablePackageExports = true;
config.transformer.allowOptionalDependencies = true;

// Improve development experience
config.watchFolders = [__dirname];
config.maxWorkers = 4;

// Enable Fast Refresh
config.transformer.fastRefresh = true;

module.exports = config; 