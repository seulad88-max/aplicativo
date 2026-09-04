import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/local-fn";
import { Search as SearchIcon, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { searchTitles, getHome } from "@/lib/catalog.functions";
import { posterUrl, backdropUrl, type MediaItem } from "@/lib/media-types";
import { AppShell } from "@/components/AppShell";
import { useRequireProfile } from "@/hooks/useRequireProfile";

type Search = { q?: string };

export const Route = createFileRoute("/_authenticated/busca")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["q"] === "string" && search["q"] ? { q: search["q"] } : {},
  head: () => ({
    meta: [
      { title: "Buscar — FluxoPrime" },
      { name: "description", content: "Busque filmes e séries por nome no catálogo do FluxoPrime." },
      { property: "og:title", content: "Buscar — FluxoPrime" },
      { property: "og:description", content: "Encontre qualquer filme ou série em segundos." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  useRequireProfile();
  const search = useServerFn(searchTitles);
  const home = useServerFn(getHome);

  useEffect(() => {
    const t = setTimeout(() => {
      const v = term.trim();
      if (v !== (q ?? "")) navigate({ to: "/busca", search: v ? { q: v } : {}, replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [term, q, navigate]);

  const results = useQuery({
    queryKey: ["tmdb", "search", q ?? ""],
    queryFn: () => search({ data: { query: q ?? "" } }),
    enabled: !!q,
  });

  const suggestions = useQuery({
    queryKey: ["busca", "sugestoes"],
    queryFn: () => home({}),
    enabled: !q,
  });

  const suggested: MediaItem[] = (suggestions.data?.rows ?? [])
    .flatMap((r) => r.items)
    .slice(0, 30);

  const list = q ? (results.data ?? []) : suggested;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-8">
        <h1 className="font-display text-3xl font-extrabold">Buscar</h1>

        <form className="mt-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-4 py-3">
            <SearchIcon className="h-5 w-5 shrink-0 text-foreground/60" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Busque séries, filmes..."
              aria-label="Termo de busca"
              className="w-full bg-transparent text-base outline-none placeholder:text-foreground/50"
            />
          </div>
        </form>

        <h2 className="mt-7 text-xl font-bold">
          {q ? `Resultados para “${q}”` : "Séries e filmes recomendados"}
        </h2>

        {(q ? results.isLoading : suggestions.isLoading) ? (
          <p className="mt-6 text-sm text-foreground/60">Carregando…</p>
        ) : null}

        {q && results.data && results.data.length === 0 ? (
          <p className="mt-6 text-sm text-foreground/60">
            Nada encontrado para “{q}”. Tente outro termo.
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-border/60">
          {list.map((item) => (
            <li key={`${item.media_type}-${item.id}`}>
              <Link
                to="/titulo/$tipo/$id"
                params={{ tipo: item.media_type, id: String(item.id) }}
                className="flex items-center gap-4 py-3 transition-colors hover:bg-surface/60"
              >
                <div className="h-[74px] w-[130px] shrink-0 overflow-hidden rounded-md bg-surface-2">
                  {backdropUrl(item.backdrop_path) || posterUrl(item.poster_path) ? (
                    <img
                      src={backdropUrl(item.backdrop_path) ?? posterUrl(item.poster_path)!}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="flex-1 text-[15px] font-medium leading-snug">{item.title}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-foreground/60 text-foreground">
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
