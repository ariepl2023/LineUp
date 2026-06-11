const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Clerk's native Google Sign-In pulls in AppCheckCore -> GoogleUtilities /
 * RecaptchaInterop, which do not define module maps. Building them as static
 * libraries fails unless modular headers are enabled. Adding
 * `use_modular_headers!` globally resolves the pod install error.
 */
module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          /prepare_react_native_project!/,
          'prepare_react_native_project!\n\nuse_modular_headers!'
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};
