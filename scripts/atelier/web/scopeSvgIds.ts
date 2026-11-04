// react-native-svg resolves an id inside its own Svg on Android; a browser resolves it in the whole
// document, so each ground tile's clip `pave` read the first tile's shape and the square lost its
// paving. Every id is prefixed by its own svg, and the references with it, before the next paint.
let suivant = 0;

function scoper(svg: SVGSVGElement) {
  // expo-image's tint filters are unique already, and referenced from outside their svg.
  const ids = [...svg.querySelectorAll("[id]")].filter(
    (e) => !e.id.startsWith("sv") && !e.id.startsWith("expo-image-tint"),
  );
  if (ids.length === 0) return;
  svg.dataset.scope ??= `sv${suivant++}`;
  const prefixe = svg.dataset.scope;
  const noms = new Set(ids.map((e) => e.id));
  for (const e of ids) e.id = `${prefixe}-${e.id}`;
  for (const e of svg.querySelectorAll("*")) {
    for (const a of [...e.attributes]) {
      if (!a.value.includes("url(#")) continue;
      a.value = a.value.replace(/url\(#([^)]+)\)/g, (tout, id) =>
        noms.has(id) ? `url(#${prefixe}-${id})` : tout,
      );
    }
  }
}

export function scoperSvgIds() {
  const tout = () => {
    for (const svg of document.querySelectorAll("svg")) scoper(svg);
  };
  new MutationObserver(tout).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["id", "clip-path", "fill", "stroke", "mask"],
  });
  tout();
}
