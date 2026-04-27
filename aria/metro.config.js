const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// expo-sqlite ships .wasm for its web worker, but the file isn't bundled in
// the npm package. We're mobile-only, so return an empty module for any .wasm
// import so the web bundler doesn't crash during `expo start`.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.wasm')) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: './global.css',
  configPath: path.resolve(__dirname, 'tailwind.config.js'),
});
