import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/local-fn";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDetails, getSeasonEpisodes, getStreamUrl } from "@/lib/catalog.functions";
import { getProgressFor, saveProgress } from "@/lib/library.functions";
import { fetchIntroTimes } from "@/lib/intro";

import { AppShell } from "@/components/AppShell";
import { VideoPlayer, type Reaction } from "@/components/VideoPlayer";
import { useRequireProfile } from "@/hooks/useRequireProfile";

type Search = { t?: number; e?: number };

const detailsQuery = (tipo: "movie" | "tv", id: number) =>
  queryOptions({
    queryKey: ["catalog", "details", tipo, id],
    queryFn: () => getDetails({ data: { type: tipo, id } }),
    staleTime: 10 * 60_000,
  });

export const Route = createFileRoute("/_authenticated/assistir/$tipo/$id")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const t = Number(search["t"]);
    const e = Number(search["e"]);
    const out: Search = {};
    if (Number.isFinite(t) && t > 0) out.t = t;
    if (Number.isFinite(e) && e > 0) out.e = e;
    return out;
  },
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(
      detailsQuery(params.tipo === "tv" ? "tv" : "movie", Number(params.id)),
    );
  },
  head: () => ({
    meta: [
      { title: "Assistir — FluxoPrime" },
      {
        name: "description",
        content: "Player do FluxoPrime: assista o filme, a série ou o episódio escolhido.",
      },
      { property: "og:title", content: "Assistir — FluxoPrime" },
      { property: "og:description", content: "Player integrado com progresso salvo." },
    ],
  }),
  component: WatchPage,
  pendingComponent: WatchPending,
  errorComponent: ({ error }) => (
    <AppShell chrome="close">
      <p className="px-6 py-20 text-center text-sm" role="alert">
        {error.message}
      </p>
    </AppShell>
  ),
});

function WatchPending() {
  return (
    <AppShell chrome="close">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-8">
        <div className="h-4 w-40 animate-pulse rounded-full bg-surface-2" />
        <div className="mt-4 h-7 w-2/3 animate-pulse rounded-full bg-surface-2" />
        <div className="mt-5 grid aspect-video w-full place-items-center rounded-2xl border border-border bg-black">
          <div className="flex flex-col items-center gap-3">
            <span
              aria-hidden
              className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary"
            />
            <p className="text-sm text-foreground/60">Abrindo o player…</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}


function WatchPage() {
  const params = Route.useParams();
  const tipo = params.tipo === "tv" ? "tv" : "movie";
  const id = Number(params.id);
  const { t, e } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(detailsQuery(tipo, id));
  const { profile } = useRequireProfile();

  const season = tipo === "tv" ? (t ?? data.seasons[0]?.season_number ?? 1) : null;
  const episode = tipo === "tv" ? (e ?? 1) : null;

  const resolveStream = useServerFn(getStreamUrl);
  const stream = useQuery({
    queryKey: ["stream", tipo, id, season, episode],
    queryFn: () => resolveStream({ data: { type: tipo, id, season, episode } }),
    staleTime: 30 * 60_000,
  });

  const fetchEpisodes = useServerFn(getSeasonEpisodes);
  const episodes = useQuery({
    queryKey: ["catalog", "season", id, season],
    queryFn: () => fetchEpisodes({ data: { id, season: season ?? 1 } }),
    enabled: tipo === "tv",
  });

  const currentEp = (episodes.data ?? []).find((x) => x.episode_number === episode);

  // ---- Timestamps exatos de abertura (AniSkip via Jikan) -------------------
  // Funciona para anime. Para outros conteúdos, retorna null e o player usa
  // a heurística melhorada. A query não bloqueia o player: só enriquece.
  const introTimes = useQuery({
    queryKey: ["intro-times", id, season, episode],
    queryFn: () =>
      fetchIntroTimes(
        data.title,
        episode ?? 1,
        currentEp?.runtime ? currentEp.runtime * 60 : undefined,
      ),
    enabled: tipo === "tv" && !!episode,
    staleTime: 7 * 24 * 60 * 60_000, // 7 dias — raramente muda
    retry: false,                      // falhas silenciosas; não repetir em loop
    gcTime: 30 * 60_000,
  });

  const persist = useServerFn(saveProgress);
  const readProgress = useServerFn(getProgressFor);
  const playback = useRef({ position: 0, duration: 0 });

  const saved = useQuery({
    queryKey: ["progress-item", profile?.id, tipo, id],
    queryFn: () => readProgress({ data: { profileId: profile!.id, tmdbId: id, mediaType: tipo } }),
    enabled: !!profile,
    staleTime: 60_000,
  });

  // Só retoma se o progresso salvo é do mesmo episódio que está abrindo.
  const resumeAt =
    saved.data &&
    (tipo === "movie" ||
      ((saved.data.season ?? 1) === (season ?? 1) && (saved.data.episode ?? 1) === (episode ?? 1)))
      ? Math.max(0, saved.data.position_seconds - 5)
      : 0;

  useEffect(() => {
    playback.current = { position: 0, duration: 0 };
  }, [id, season, episode]);

  const store = useCallback(
    (position: number, duration: number) => {
      if (!profile) return;
      if (!Number.isFinite(position) || position < 5) return;
      const safeDuration =
        Number.isFinite(duration) && duration > 0 ? duration : tipo === "movie" ? 6600 : 2700;
      void persist({
        data: {
          profileId: profile.id,
          item: {
            tmdb_id: id,
            media_type: tipo,
            title: data.title,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
          },
          season,
          episode,
          position_seconds: Math.round(position),
          duration_seconds: Math.round(safeDuration),
        },
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ["progress", profile.id] }))
        .catch(() => undefined);
    },
    [
      profile,
      id,
      tipo,
      season,
      episode,
      data.title,
      data.poster_path,
      data.backdrop_path,
      persist,
      queryClient,
    ],
  );

  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const { position, duration } = playback.current;
      storeRef.current(position, duration);
    }, 15_000);
    return () => {
      window.clearInterval(timer);
      const { position, duration } = playback.current;
      storeRef.current(position, duration);
    };
  }, [id, season, episode]);

  const nextEp = (episodes.data ?? []).find((x) => x.episode_number === (episode ?? 0) + 1) ?? null;

  const reactionKey = `fluxoprime:reaction:${profile?.id ?? "anon"}:${tipo}:${id}`;
  const [reaction, setReaction] = useState<Reaction>(null);
  useEffect(() => {
    try {
      setReaction((localStorage.getItem(reactionKey) as Reaction) ?? null);
    } catch {
      setReaction(null);
    }
  }, [reactionKey]);

  const applyReaction = (value: Reaction) => {
    setReaction(value);
    try {
      if (value) localStorage.setItem(reactionKey, value);
      else localStorage.removeItem(reactionKey);
    } catch {
      // armazenamento indisponível (modo privado) — apenas ignora
    }
  };

  const goBack = () => {
    void navigate({ to: "/titulo/$tipo/$id", params: { tipo, id: String(id) } });
  };

  if (stream.isLoading || saved.isLoading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <span
            aria-hidden
            className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-primary"
          />
          <p className="text-sm text-foreground/70">Preparando o vídeo…</p>
        </div>
      </div>
    );
  }

  if (stream.isError || !stream.data) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center gap-4 bg-black px-6 text-center">
        <div>
          <p role="alert" className="text-sm">
            Não foi possível carregar este título no momento.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => void stream.refetch()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={goBack}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VideoPlayer
      key={`${stream.data.url}-${resumeAt}`}
      src={stream.data.url}
      kind={stream.data.kind}
      poster={data.backdrop_path ?? data.poster_path}
      title={data.title}
      subtitle={
        tipo === "tv"
          ? `T${season}:E${episode}${currentEp?.name ? ` "${currentEp.name}"` : ""}`
          : null
      }
      startAt={resumeAt}
      onTime={(position, duration) => {
        playback.current = { position, duration };
      }}
      onFlush={(position, duration) => store(position, duration)}
      onClose={goBack}
      seasons={tipo === "tv" ? data.seasons : []}
      currentSeason={season}
      episodes={episodes.data ?? []}
      currentEpisode={episode}
      onSeasonChange={(value) =>
        void navigate({
          to: "/assistir/$tipo/$id",
          params: { tipo, id: String(id) },
          search: { t: value, e: 1 },
        })
      }
      onSelectEpisode={(s, e2) =>
        void navigate({
          to: "/assistir/$tipo/$id",
          params: { tipo, id: String(id) },
          search: { t: s, e: e2 },
        })
      }
      nextEpisode={nextEp}
      onNextEpisode={
        nextEp
          ? () =>
              void navigate({
                to: "/assistir/$tipo/$id",
                params: { tipo, id: String(id) },
                search: { t: season ?? 1, e: nextEp.episode_number },
              })
          : undefined
      }
      reaction={reaction}
      onReaction={applyReaction}
      intro={introTimes.data ?? undefined}
    />
  );
}
