const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

function setGradleProp(props, key, value) {
  const idx = props.findIndex((item) => item.type === 'property' && item.key === key);
  if (idx >= 0) {
    props[idx].value = value;
  } else {
    props.push({ type: 'property', key, value });
  }
}

module.exports = function withReleaseSigning(config) {
  config = withGradleProperties(config, (mod) => {
    setGradleProp(mod.modResults, 'org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    setGradleProp(mod.modResults, 'reactNativeArchitectures', 'arm64-v8a,armeabi-v7a');
    setGradleProp(mod.modResults, 'expo.useLegacyPackaging', 'true');
    setGradleProp(mod.modResults, 'android.enableMinifyInReleaseBuilds', 'false');
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let src = mod.modResults.contents;

    const signingSetup = `
// ── Signature & versionnage CI Let's Play ───────────────────────────────────
def lpKeystorePath = System.getenv('ANDROID_KEYSTORE_FILE')
def lpKeystorePass = System.getenv('ANDROID_KEYSTORE_PASSWORD')
def lpKeystoreAlias = System.getenv('ANDROID_KEY_ALIAS') ?: 'letsplay'
def lpFallbackProps = rootProject.file('../../android/keystore/signing.properties')
def lpFallbackStore = rootProject.file('../../android/keystore/letsplay-release.p12')
if (lpKeystorePath == null && lpFallbackStore.exists() && lpFallbackProps.exists()) {
    def props = new Properties()
    lpFallbackProps.withInputStream { props.load(it) }
    lpKeystorePath = lpFallbackStore.absolutePath
    lpKeystorePass = props.getProperty('storePassword')
    lpKeystoreAlias = props.getProperty('keyAlias') ?: 'letsplay'
}
def lpVersionCodeEnv = System.getenv('ANDROID_VERSION_CODE')
def lpVersionNameEnv = System.getenv('ANDROID_VERSION_NAME')
`;

    if (!src.includes('lpKeystorePath')) {
      src = src.replace(/\nandroid\s*\{/, `\n${signingSetup}\nandroid {`);
    }

    src = src.replace(
      /versionCode\s+1\s*\n\s*versionName\s+"[^"]*"/,
      `versionCode lpVersionCodeEnv != null && lpVersionCodeEnv.isInteger() ? lpVersionCodeEnv.toInteger() : 1\n        versionName lpVersionNameEnv != null && !lpVersionNameEnv.isEmpty() ? lpVersionNameEnv : "1.0.0"`
    );

    src = src.replace(
      /signingConfigs\s*\{\s*debug\s*\{([\s\S]*?)\}\s*\}/,
      `signingConfigs {
        debug {$1}
        release {
            if (lpKeystorePath != null) {
                storeFile file(lpKeystorePath)
                storePassword lpKeystorePass
                keyAlias lpKeystoreAlias
                keyPassword lpKeystorePass
                storeType 'PKCS12'
            }
        }
    }`
    );

    src = src.replace(
      /release\s*\{\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
      `release {
            signingConfig lpKeystorePath != null ? signingConfigs.release : signingConfigs.debug`
    );

    mod.modResults.contents = src;
    return mod;
  });

  return config;
};
