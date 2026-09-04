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
    queryKey: ["tmdb", "catalog", "movie", genre ?? null],
    queryFn: () => (genre ? getCatalog({ data: { type: "movie", genre } }) : getCatalog({ data: { type: "movie" } })),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/_authenticated/filmes")({
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
      { title: "Filmes — FluxoPrime" },
      {
        name: "description",
        content: "Explore filmes por gênero: ação, comédia, terror, animação e muito mais.",
      },
      { property: "og:title", content: "Filmes — FluxoPrime" },
      { property: "og:description", content: "Catálogo de filmes em português no FluxoPrime." },
    ],
  }),
  component: MoviesPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <p className="px-6 py-20 text-center text-sm" role="alert">
        {error.message}
      </p>
    </AppShell>
  ),
});

function MoviesPage() {
  const { genero } = Route.useSearch();
  const { data } = useSuspenseQuery(catalogQuery(genero));
  useRequireProfile();

  return (
    <AppShell>
      {data.hero ? <Hero item={data.hero} /> : null}

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-6 sm:px-8">
        <Link
          to="/filmes"
          search={{}}
          className={`shrink-0 rounded-full border border-border px-4 py-1.5 text-sm transition-colors ${
            genero ? "bg-surface hover:bg-secondary" : "bg-primary text-primary-foreground"
          }`}
        >
          Todos
        </Link>
        {data.genres.map((g) => (
          <Link
            key={g.id}
            to="/filmes"
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
