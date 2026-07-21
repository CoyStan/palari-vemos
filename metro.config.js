const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// MUI + Emotion ship mixed ESM/CJS entrypoints; package exports break Metro web.
config.resolver.unstable_enablePackageExports = false;
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Agent skill packs are not app source; watching them can crash Metro mid-install.
config.watchFolders = config.watchFolders?.filter(Boolean) ?? [];
config.resolver.blockList = [
  /(^|\/)\.agents\/.*/,
  /(^|\/)\.cursor\/.*/,
];

module.exports = withNativeWind(config, { input: './global.css' });
