import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/local-fn";
import { listWatchlist } from "@/lib/library.functions";
import { AppShell } from "@/components/AppShell";
import { MediaCard } from "@/components/MediaCard";
import { useRequireProfile } from "@/hooks/useRequireProfile";

export const Route = createFileRoute("/_authenticated/minha-lista")({
  head: () => ({
    meta: [
      { title: "Minha lista — FluxoPrime" },
      {
        name: "description",
        content: "Os títulos que você salvou para assistir depois, separados por perfil.",
      },
      { property: "og:title", content: "Minha lista — FluxoPrime" },
      { property: "og:description", content: "Sua lista pessoal de filmes e séries." },
    ],
  }),
  component: MyListPage,
});

function MyListPage() {
  const { profile } = useRequireProfile();
  const fetchList = useServerFn(listWatchlist);

  const list = useQuery({
    queryKey: ["watchlist", profile?.id],
    queryFn: () => fetchList({ data: { profileId: profile!.id } }),
    enabled: !!profile,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Minha lista{profile ? ` — ${profile.name}` : ""}
        </h1>

        {list.isLoading ? (
          <p className="mt-8 text-sm text-foreground/60">Carregando…</p>
        ) : (list.data ?? []).length === 0 ? (
          <div className="glass-panel mt-8 rounded-2xl p-8 text-center">
            <p className="text-sm text-foreground/70">
              Sua lista está vazia. Abra um título e toque em “Minha lista”.
            </p>
            <Link
              to="/inicio"
              className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {(list.data ?? []).map((item) => (
              <MediaCard
                key={`${item.media_type}-${item.tmdb_id}`}
                width="sm"
                item={{
                  id: item.tmdb_id,
                  media_type: item.media_type,
                  title: item.title,
                  poster_path: item.poster_path,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
