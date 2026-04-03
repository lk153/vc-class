/**
 * Translate a language name (e.g. "English") using the teacher translation
 * namespace, falling back to the raw name when no key exists.
 */
export function tLang(
  t: { has: (key: string) => boolean; (key: string): string },
  name: string,
): string {
  const key = `lang_${name}`;
  return t.has(key) ? t(key) : name;
}
