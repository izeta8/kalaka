/** Lowercase, without accents: "Oñati" and "onati" match. */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}
