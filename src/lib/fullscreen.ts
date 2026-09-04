// Abre a tela cheia travada em paisagem. Precisa ser chamado dentro de um
// gesto do usuário (clique/toque), porque os navegadores só liberam tela cheia
// e travamento de orientação a partir de uma interação real.
export async function requestLandscapeFullscreen(): Promise<void> {
  if (typeof document === "undefined") return;

  const target = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  try {
    if (!document.fullscreenElement) {
      await (target.requestFullscreen?.() ?? target.webkitRequestFullscreen?.());
    }
  } catch {
    // alguns navegadores (iOS Safari) não permitem tela cheia em elementos
  }

  const orientation = (typeof screen !== "undefined" ? screen.orientation : undefined) as
    | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
    | undefined;

  try {
    await orientation?.lock?.("landscape");
  } catch {
    // desktop e alguns navegadores não permitem travar a orientação
  }
}
