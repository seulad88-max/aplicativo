import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/catalog.functions";
import { AppShell } from "@/components/AppShell";
import { Hero } from "@/components/Hero";
import { MediaRow } from "@/components/MediaRow";
import { MediaCard } from "@/components/MediaCard";
import { useRequireProfile } from "@/hooks/useRequireProfile";

type Search = { genero?: number };

const catalogQuery = (genre?: number) =>
  queryOptions({
    queryKey: ["tmdb", "catalog", "tv", genre ?? null],
    queryFn: () => (genre ? getCatalog({ data: { type: "tv", genre } }) : getCatalog({ data: { type: "tv" } })),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/_authenticated/series")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const g = Number(search["genero"]);
    return Number.isFinite(g) && g > 0 ? { genero: g } : {};
  },
  loaderDeps: ({ search }) => ({ genero: search.genero }),
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(catalogQuery(deps.genero));
  },
  head: () => ({
    meta: [
      { title: "Séries — FluxoPrime" },
      {
        name: "description",
        content: "Séries completas com todas as temporadas e episódios, em português.",
      },
      { property: "og:title", content: "Séries — FluxoPrime" },
      { property: "og:description", content: "Catálogo de séries em português no FluxoPrime." },
    ],
  }),
  component: SeriesPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <p className="px-6 py-20 text-center text-sm" role="alert">
        {error.message}
      </p>
    </AppShell>
  ),
});

function SeriesPage() {
  const { genero } = Route.useSearch();
  const { data } = useSuspenseQuery(catalogQuery(genero));
  useRequireProfile();

  return (
    <AppShell>
      {data.hero ? <Hero item={data.hero} /> : null}

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-6 sm:px-8">
        <Link
          to="/series"
          search={{}}
          className={`shrink-0 rounded-full border border-border px-4 py-1.5 text-sm transition-colors ${
            genero ? "bg-surface hover:bg-secondary" : "bg-primary text-primary-foreground"
          }`}
        >
          Todas
        </Link>
        {data.genres.map((g) => (
          <Link
            key={g.id}
            to="/series"
            search={{ genero: g.id }}
            className={`shrink-0 rounded-full border border-border px-4 py-1.5 text-sm transition-colors ${
              genero === g.id ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-secondary"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {data.rows.map((row, i) => (
        <MediaRow key={`${i}-${row.title}`} title={row.title}>
          {row.items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </MediaRow>
      ))}
    </AppShell>
  );
}
