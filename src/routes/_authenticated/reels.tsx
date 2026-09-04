import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@/lib/local-fn";
import { listWatchlist, toggleWatchlist } from "@/lib/library.functions";
import { getReels, shuffle } from "@/lib/reels";
import { BottomNav } from "@/components/BottomNav";
import { ReelStage } from "@/components/reels/ReelStage";
import { useRequireProfile } from "@/hooks/useRequireProfile";

const reelsQuery = queryOptions({
  queryKey: ["catalog", "reels"],
  queryFn: () => getReels(),
  staleTime: 10 * 60_000,
  gcTime: 60 * 60_000,
});

export const Route = createFileRoute("/_authenticated/reels")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(reelsQuery);
  },
  head: () => ({
    meta: [
      { title: "Reels — FluxoPrime" },
      {
        name: "description",
        content: "As mini-séries verticais [Reel] do FluxoPrime, com episódio tocando na hora.",
      },
      { property: "og:title", content: "Reels — FluxoPrime" },
      { property: "og:description", content: "Deslize e assista as mini-séries do catálogo." },
    ],
  }),
  component: ReelsPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center bg-black px-8 text-center">
      <p className="text-sm text-white/70" role="alert">
        {error.message}
      </p>
      <BottomNav />
    </div>
  ),
});

function ReelsPage() {
  const { data } = useSuspenseQuery(reelsQuery);
  const { profile } = useRequireProfile();
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listWatchlist);
  const toggle = useServerFn(toggleWatchlist);

  // Ordem aleatória a cada visita: sempre começa em um reel diferente.
  const feed = useMemo(() => shuffle(data), [data]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);

  // Detecta o reel visível com IntersectionObserver: nunca "pula" uma tela,
  // mesmo quando a barra do navegador do Android aparece/desaparece.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const items = Array.from(root.children) as HTMLElement[];
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = items.indexOf(entry.target as HTMLElement);
          if (i >= 0) setIndex(i);
        }
      },
      { root, threshold: 0.6 },
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [feed]);

  const watchlist = useQuery({
    queryKey: ["watchlist", profile?.id],
    queryFn: () => fetchList({ data: { profileId: profile!.id } }),
    enabled: !!profile,
    staleTime: 60_000,
  });

  const inList = (id: number) =>
    (watchlist.data ?? []).some((x) => x.tmdb_id === id && x.media_type === "tv");

  const mutate = useMutation({
    mutationFn: (item: { id: number; title: string; poster: string | null; backdrop: string | null }) =>
      toggle({
        data: {
          profileId: profile!.id,
          item: {
            tmdb_id: item.id,
            media_type: "tv",
            title: item.title,
            poster_path: item.poster,
            backdrop_path: item.backdrop,
          },
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", profile?.id] });
      toast.success(res.added ? "Adicionado à minha lista" : "Removido da minha lista");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (feed.length === 0) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-black px-8 text-center">
        <p className="text-sm text-white/70">
          Nenhuma mini-série [Reel] disponível no catálogo agora.
        </p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <div
        ref={scroller}
        className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        {feed.map((item, i) => (
          <ReelStage
            key={item.id}
            item={item}
            active={i === index}
            preload={Math.abs(i - index) === 1}
            muted={muted}
            onToggleMuted={() => setMuted((v) => !v)}
            inList={inList(item.id)}
            onToggleList={() =>
              profile
                ? mutate.mutate({
                    id: item.id,
                    title: item.title,
                    poster: item.poster_path,
                    backdrop: item.backdrop_path,
                  })
                : undefined
            }
          />
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
