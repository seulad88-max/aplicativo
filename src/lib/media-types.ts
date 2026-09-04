export type MediaType = "movie" | "tv";

export type MediaItem = {
  id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  year: string | null;
};

export type Row = { title: string; items: MediaItem[] };

export type Season = { season_number: number; name: string; episode_count: number };

export type Episode = {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  air_date: string | null;
};

export const posterUrl = (p?: string | null, _size = "w500") => p ?? null;

export const backdropUrl = (p?: string | null, _size = "w1280") => p ?? null;
