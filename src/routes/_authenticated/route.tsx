import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { firebaseConfigured, useAuth } from "@/lib/auth-context";
import { hasStoredSession } from "@/lib/session-flag";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Sessão já conhecida: renderiza o conteúdo na hora, sem esperar o Firebase.
  const [optimistic] = useState(hasStoredSession);

  useEffect(() => {
    if (loading || user) return;
    navigate({ to: "/entrar", replace: true });
  }, [loading, user, navigate]);

  if (!firebaseConfigured) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="max-w-sm text-sm text-foreground/70">
          Falta colar a chave do Firebase (apiKey) em src/lib/firebase.ts para o login funcionar.
        </p>
      </main>
    );
  }

  if ((loading || !user) && !(loading && optimistic)) {
    // Skeleton no lugar do spinner de tela cheia: a interface aparece
    // imediatamente e só o conteúdo entra depois.
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="h-6 w-32 animate-pulse rounded-full bg-surface-2" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-surface-2 sm:aspect-[21/9]" />
          {[0, 1].map((row) => (
            <div key={row} className="mt-8">
              <div className="h-5 w-48 animate-pulse rounded-full bg-surface-2" />
              <div className="mt-4 flex gap-3 overflow-hidden">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-[210px] w-[140px] shrink-0 animate-pulse rounded-xl bg-surface-2"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only" role="status">
          Carregando conteúdo
        </span>
      </div>
    );
  }


  return <Outlet />;
}
