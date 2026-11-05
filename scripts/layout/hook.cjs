// Lets node load the app's modules outside Metro: image requires become a number, native packages a do-nothing proxy.
// Used by scripts/layout/chemins.ts.
const Module = require("node:module");
for (const ext of [".webp", ".png", ".jpg", ".ogg", ".mp3", ".ttf"]) require.extensions[ext] = (m) => { m.exports = 1; };
const vide = () => new Proxy(function () {}, { get: (_, k) => (k === "__esModule" ? true : vide()), apply: () => vide(), construct: () => vide() });
const charge = Module._load;
Module._load = function (request, ...reste) {
  if (/^(react-native|expo|@expo|react-native-|@react-native|@shopify|@tamagui|tamagui|@legendapp)/.test(request)) return vide();
  return charge.call(this, request, ...reste);
};
