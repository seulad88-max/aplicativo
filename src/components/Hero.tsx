import { Link } from "@tanstack/react-router";
import { Info, Play, Star } from "lucide-react";
import type { MediaItem } from "@/lib/media-types";
import { tmdbSize } from "@/lib/image-size";

export function Hero({ item }: { item: MediaItem }) {
  const backdrop = item.backdrop_path ? tmdbSize(item.backdrop_path, "w780") : null;

  return (
    <section className="relative w-full overflow-hidden">
      {backdrop ? (
        <img
          src={backdrop}
          alt={`Cena de ${item.title}`}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/25" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent sm:h-40" />

      <div className="relative mx-auto flex min-h-[46svh] max-w-[1600px] flex-col justify-end gap-3 px-4 pb-8 pt-16 sm:min-h-[68vh] sm:gap-4 sm:px-8 sm:pb-16 sm:pt-24">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary-glow sm:text-xs">
          <span>{item.media_type === "movie" ? "Filme" : "Série"}</span>
          {item.year ? <span className="text-foreground/60">• {item.year}</span> : null}
          {item.vote_average > 0 ? (
            <span className="inline-flex items-center gap-1 text-foreground/60">
              • <Star className="h-3 w-3 text-accent" /> {item.vote_average.toFixed(1)}
            </span>
          ) : null}
        </div>

        <h1 className="hero-title max-w-3xl font-bold">{item.title}</h1>

        <p className="line-clamp-3 max-w-xl text-[13px] leading-relaxed text-foreground/75 sm:text-base">
          {item.overview
            ? item.overview.length > 260
              ? `${item.overview.slice(0, 260)}…`
              : item.overview
            : "Sinopse não disponível em português."}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1 sm:gap-3">
          <Link
            to="/assistir/$tipo/$id"
            params={{ tipo: item.media_type, id: String(item.id) }}
            preload="intent"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95 glow-primary sm:px-6 sm:py-3"
          >
            <Play className="h-4 w-4" /> Assistir agora
          </Link>
          <Link
            to="/titulo/$tipo/$id"
            params={{ tipo: item.media_type, id: String(item.id) }}
            preload="intent"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-secondary active:scale-95 sm:px-6 sm:py-3"
          >
            <Info className="h-4 w-4" /> Mais informações
          </Link>
        </div>
      </div>
    </section>
  );
}
