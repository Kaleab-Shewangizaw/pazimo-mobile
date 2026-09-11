const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

/**
 * `socket.io-client` -> `engine.io-client` -> `@socket.io/component-emitter`.
 * The last package ships no `exports` map, and Metro's package-exports-aware
 * resolver mishandles its extension-inclusive `main` field ("./lib/cjs/index.js")
 * by re-appending platform suffixes onto it, producing paths like
 * `index.js.web.ts` that never exist — a documented Metro/socket.io-client
 * interaction, not anything specific to this app. Resolving it directly
 * sidesteps the broken field resolution instead of disabling package exports
 * project-wide (which several other dependencies rely on).
 */
const { resolveRequest: defaultResolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@socket.io/component-emitter') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(
        __dirname,
        'node_modules/@socket.io/component-emitter/lib/cjs/index.js',
      ),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
