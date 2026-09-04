/**
 * Detecção automática de timestamp de abertura (skip intro).
 *
 * Estratégia:
 *  1. Busca o MAL ID da série pelo título usando a API Jikan (MyAnimeList) — grátis, sem chave.
 *  2. Com o MAL ID, consulta o AniSkip — grátis, sem chave — que retorna os segundos
 *     exatos em que a abertura começa e termina para cada episódio.
 *  3. Se alguma etapa falhar (conteúdo não-anime, rede offline, etc.) retorna null
 *     e o player usa a heurística melhorada como fallback.
 *
 * APIs usadas:
 *   • Jikan  — https://jikan.moe          (Sem autenticação)
 *   • AniSkip — https://aniskip.com       (Sem autenticação)
 */

export type IntroTimes = { start: number; end: number };

// Cache em memória para a sessão — evita bater na rede toda vez que o episódio
// reinicializa o componente.
const memCache = new Map<string, IntroTimes | null>();

/**
 * Retorna os segundos exatos de início e fim da abertura do episódio, ou null
 * se não for possível determinar (conteúdo não-anime, rede offline, etc.).
 *
 * @param title         Título da série (como vem do TMDB).
 * @param episodeNumber Número do episódio dentro da temporada.
 * @param episodeDuration Duração do episódio em segundos (ajuda o AniSkip a filtrar).
 */
export async function fetchIntroTimes(
  title: string,
  episodeNumber: number,
  episodeDuration?: number,
): Promise<IntroTimes | null> {
  const cacheKey = `${title}:::${episodeNumber}:::${episodeDuration ?? ""}`;
  if (memCache.has(cacheKey)) return memCache.get(cacheKey) ?? null;

  const result = await _doFetch(title, episodeNumber, episodeDuration);
  memCache.set(cacheKey, result);
  return result;
}

async function _doFetch(
  title: string,
  episodeNumber: number,
  episodeDuration?: number,
): Promise<IntroTimes | null> {
  try {
    // ------------------------------------------------------------------ //
    // Passo 1 — encontra o MAL ID pelo título usando o Jikan              //
    // ------------------------------------------------------------------ //
    const jikanUrl = new URL("https://api.jikan.moe/v4/anime");
    jikanUrl.searchParams.set("q", title);
    jikanUrl.searchParams.set("limit", "8");
    jikanUrl.searchParams.set("type", "tv");

    const jikanRes = await fetch(jikanUrl.toString(), {
      signal: AbortSignal.timeout(6_000),
    });
    if (!jikanRes.ok) return null;

    type JikanAnime = { mal_id: number; title: string; title_english: string | null };
    const jikanBody = (await jikanRes.json()) as { data?: JikanAnime[] };
    if (!jikanBody.data?.length) return null;

    // Escolhe o anime cujo título mais se parece com o da série.
    const titleLow = title.toLowerCase().trim();
    const candidates = jikanBody.data;

    const scored = candidates.map((a) => {
      const t1 = a.title.toLowerCase();
      const t2 = (a.title_english ?? "").toLowerCase();
      // Pontuação simples: quanto maior a sobreposição de palavras, melhor.
      let score = 0;
      if (t1 === titleLow || t2 === titleLow) score += 10;
      if (t1.includes(titleLow) || titleLow.includes(t1)) score += 5;
      if (t2.includes(titleLow) || titleLow.includes(t2)) score += 5;
      // Bônus para títulos que começam com as mesmas palavras
      const words = titleLow.split(/\s+/).slice(0, 3);
      words.forEach((w) => {
        if (t1.startsWith(w) || t2.startsWith(w)) score += 2;
      });
      return { ...a, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Se o melhor candidato tem score 0, provavelmente não é anime — desiste.
    if (!best || best.score === 0) return null;

    const malId = best.mal_id;

    // ------------------------------------------------------------------ //
    // Passo 2 — busca os timestamps exatos no AniSkip                     //
    // ------------------------------------------------------------------ //
    const aniskipUrl = new URL(
      `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}`,
    );
    // Pede somente a abertura (op = opening)
    aniskipUrl.searchParams.append("types[]", "op");
    if (episodeDuration && episodeDuration > 0) {
      aniskipUrl.searchParams.set(
        "episodeLength",
        String(Math.round(episodeDuration)),
      );
    }

    const aniskipRes = await fetch(aniskipUrl.toString(), {
      signal: AbortSignal.timeout(6_000),
    });
    if (!aniskipRes.ok) return null;

    type AniSkipResult = {
      found: boolean;
      results: {
        interval: { start_time: number; end_time: number };
        skip_type: string;
      }[];
    };
    const aniskipBody = (await aniskipRes.json()) as AniSkipResult;
    if (!aniskipBody.found || !aniskipBody.results?.length) return null;

    const op = aniskipBody.results.find((r) => r.skip_type === "op");
    if (!op) return null;

    const start = Math.floor(op.interval.start_time);
    const end = Math.ceil(op.interval.end_time);

    // Sanidade: a abertura deve ter pelo menos 30 s e no máximo 5 min.
    if (end - start < 30 || end - start > 300) return null;

    return { start, end };
  } catch {
    // Rede offline, timeout, parse error — silencia e usa heurística.
    return null;
  }
}
