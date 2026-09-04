import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Download, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { LANDING_POSTERS, posterSize } from "@/lib/landing-posters";
import { InstallButton } from "@/components/InstallButton";
import { useAuth } from "@/lib/auth-context";
import { getStoredProfileId } from "@/lib/profile-store";
import { hasStoredSession } from "@/lib/session-flag";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FluxoPrime — Filmes e séries em pt-BR" },
      {
        name: "description",
        content:
          "Entre no FluxoPrime e assista milhares de filmes e séries dublados e legendados, com perfis para toda a família.",
      },
      { property: "og:title", content: "FluxoPrime — Filmes e séries em pt-BR" },
      {
        property: "og:description",
        content: "Catálogo completo de filmes e séries, perfis separados e progresso salvo.",
      },
    ],
  }),
  component: Landing,
});

type Poster = { title: string; poster: string };

const COLUMNS: Poster[][] = [0, 1, 2].map((offset) =>
  [0, 3, 6, 9]
    .map((base) => LANDING_POSTERS[base + offset])
    .filter((media): media is Poster => Boolean(media)),
);

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Marca gravada no último login: permite entrar direto, sem esperar o SDK.
  const [optimistic] = useState(hasStoredSession);

  useEffect(() => {
    if (!optimistic) return;
    navigate({ to: getStoredProfileId() ? "/inicio" : "/perfis", replace: true });
  }, [optimistic, navigate]);

  // Se já tem sessão ativa, pula direto para perfis (ou início se já tem perfil selecionado)
  useEffect(() => {
    if (loading || !user) return;
    const profileId = getStoredProfileId();
    if (profileId) {
      navigate({ to: "/inicio", replace: true });
    } else {
      navigate({ to: "/perfis", replace: true });
    }
  }, [user, loading, navigate]);

  // Enquanto verifica a sessão, mostra a marca (sem tela de "Carregando…")
  if (loading || optimistic) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            Fluxo<span className="text-primary-glow">Prime</span>
          </span>
          <span className="h-0.5 w-32 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] bg-primary" />
          </span>
        </div>
      </div>
    );
  }


  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/25 to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-5">

        {/* header */}
        <header className="flex items-center justify-between">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Fluxo<span className="text-primary-glow">Prime</span>
          </span>
          <Link
            to="/entrar"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Entrar
          </Link>
        </header>

        {/* mosaico de posters */}
        <section className="relative isolate mt-5 flex h-[48svh] min-h-[340px] items-end overflow-hidden rounded-3xl border border-border/60 bg-surface/50">
          <div className="absolute inset-0 grid grid-cols-3 gap-1.5 p-1.5">
            {COLUMNS.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className={`flex flex-col gap-1.5 ${columnIndex === 1 ? "translate-y-8" : ""}`}
              >
                {column.map((media) => (
                  <img
                    key={media.poster}
                    src={posterSize(media.poster, "w185")}
                    alt={media.title}
                    decoding="async"
                    fetchPriority={columnIndex === 0 ? "high" : "low"}
                    className="aspect-[2/3] w-full shrink-0 rounded-xl bg-surface-2 object-cover"
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-background via-background/90 to-transparent" />

          <h1 className="relative w-full px-5 pb-6 text-center font-display text-2xl font-extrabold leading-snug sm:text-3xl">
            Filmes e séries em apenas alguns toques
          </h1>
        </section>

        {/* CTA entrar */}
        <Link
          to="/entrar"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Entrar <ChevronRight className="h-4 w-4" />
        </Link>

        {/* CTA criar conta */}
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-primary/40 bg-surface/40 px-5 py-3.5">
          <p className="text-sm text-foreground/70">Ainda não tem conta?</p>
          <Link
            to="/entrar"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow"
          >
            <UserPlus className="h-4 w-4" /> Criar conta
          </Link>
        </div>

        {/* instalar */}
        <InstallButton className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-surface/60 px-5 py-3 text-sm font-medium text-foreground/80 transition hover:border-primary/40">
          <Download className="h-4 w-4" /> Instalar o app no aparelho
        </InstallButton>
      </div>
    </main>
  );
}
