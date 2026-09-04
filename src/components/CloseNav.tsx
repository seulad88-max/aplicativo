import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, X } from "lucide-react";
import { clearTitles, peekPreviousTitle, popTitle } from "@/lib/title-stack";

export function CloseNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    const prev = peekPreviousTitle(pathname);
    setPrevious(prev && prev !== pathname ? prev : null);
  }, [pathname]);

  function goBack() {
    const target = popTitle(pathname);
    void navigate({ to: target && target !== pathname ? target : "/inicio" });
  }

  function close() {
    // O X sempre volta para o menu principal.
    clearTitles();
    void navigate({ to: "/inicio" });
  }

  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
      {previous ? (
        <button
          type="button"
          onClick={goBack}
          aria-label="Voltar"
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : (
        <span className="h-10 w-10" />
      )}
      <button
        type="button"
        onClick={close}
        aria-label="Fechar"
        className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
