// Sinalizador leve de "já existe sessão" para a interface.
// NÃO é um token e não autoriza nada: serve só para o app decidir na hora
// qual tela mostrar enquanto o Firebase restaura a sessão em segundo plano.
const KEY = "fluxoprime_has_session";

export function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setStoredSession(active: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (active) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // armazenamento indisponível: o app apenas volta ao comportamento antigo
  }
}
