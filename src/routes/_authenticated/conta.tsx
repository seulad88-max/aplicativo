import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Pencil, Bookmark, Settings, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MediaCard } from "@/components/MediaCard";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useServerFn } from "@/lib/local-fn";
import { listWatchlist } from "@/lib/library.functions";
import { useAuth } from "@/lib/auth-context";
import { setStoredProfileId, useActiveProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Perfil — FluxoPrime" },
      {
        name: "description",
        content: "Painel do usuário: sua lista salva e os perfis de transmissão da conta.",
      },
      { property: "og:title", content: "Perfil — FluxoPrime" },
      { property: "og:description", content: "Sua lista salva e os perfis da sua conta." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useActiveProfile();
  const { user, signOut: firebaseSignOut } = useAuth();
  const fetchList = useServerFn(listWatchlist);

  const list = useQuery({
    queryKey: ["watchlist", profile?.id],
    queryFn: () => fetchList({ data: { profileId: profile!.id } }),
    enabled: !!profile,
  });


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    setStoredProfileId(null);
    await firebaseSignOut();
    navigate({ to: "/entrar", replace: true });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-4">
        {/* Cartão do usuário */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
          <div className="flex items-start gap-4">
            <Link
              to="/editar-perfil/$id"
              params={{ id: profile?.id ?? "novo" }}
              className="relative"
              aria-label="Editar perfil"
            >
              <ProfileAvatar profile={profile} size={88} rounded="rounded-2xl" />
              <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-black/80">
                <Pencil className="h-3.5 w-3.5 text-white/80" />
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/65">
                PAINEL DO USUÁRIO
              </span>
              <h1 className="mt-2 truncate font-display text-2xl font-bold">
                {profile?.name ?? "Perfil"}
              </h1>
              <p className="truncate text-sm text-white/45">{user?.email ?? ""}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-5 flex items-center gap-2 rounded-2xl border border-white/12 px-5 py-3 text-sm font-semibold tracking-[0.12em] text-white/85"
          >
            <LogOut className="h-4 w-4" /> SAIR
          </button>
        </section>

        {/* Configurações */}
        <Link
          to="/configuracoes"
          className="mt-5 flex items-center gap-3 rounded-3xl border border-white/8 bg-white/[0.03] p-1.5 transition-colors hover:bg-white/[0.07]"
        >
          <span className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold">
            <Settings className="h-4 w-4" /> Configurações
          </span>
          <ChevronRight className="mr-3 h-4 w-4 text-white/40" />
        </Link>


        {/* Minha lista */}
        <section className="mt-6">
          <div className="flex items-start gap-3">
            <Bookmark className="mt-1 h-6 w-6 shrink-0 text-white/70" />
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold leading-tight">Minha lista</h2>
            </div>
            <Link
              to="/gerenciar-perfis"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white/85"
            >
              <Pencil className="h-3.5 w-3.5" /> GERENCIAR PERFIS
            </Link>
          </div>
          <p className="mt-2 text-sm text-white/45">
            Os títulos que {profile?.name ?? "você"} salvou para assistir depois.
          </p>

          {list.isLoading ? (
            <p className="mt-6 text-sm text-white/50">Carregando…</p>
          ) : (list.data ?? []).length === 0 ? (
            <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.04] p-8 text-center">
              <p className="text-sm text-white/65">
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
            <div className="mt-5 grid grid-cols-3 gap-3 pb-6 sm:grid-cols-4">
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
        </section>

      </div>
    </AppShell>
  );
}
