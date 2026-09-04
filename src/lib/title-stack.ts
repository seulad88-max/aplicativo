// Pilha simples das páginas de título visitadas nesta sessão.
// Serve para que o botão X volte ao título anterior (ex.: série -> filme
// sugerido no fim da lista) em vez de sempre ir para a tela inicial.

const KEY = "fluxoprime:title-stack";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(stack: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-20)));
  } catch {
    // sessionStorage indisponível: seguimos sem histórico de títulos.
  }
}

/** Registra a visita a uma página de título. */
export function pushTitle(path: string) {
  const stack = read();
  if (stack[stack.length - 1] === path) return;
  // Se voltamos para um título já visitado, cortamos o que veio depois dele.
  const existing = stack.lastIndexOf(path);
  if (existing !== -1) {
    write(stack.slice(0, existing + 1));
    return;
  }
  write([...stack, path]);
}

/**
 * Remove o título atual e devolve o anterior (ou null se não houver).
 */
export function popTitle(currentPath?: string): string | null {
  const stack = read();
  if (currentPath && stack[stack.length - 1] !== currentPath) {
    const idx = stack.lastIndexOf(currentPath);
    if (idx !== -1) {
      write(stack.slice(0, idx));
      return stack[idx - 1] ?? null;
    }
  }
  const next = stack.slice(0, -1);
  write(next);
  return next[next.length - 1] ?? null;
}

export function clearTitles() {
  write([]);
}

/** Devolve o título anterior sem alterar a pilha. */
export function peekPreviousTitle(currentPath?: string): string | null {
  const stack = read();
  if (currentPath) {
    const idx = stack.lastIndexOf(currentPath);
    if (idx !== -1) return stack[idx - 1] ?? null;
  }
  return stack[stack.length - 2] ?? null;
}
