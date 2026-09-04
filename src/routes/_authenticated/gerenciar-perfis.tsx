import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Pencil } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PosterWall } from "@/components/PosterWall";
import { useAuth } from "@/lib/auth-context";
import { setStoredProfileId, useActiveProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/_authenticated/gerenciar-perfis")({
  head: () => ({
    meta: [
      { title: "Gerenciar Perfis — FluxoPrime" },
      {
        name: "description",
        content: "Edite, crie ou remova os perfis de transmissão da sua conta FluxoPrime.",
      },
      { property: "og:title", content: "Gerenciar Perfis — FluxoPrime" },
      { property: "og:description", content: "Edite avatares, nomes e PIN de cada perfil." },
    ],
  }),
  component: ManageProfilesPage,
});

function ManageProfilesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profiles } = useActiveProfile();
  const { signOut: firebaseSignOut } = useAuth();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    setStoredProfileId(null);
    await firebaseSignOut();
    navigate({ to: "/entrar", replace: true });
  }

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <PosterWall />

      <div className="safe-top relative z-10 flex items-center justify-between px-5 py-4">
        <span className="font-display text-xl font-bold italic tracking-tight">
          Fluxo<span className="text-primary-glow">Prime</span>
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm text-white/85"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-5 pb-24">
        <h1 className="text-center font-display text-3xl font-bold sm:text-4xl">Gerenciar Perfis</h1>

        <div className="mt-10 flex flex-wrap items-start justify-center gap-8">
          {profiles.map((p) => (
            <Link
              key={p.id}
              to="/editar-perfil/$id"
              params={{ id: p.id }}
              className="flex w-28 flex-col items-center gap-3"
            >
              <span className="relative">
                <ProfileAvatar profile={p} size={112} className="ring-2 ring-white/25 brightness-75" />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-black/60">
                    <Pencil className="h-6 w-6 text-white" />
                  </span>
                </span>
              </span>
              <span className="truncate text-sm font-semibold text-white/85">{p.name}</span>
            </Link>
          ))}

          {profiles.length < 4 ? (
            <Link
              to="/editar-perfil/$id"
              params={{ id: "novo" }}
              className="flex w-28 flex-col items-center gap-3"
            >
              <span className="grid h-28 w-28 place-items-center rounded-full border-2 border-dashed border-white/30 text-3xl text-white/50">
                +
              </span>
              <span className="text-center text-sm font-medium text-white/55">Adicionar Perfil</span>
            </Link>
          ) : null}
        </div>

        <Link
          to="/perfis"
          className="mt-12 rounded-full border border-white/25 px-10 py-3 text-sm font-semibold tracking-[0.18em] text-white/85"
        >
          CONCLUÍDO
        </Link>
      </div>
    </main>
  );
}
