const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withTextLayoutEpsilonFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const filePath = path.join(
        config.modRequest.projectRoot,
        "node_modules/react-native/ReactCommon/react/renderer/textlayoutmanager/platform/ios/react/renderer/textlayoutmanager/RCTTextLayoutManager.mm"
      );

      if (!fs.existsSync(filePath)) {
        throw new Error(`RCTTextLayoutManager.mm not found:\n${filePath}`);
      }

      let content = fs.readFileSync(filePath, "utf8");

      // Prevent double patching
      if (content.includes("CGFloat epsilon = 0.001")) {
        return config;
      }

      const regex =
        /size\s*=\s*\(CGSize\)\s*\{\s*ceil\(\s*size\.width\s*\*\s*layoutContext\.pointScaleFactor\s*\)\s*\/\s*layoutContext\.pointScaleFactor\s*,\s*ceil\(\s*size\.height\s*\*\s*layoutContext\.pointScaleFactor\s*\)\s*\/\s*layoutContext\.pointScaleFactor\s*\};/m;

      const replacement = `
CGFloat epsilon = 0.001;
size = (CGSize){
  ceil((size.width + epsilon) * layoutContext.pointScaleFactor) / layoutContext.pointScaleFactor,
  ceil((size.height + epsilon) * layoutContext.pointScaleFactor) / layoutContext.pointScaleFactor
};`;

      if (!regex.test(content)) {
        throw new Error(
          "Expected size rounding code not found in RCTTextLayoutManager.mm"
        );
      }

      content = content.replace(regex, replacement);
      fs.writeFileSync(filePath, content);

      return config;
    },
  ]);
};
