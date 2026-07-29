// Intl.DateTimeFormat construction is one of the most expensive calls on Hermes (locale
// data resolution). Constructing one inside a render body — worse, inside a recycled list
// row — costs scroll frames. Formatters are immutable, so cache them per language+options.
const formatters = new Map<string, Intl.DateTimeFormat>();

export function getDateTimeFormat(
  language: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${language}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, options);
    formatters.set(key, formatter);
  }
  return formatter;
}
