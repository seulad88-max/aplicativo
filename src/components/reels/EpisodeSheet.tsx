import { X } from "lucide-react";
import type { Episode } from "@/lib/media-types";

export function EpisodeSheet({
  open,
  onClose,
  title,
  episodes,
  current,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  episodes: Episode[];
  current: number | null;
  onSelect: (episode: number) => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar lista de episódios"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative max-h-[70%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-neutral-950/95 pb-24 backdrop-blur-xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 bg-neutral-950/95 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Episódios</p>
            <p className="line-clamp-1 text-xs text-white/60">{title}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {episodes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/60">
            Carregando episódios desta mini-série…
          </p>
        ) : (
          <ul className="grid grid-cols-4 gap-2 px-4 pb-4 sm:grid-cols-6">
            {episodes.map((ep) => {
              const isCurrent = ep.episode_number === current;
              return (
                <li key={ep.episode_number}>
                  <button
                    type="button"
                    onClick={() => onSelect(ep.episode_number)}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`w-full rounded-xl px-2 py-3 text-sm font-semibold transition ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {ep.episode_number}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
