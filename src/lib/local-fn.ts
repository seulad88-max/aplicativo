// Substitui o useServerFn do TanStack: as funções agora rodam direto no navegador.
export function useServerFn<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
