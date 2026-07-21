const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// MUI + Emotion ship mixed ESM/CJS entrypoints; package exports break Metro web.
config.resolver.unstable_enablePackageExports = false;
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

module.exports = withNativeWind(config, { input: './global.css' });
