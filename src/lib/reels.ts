// Mini-séries verticais ("[Reel]") — o feed de Reels do FluxoPrime.
import { searchTitles } from "./catalog.functions";
import type { MediaItem } from "./media-types";

export const REEL_PREFIX = /^\s*\[\s*reels?\s*\]\s*/i;

export const isReel = (item: { title: string }) => REEL_PREFIX.test(item.title);

export const cleanReelTitle = (title: string) => title.replace(REEL_PREFIX, "").trim();

/** Todas as mini-séries marcadas com [Reel] no catálogo. */
export async function getReels(): Promise<MediaItem[]> {
  const found = await searchTitles({ data: { query: "[Reel]" } });
  const seen = new Set<number>();
  return found.filter((item) => {
    if (!isReel(item) || item.media_type !== "tv" || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Embaralha sem alterar a lista original (ordem nova a cada visita). */
export function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}
