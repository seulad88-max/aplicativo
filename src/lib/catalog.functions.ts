import { API_BASE } from "./config";
import type { MediaType, MediaItem, Row, Season, Episode } from "./media-types";

export type { MediaType, MediaItem, Row, Season, Episode } from "./media-types";

type Arg<T> = { data: T } | undefined;

export type CastMember = { name: string; character: string; profile_path: string | null };

export type Details = MediaItem & {
  tagline: string;
  runtime: number | null;
  number_of_seasons: number | null;
  genres: string[];
  cast: CastMember[];
  seasons: Season[];
  similar: MediaItem[];
  episode_runtime?: number | null;
  tmdb_id?: number | null;
};

export type StreamInfo = { url: string; ext: string; title: string; kind: "file" | "embed" };

// Cache em memória + localStorage: mantém a abertura instantânea que o app tinha.
const TTL = 2 * 60 * 60 * 1000;
const STORE_PREFIX = "fluxoprime:api:";
const memory = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function storeRead<T>(key: string): { at: number; value: T } | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: unknown; value?: unknown };
    if (typeof parsed.at !== "number") return null;
    return { at: parsed.at, value: parsed.value as T };
  } catch {
    return null;
  }
}

function storeWrite(key: string, value: unknown) {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = JSON.stringify({ at: Date.now(), value });
    if (raw.length > 1_500_000) return;
    localStorage.setItem(STORE_PREFIX + key, raw);
  } catch {
    // cota cheia: o cache persistente é só um bônus
  }
}

async function request<T>(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  // Sem limite de tempo, uma resposta travada do provedor deixava a tela
  // "carregando" por dezenas de segundos. 9s é o teto.
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9_000),
    });
  } catch {
    throw new Error(
      "Não foi possível falar com o servidor do FluxoPrime. Verifique sua internet e tente de novo.",
    );
  }
  if (!res.ok) {
    let message =
      res.status >= 500
        ? "O servidor de conteúdo está indisponível no momento. Tente novamente em alguns minutos."
        : `Não foi possível carregar o conteúdo (erro ${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // resposta sem JSON
    }
    throw new Error(message);
  }
  return (await res.json()) as T;

}

async function cachedRequest<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  opts: { persist?: boolean } = {},
): Promise<T> {
  const key = `${path}?${JSON.stringify(params)}`;
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const refresh = () => {
    const p = request<T>(path, params)
      .then((value) => {
        memory.set(key, { at: Date.now(), value });
        if (opts.persist) storeWrite(key, value);
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p as Promise<unknown>);
    return p;
  };

  const stored = opts.persist && !hit ? storeRead<T>(key) : null;
  if (stored) {
    memory.set(key, stored);
    // Mostra o que já está salvo na hora e atualiza em segundo plano.
    if (Date.now() - stored.at >= TTL) void refresh().catch(() => {});
    return stored.value;
  }

  // Se a rede/provedor falhar, prefere conteúdo salvo (mesmo vencido) a erro.
  return refresh().catch((error: unknown) => {
    const fallback = hit ?? (opts.persist ? storeRead<T>(key) : null);
    if (fallback) return fallback.value as T;
    throw error;
  });
}

export const getHome = async (_?: unknown) =>
  cachedRequest<{ hero: MediaItem | null; rows: Row[] }>("/api/public/home", {}, { persist: true });

export const getCatalog = async (args: Arg<{ type: MediaType; genre?: number }>) =>
  cachedRequest<{ hero: MediaItem | null; genres: { id: number; name: string }[]; rows: Row[] }>(
    "/api/public/catalog",
    { type: args!.data.type, genre: args!.data.genre },
    { persist: true },
  );

export const searchTitles = async (args: Arg<{ query: string }>) =>
  cachedRequest<MediaItem[]>("/api/public/search", { q: args!.data.query });

export const getDetails = async (args: Arg<{ type: MediaType; id: number }>) =>
  cachedRequest<Details>(
    "/api/public/details",
    { type: args!.data.type, id: args!.data.id },
    { persist: true },
  );

export const getSeasonEpisodes = async (args: Arg<{ id: number; season: number }>) =>
  cachedRequest<Episode[]>(
    "/api/public/season",
    { id: args!.data.id, season: args!.data.season },
    { persist: true },
  );

export const getStreamUrl = async (
  args: Arg<{ type: MediaType; id: number; season?: number | null; episode?: number | null }>,
) =>
  request<StreamInfo>("/api/public/stream", {
    type: args!.data.type,
    id: args!.data.id,
    season: args!.data.season ?? undefined,
    episode: args!.data.episode ?? undefined,
  });
