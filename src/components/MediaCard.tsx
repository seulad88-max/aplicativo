import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Star } from "lucide-react";
import type { MediaItem } from "@/lib/media-types";
import { tmdbSize } from "@/lib/image-size";

type Props = {
  item: Pick<MediaItem, "id" | "media_type" | "title" | "poster_path"> & {
    vote_average?: number;
    year?: string | null;
  };
  percent?: number;
  width?: "sm" | "md";
};

function MediaCardBase({ item, percent, width = "md" }: Props) {
  const poster = item.poster_path ? tmdbSize(item.poster_path, "w342") : null;

  return (
    <Link
      to="/titulo/$tipo/$id"
      params={{ tipo: item.media_type, id: String(item.id) }}
      className={`group relative block shrink-0 ${
        width === "sm" ? "w-[124px] sm:w-[150px]" : "w-[150px] sm:w-[190px]"
      }`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-primary group-hover:glow-primary">
        {poster ? (
          <img
            src={poster}
            alt={`Pôster de ${item.title}`}
            loading="lazy"
            decoding="async"
            width={342}
            height={513}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
            {item.title}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="absolute inset-x-0 bottom-0 translate-y-2 p-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <Play className="h-3 w-3" /> Assistir
          </span>
        </div>

        {typeof item.vote_average === "number" && item.vote_average > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
            <Star className="h-3 w-3 text-accent" /> {item.vote_average.toFixed(1)}
          </span>
        ) : null}

        {typeof percent === "number" && percent > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-background/70">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      <p className="mt-2 line-clamp-1 text-xs font-medium text-foreground/90 sm:text-sm">
        {item.title}
      </p>
    </Link>
  );
}


export const MediaCard = memo(MediaCardBase);
