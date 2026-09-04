import { createFileRoute, Link } from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@/lib/local-fn";
import { Play, X } from "lucide-react";
import { getHome } from "@/lib/catalog.functions";
import { deleteProgress, listProgress } from "@/lib/library.functions";
import { AppShell } from "@/components/AppShell";
import { Hero } from "@/components/Hero";
import { MediaRow } from "@/components/MediaRow";
import { MediaCard } from "@/components/MediaCard";
import { useRequireProfile } from "@/hooks/useRequireProfile";


const homeQuery = queryOptions({
  queryKey: ["tmdb", "home"],
  queryFn: () => getHome(),
  staleTime: 5 * 60_000,
  gcTime: 60 * 60_000,
});

export const Route = createFileRoute("/_authenticated/inicio")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(homeQuery);
  },
  head: () => ({
    meta: [
      { title: "Início — FluxoPrime" },
      {
        name: "description",
        content: "Novidades, populares e continuar assistindo no seu perfil do FluxoPrime.",
      },
      { property: "og:title", content: "Início — FluxoPrime" },
      { property: "og:description", content: "Os destaques do catálogo em pt-BR." },
    ],
  }),
  component: HomePage,
  errorComponent: ({ error }) => (
    <AppShell>
      <p className="px-6 py-20 text-center text-sm text-foreground/70" role="alert">
        {error.message}
      </p>
    </AppShell>
  ),
});

function HomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const { profile } = useRequireProfile();
  const fetchProgress = useServerFn(listProgress);
  const removeProgress = useServerFn(deleteProgress);
  const queryClient = useQueryClient();

  const progress = useQuery({
    queryKey: ["progress", profile?.id],
    queryFn: () => fetchProgress({ data: { profileId: profile!.id } }),
    enabled: !!profile,
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (item: { tmdb_id: number; media_type: "movie" | "tv" }) =>
      removeProgress({
        data: { profileId: profile!.id, tmdbId: item.tmdb_id, mediaType: item.media_type },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", profile?.id] });
      toast.success("Removido de “Continuar assistindo”");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      {data.hero ? <Hero item={data.hero} /> : null}

      {progress.data && progress.data.length > 0 ? (
        <MediaRow title={`Continuar assistindo${profile ? ` — ${profile.name}` : ""}`}>
          {progress.data.map((p) => (
            <ContinueCard
              key={`${p.media_type}-${p.tmdb_id}`}
              item={p}
              onRemove={() => remove.mutate({ tmdb_id: p.tmdb_id, media_type: p.media_type })}
            />
          ))}
        </MediaRow>
      ) : null}

      {data.rows.map((row, i) => (
        <MediaRow key={`${i}-${row.title}`} title={row.title}>
          {row.items.map((item) => (
            <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
          ))}
        </MediaRow>
      ))}
    </AppShell>
  );
}

function ContinueCard({
  item,
  onRemove,
}: {
  item: {
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    backdrop_path: string | null;
    poster_path: string | null;
    season: number | null;
    episode: number | null;
    percent: number;
  };
  onRemove: () => void;
}) {
  const img = item.backdrop_path ?? item.poster_path ?? null;

  return (
    <div className="group relative w-[240px] shrink-0 sm:w-[300px]">
      <Link
        to="/assistir/$tipo/$id"
        params={{ tipo: item.media_type, id: String(item.tmdb_id) }}
        search={item.media_type === "tv" ? { t: item.season ?? 1, e: item.episode ?? 1 } : {}}
        aria-label={`Continuar assistindo ${item.title}`}
        className="block"
      >
        <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border transition-all group-hover:ring-primary group-hover:glow-primary">
          {img ? (
            <img
              src={img}
              alt={`Cena de ${item.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center px-3 text-center text-xs text-foreground/60">
              {item.title}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
          <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
            <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
          </span>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
            <p className="text-[11px] text-foreground/70">
              {item.media_type === "tv"
                ? `T${item.season ?? 1} • EP${item.episode ?? 1} • ${item.percent}% assistido`
                : `${item.percent}% assistido`}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/70">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${Math.max(item.percent, 3)}%` }}
              />
            </div>
          </div>
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Remover ${item.title} de Continuar assistindo`}
        onClick={(ev) => {
          ev.preventDefault();
          onRemove();
        }}
        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/80 text-foreground/80 ring-1 ring-border backdrop-blur transition-colors hover:bg-background hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

