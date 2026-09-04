import { useEffect, useState, type ReactNode } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

/**
 * Botão "instalar app". No Android/Chrome usa o prompt nativo.
 * No iPhone (Safari) mostra a instrução de "Adicionar à Tela de Início",
 * que é a única forma de instalar no iOS.
 */
export function InstallButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          if (promptEvent) {
            void promptEvent.prompt();
            setPromptEvent(null);
            return;
          }
          setShowIosHelp((v) => !v);
        }}
      >
        {children}
      </button>

      {showIosHelp ? (
        <p className="mt-2 rounded-xl border border-border bg-surface/50 px-4 py-3 text-center text-xs leading-relaxed text-foreground/70">
          No iPhone: toque em <strong>Compartilhar</strong> na barra do Safari e escolha{" "}
          <strong>Adicionar à Tela de Início</strong>. No Android: menu <strong>⋮</strong> e{" "}
          <strong>Instalar aplicativo</strong>.
        </p>
      ) : null}
    </>
  );
}
