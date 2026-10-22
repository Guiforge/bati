/** Alegreya for a name, Noto (`body`) for a title carrying a digit ("Level 5", "Your 12 words"). */
export const headingFont = (text: string) => (/\d/.test(text) ? "body" : "heading");
