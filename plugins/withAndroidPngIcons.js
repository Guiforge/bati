const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Give Expo's launcher icons the extension of what they contain.
 *
 * Prebuild writes every `ic_launcher*` mipmap as PNG bytes under a `.webp` name, which Android
 * lint reports as `IconExtension`. Fifteen of those sat in `android-lint-baseline.xml`, and the
 * monochrome layer added five more that a baseline must never grow to absorb. Resources are looked
 * up by name (`@mipmap/ic_launcher`), so the extension changes nothing at runtime; aapt reads the
 * header either way. Only files whose bytes are PNG are renamed, so a prebuild that one day writes
 * real WebP is left alone.
 */
module.exports = function withAndroidPngIcons(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, "app", "src", "main", "res");
      for (const dir of fs.readdirSync(res).filter((d) => d.startsWith("mipmap-"))) {
        for (const file of fs.readdirSync(path.join(res, dir))) {
          if (!file.startsWith("ic_launcher") || !file.endsWith(".webp")) continue;
          const from = path.join(res, dir, file);
          const head = Buffer.alloc(4);
          const fd = fs.openSync(from, "r");
          fs.readSync(fd, head, 0, 4, 0);
          fs.closeSync(fd);
          if (head.equals(PNG_SIGNATURE)) fs.renameSync(from, from.replace(/\.webp$/, ".png"));
        }
      }
      return cfg;
    },
  ]);
};
