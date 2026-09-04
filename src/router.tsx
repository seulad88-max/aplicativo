import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Barra fina no topo em vez de tela cheia de "Carregando…": a tela atual
// continua visível enquanto a próxima é preparada.
function RouterPending() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent"
    >
      <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Começa a baixar a próxima tela já no toque/hover do link.
    defaultPreload: "intent",
    // O TanStack Query controla a validade dos dados.
    defaultPreloadStaleTime: 0,
    defaultPreloadDelay: 30,
    // Navegações rápidas não mostram estado de carregamento nenhum.
    defaultPendingMs: 400,
    defaultPendingMinMs: 200,
    defaultPendingComponent: RouterPending,
  });

  return router;
};

