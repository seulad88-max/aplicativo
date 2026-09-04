import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/local-fn";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Play, Plus, Star } from "lucide-react";
import { getDetails, getSeasonEpisodes } from "@/lib/catalog.functions";
import { listWatchlist, toggleWatchlist } from "@/lib/library.functions";
import { AppShell } from "@/components/AppShell";
import { MediaRow } from "@/components/MediaRow";
import { MediaCard } from "@/components/MediaCard";
import { useRequireProfile } from "@/hooks/useRequireProfile";
import { requestLandscapeFullscreen } from "@/lib/fullscreen";
import { pushTitle } from "@/lib/title-stack";

const detailsQuery = (tipo: "movie" | "tv", id: number) =>
  queryOptions({
    queryKey: ["tmdb", "details", tipo, id],
    queryFn: () => getDetails({ data: { type: tipo, id } }),
    staleTime: 10 * 60_000,
  });

export const Route = createFileRoute("/_authenticated/titulo/$tipo/$id")({
  loader: ({ context, params }) => {
    if (params.tipo !== "movie" && params.tipo !== "tv") throw notFound();
    context.queryClient.ensureQueryData(detailsQuery(params.tipo, Number(params.id)));
  },
  head: () => ({
    meta: [
      { title: "Detalhes do título — FluxoPrime" },
      {
        name: "description",
        content: "Sinopse, elenco, temporadas e episódios do título escolhido no FluxoPrime.",
      },
      { property: "og:title", content: "Detalhes do título — FluxoPrime" },
      { property: "og:description", content: "Tudo sobre o título antes de dar play." },
    ],
  }),
  component: DetailsPage,
  pendingComponent: DetailsPending,
  errorComponent: ({ error }) => (
    <AppShell chrome="close">
      <p className="px-6 py-20 text-center text-sm" role="alert">
        {error.message}
      </p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell chrome="close">
      <p className="px-6 py-20 text-center text-sm">Título não encontrado.</p>
    </AppShell>
  ),
});

function DetailsPending() {
  return (
    <AppShell chrome="close">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8">
        <div className="flex gap-4">
          <div className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-2xl bg-surface-2 sm:w-40" />
          <div className="min-w-0 flex-1 space-y-3 pt-2">
            <div className="h-6 w-3/4 animate-pulse rounded-full bg-surface-2" />
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-surface-2" />
            <div className="h-3 w-full animate-pulse rounded-full bg-surface-2" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-surface-2" />
            <div className="h-10 w-40 animate-pulse rounded-full bg-surface-2" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}



function DetailsPage() {
  const params = Route.useParams();
  const tipo = params.tipo as "movie" | "tv";
  const id = Number(params.id);
  const { data } = useSuspenseQuery(detailsQuery(tipo, id));
  const { profile } = useRequireProfile();

  // Registra este título para o botão X saber voltar ao título anterior.
  useEffect(() => {
    pushTitle(`/titulo/${tipo}/${id}`);
  }, [tipo, id]);
  const queryClient = useQueryClient();

  const [season, setSeason] = useState<number>(data.seasons[0]?.season_number ?? 1);

  const fetchList = useServerFn(listWatchlist);
  const list = useQuery({
    queryKey: ["watchlist", profile?.id],
    queryFn: () => fetchList({ data: { profileId: profile!.id } }),
    enabled: !!profile,
  });

  const fetchEpisodes = useServerFn(getSeasonEpisodes);
  const episodes = useQuery({
    queryKey: ["tmdb", "season", id, season],
    queryFn: () => fetchEpisodes({ data: { id, season } }),
    enabled: tipo === "tv" && data.seasons.length > 0,
  });

  const listItems = list.data ?? [];
  const inList = listItems.some((i) => i.tmdb_id === id && i.media_type === tipo);

  const toggle = useMutation({
    mutationFn: useServerFn(toggleWatchlist),
    // Atualização otimista: o botão troca na hora, sem esperar a rede.
    onMutate: async (vars) => {
      const key = ["watchlist", profile?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<typeof listItems>(key);
      const item = vars?.data.item;
      if (item) {
        queryClient.setQueryData<typeof listItems>(key, (old) => {
          const current = old ?? [];
          const exists = current.some(
            (i) => i.tmdb_id === item.tmdb_id && i.media_type === item.media_type,
          );
          return exists
            ? current.filter((i) => !(i.tmdb_id === item.tmdb_id && i.media_type === item.media_type))
            : [item, ...current];
        });
      }
      return { previous, key };
    },
    onSuccess: (res: { added: boolean }) => {
      toast.success(
        res.added ? "Adicionado à sua lista" : "Removido da sua lista",
      );
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error(e.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", profile?.id] });
    },
  });


  const backdrop = data.backdrop_path
    ? data.backdrop_path
    : null;
  const poster = data.poster_path ? data.poster_path : null;

  return (
    <AppShell chrome="close">
      <div className="relative">
        {backdrop ? (
          <img
            src={backdrop}
            alt={`Cena de ${data.title}`}
            className="absolute inset-0 h-[52vh] w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-x-0 top-0 h-[52vh] bg-gradient-to-t from-background via-background/80 to-background/30" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-24 sm:flex-row sm:px-8 sm:pt-32">
          {poster ? (
            <img
              src={poster}
              alt={`Pôster de ${data.title}`}
              className="w-36 shrink-0 rounded-2xl ring-1 ring-border sm:w-56"
            />
          ) : null}

          <div className="flex-1">
            <h1 className="text-3xl font-bold sm:text-4xl">{data.title}</h1>
            {data.tagline ? (
              <p className="mt-1 text-sm italic text-primary-glow">{data.tagline}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
              <span>{tipo === "movie" ? "Filme" : "Série"}</span>
              {data.year ? <span>• {data.year}</span> : null}
              {data.runtime ? <span>• {data.runtime} min</span> : null}
              {data.number_of_seasons ? (
                <span>• {data.number_of_seasons} temporada(s)</span>
              ) : null}
              {data.vote_average > 0 ? (
                <span className="inline-flex items-center gap-1">
                  • <Star className="h-3 w-3 text-accent" /> {data.vote_average.toFixed(1)}
                </span>
              ) : null}
            </div>

            {data.genres.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80">
              {data.overview || "Sinopse não disponível em português."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/assistir/$tipo/$id"
                params={{ tipo, id: String(id) }}
                search={tipo === "tv" ? { t: season, e: 1 } : {}}
                onClick={() => void requestLandscapeFullscreen()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 glow-primary"
              >
                <Play className="h-4 w-4" /> Assistir
              </Link>
              <button
                type="button"
                disabled={!profile || toggle.isPending}
                onClick={() =>
                  toggle.mutate({
                    data: {
                      profileId: profile!.id,
                      item: {
                        tmdb_id: id,
                        media_type: tipo,
                        title: data.title,
                        poster_path: data.poster_path,
                        backdrop_path: data.backdrop_path,
                      },
                    },
                  })
                }
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {inList ? <Check className="h-4 w-4 text-accent" /> : <Plus className="h-4 w-4" />}
                {inList ? "Na minha lista" : "Minha lista"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {tipo === "tv" && data.seasons.length > 0 ? (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">Episódios</h2>
            <select
              aria-label="Temporada"
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none"
            >
              {data.seasons.map((s) => (
                <option key={s.season_number} value={s.season_number}>
                  {s.name} ({s.episode_count} ep.)
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {episodes.isLoading ? (
              <p className="text-sm text-foreground/60">Carregando episódios…</p>
            ) : null}
            {(episodes.data ?? []).map((ep) => (
              <Link
                key={ep.episode_number}
                to="/assistir/$tipo/$id"
                params={{ tipo, id: String(id) }}
                search={{ t: season, e: ep.episode_number }}
                onClick={() => void requestLandscapeFullscreen()}
                className="glass-panel flex gap-4 rounded-2xl p-3 transition-colors hover:border-primary"
              >
                {ep.still_path ? (
                  <img
                    src={ep.still_path}
                    alt={`Cena do episódio ${ep.episode_number}`}
                    loading="lazy"
                    className="h-20 w-32 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-20 w-32 shrink-0 rounded-xl bg-surface-2" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {ep.episode_number}. {ep.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-foreground/65">
                    {ep.overview || "Sem descrição."}
                  </p>
                  {ep.runtime ? (
                    <p className="mt-1 text-[11px] text-foreground/50">{ep.runtime} min</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {data.cast.length > 0 ? (
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-8">
          <h2 className="text-xl font-semibold">Elenco</h2>
          <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
            {data.cast.map((c) => (
              <div key={`${c.name}-${c.character}`} className="w-24 shrink-0 text-center">
                {c.profile_path ? (
                  <img
                    src={c.profile_path}
                    alt={c.name}
                    loading="lazy"
                    className="h-24 w-24 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-surface-2" />
                )}
                <p className="mt-2 line-clamp-2 text-xs font-medium">{c.name}</p>
                <p className="line-clamp-1 text-[11px] text-foreground/55">{c.character}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.similar.length > 0 ? (
        <div className="mt-8">
          <MediaRow title="Você também pode gostar">
            {data.similar.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </MediaRow>
        </div>
      ) : null}
    </AppShell>
  );
}
