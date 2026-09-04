import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type ProfileRow } from "@/lib/library.functions";
import { setStoredProfileId, useActiveProfile } from "@/lib/profile-store";
import { useAuth } from "@/lib/auth-context";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PinDialog } from "@/components/PinDialog";
import { PosterWall } from "@/components/PosterWall";

export const Route = createFileRoute("/_authenticated/perfis")({
  head: () => ({
    meta: [
      { title: "Quem está assistindo? — FluxoPrime" },
      {
        name: "description",
        content: "Escolha ou crie um perfil para ver listas e progresso separados no FluxoPrime.",
      },
      { property: "og:title", content: "Perfis — FluxoPrime" },
      { property: "og:description", content: "Perfis separados para cada pessoa da casa." },
    ],
  }),
  component: ProfilesPage,
});

function ProfilesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profiles, isLoading, select } = useActiveProfile();
  const { signOut: firebaseSignOut } = useAuth();
  const [pinPrompt, setPinPrompt] = useState<ProfileRow | null>(null);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    setStoredProfileId(null);
    await firebaseSignOut();
    navigate({ to: "/entrar", replace: true });
  }

  function choose(profile: ProfileRow) {
    if (profile.pin) {
      setPinPrompt(profile);
    } else {
      select(profile.id);
      navigate({ to: "/inicio" });
    }
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
        <h1 className="text-center font-display text-3xl font-bold sm:text-4xl">
          Quem está assistindo?
        </h1>
        <p className="mt-3 max-w-sm text-center text-sm text-white/55">
          Selecione seu perfil para entrar na sua experiência cinematográfica.
        </p>

        <div className="mt-10 flex flex-wrap items-start justify-center gap-8">
          {isLoading
            ? [0, 1].map((i) => (
                <div key={i} className="h-28 w-28 animate-pulse rounded-full bg-white/10" />
              ))
            : profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choose(p)}
                  className="flex w-28 flex-col items-center gap-3"
                >
                  <ProfileAvatar
                    profile={p}
                    size={112}
                    className="ring-2 ring-white/25 transition-transform hover:scale-105"
                  />
                  <span className="truncate text-sm font-semibold text-white/90">{p.name}</span>
                </button>
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
              <span className="text-sm font-medium text-white/55">Adicionar Perfil</span>
            </Link>
          ) : null}
        </div>

        <Link
          to="/gerenciar-perfis"
          className="mt-12 rounded-full border border-white/25 px-8 py-3 text-sm font-semibold tracking-[0.15em] text-white/85"
        >
          GERENCIAR PERFIS
        </Link>
      </div>

      {pinPrompt ? (
        <PinDialog
          profile={pinPrompt}
          onClose={() => setPinPrompt(null)}
          onSuccess={() => {
            const id = pinPrompt.id;
            setPinPrompt(null);
            select(id);
            navigate({ to: "/inicio" });
          }}
        />
      ) : null}
    </main>
  );
}
