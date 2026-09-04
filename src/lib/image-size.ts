/**
 * Ajusta o tamanho das imagens do TMDB para o que a tela realmente usa.
 * Baixar w342 em vez de w500/original corta muitos MB na home do celular.
 */
export function tmdbSize(
  url: string,
  size: "w92" | "w185" | "w342" | "w500" | "w780" | "w1280",
): string {
  if (!url.includes("image.tmdb.org")) return url;
  return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
}
