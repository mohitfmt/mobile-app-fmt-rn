const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withAndroidXMedia(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const override = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.media:media:1.7.0'
        }
    }
}
`;

    if (!contents.includes("androidx.media:media:1.7.0")) {
      contents += "\n" + override + "\n";
    }

    config.modResults.contents = contents;
    return config;
  });
};
