// Capas fixas do mosaico da tela inicial.
// Ficam gravadas no site para aparecerem instantaneamente, sem esperar o painel.
export const LANDING_POSTERS: { title: string; poster: string }[] = [
  { title: "Soulm8te", poster: "https://image.tmdb.org/t/p/w500/bNErActDctl6cdUGw9pnjSCmyhQ.jpg" },
  {
    title: "Férias do Barulho",
    poster: "https://image.tmdb.org/t/p/w500/6WojSQEpmAuwiLXI6CF2wV7jlku.jpg",
  },
  {
    title: "Pesadelo no Ártico",
    poster: "https://image.tmdb.org/t/p/w500/1WhIvnionH8yQuck8UPN8Na2U1h.jpg",
  },
  { title: "Aparências", poster: "https://image.tmdb.org/t/p/w500/h6X6SVIp88LLV5TJQPX3d0FT2hQ.jpg" },
  {
    title: "A Última Cena",
    poster: "https://image.tmdb.org/t/p/w500/3kyCh5CX6RDusHBttNJ3rWXZ62p.jpg",
  },
  {
    title: "Scooby-Doo Encontra Batman",
    poster: "https://image.tmdb.org/t/p/w500/fdMNFblD5ClaM1O8CQopVxvW66o.jpg",
  },
  { title: "Insanidade", poster: "https://image.tmdb.org/t/p/w500/dB5E8C0hKcEmAGsG2dtVm2OtW4M.jpg" },
  {
    title: "Desejo e Obsessão",
    poster: "https://image.tmdb.org/t/p/w500/1ueRwN2XWx1ko6h85njsIN8qg8q.jpg",
  },
  { title: "Enigma", poster: "https://image.tmdb.org/t/p/w500/e8Bx05ElCUIrWcMrJ7wYgjEkFpg.jpg" },
  { title: "Assassina", poster: "https://image.tmdb.org/t/p/w500/lo6LzCjllup6sXW82kS2nwIbo1w.jpg" },
  { title: "O Advogado", poster: "https://image.tmdb.org/t/p/w500/hv6YQM8cUVbk7VOYIRvSe9Afses.jpg" },
  {
    title: "O Impostor",
    poster: "https://image.tmdb.org/t/p/w500/aVCwMrChFdNLuCsWijtiSuni4H3.jpg",
  },
];

/** Troca o tamanho da capa do TMDB (w500 -> w185 etc.) para economizar dados no celular. */
export function posterSize(url: string, size: "w92" | "w185" | "w342" | "w500"): string {
  return url.replace(/\/t\/p\/w\d+\//, `/t/p/${size}/`);
}
