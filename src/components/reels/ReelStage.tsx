import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { Check, ListVideo, Loader2, Pause, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSeasonEpisodes, getStreamUrl } from "@/lib/catalog.functions";
import type { Episode, MediaItem } from "@/lib/media-types";
import { cleanReelTitle } from "@/lib/reels";
import { EpisodeSheet } from "./EpisodeSheet";

type Props = {
  item: MediaItem;
  active: boolean;
  /** Vizinho do reel atual: já baixa episódios/stream e deixa o vídeo pronto. */
  preload?: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  inList: boolean;
  onToggleList: () => void;
};

export function ReelStage({
  item,
  active,
  preload = false,
  muted,
  onToggleMuted,
  inList,
  onToggleList,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  const shouldLoad = active || preload;
  const poster = item.backdrop_path ?? item.poster_path ?? undefined;
  const title = cleanReelTitle(item.title);

  const activeRef = useRef(active);
  activeRef.current = active;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const episodes = useQuery({
    queryKey: ["catalog", "season", item.id, 1],
    queryFn: () => getSeasonEpisodes({ data: { id: item.id, season: 1 } }),
    enabled: shouldLoad,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  // Episódio aleatório assim que a lista chega (mesmo antes de entrar em cena).
  useEffect(() => {
    if (!shouldLoad || episode !== null) return;
    const list = episodes.data;
    if (!list || list.length === 0) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    setEpisode(pick?.episode_number ?? 1);
  }, [shouldLoad, episode, episodes.data]);

  const stream = useQuery({
    queryKey: ["stream", "tv", item.id, 1, episode],
    queryFn: () => getStreamUrl({ data: { type: "tv", id: item.id, season: 1, episode } }),
    enabled: shouldLoad && episode !== null,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  const src = stream.data?.url ?? null;

  /** Tenta tocar na hora; se o navegador bloquear, volta ao mudo e tenta de novo. */
  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeRef.current) return;
    video.muted = mutedRef.current;
    const p = video.play();
    if (!p) return;
    void p.then(
      () => setPaused(false),
      () => {
        video.muted = true;
        void video.play().then(
          () => setPaused(false),
          () => setPaused(true),
        );
      },
    );
  }, []);

  // Carrega a fonte (HLS ou arquivo nativo) já no vizinho, para tocar instantâneo.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !shouldLoad) return;
    setFailed(false);
    setReady(false);
    let cancelled = false;
    const isHls = /\.(m3u8|txt)(\?|$)/i.test(src);

    if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
      void import("hls.js").then(({ default: HlsCtor }) => {
        if (cancelled || !HlsCtor.isSupported()) {
          if (!cancelled) setFailed(true);
          return;
        }
        const hls = new HlsCtor({
          enableWorker: true,
          lowLatencyMode: true,
          startLevel: -1,
          maxBufferLength: 12,
          backBufferLength: 15,
          maxMaxBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
          setReady(true);
          tryPlay();
        });
        hls.on(HlsCtor.Events.ERROR, (_e, data) => {
          if (data.fatal) setFailed(true);
        });
      });
    } else {
      video.src = src;
      video.load();
    }

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, shouldLoad, tryPlay]);

  // Entrou em cena: toca na hora. Saiu: pausa e volta ao início.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      tryPlay();
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // fonte ainda não carregada
      }
      setProgress(0);
      setPaused(false);
    }
  }, [active, src, tryPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  const toggleplay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) tryPlay();
    else {
      video.pause();
      setPaused(true);
    }
  }, [tryPlay]);

  const goToEpisode = (n: number) => {
    setEpisode(n);
    setSheetOpen(false);
  };

  const nextEpisode = useMemo(() => {
    const list = episodes.data ?? [];
    if (episode === null) return null;
    const idx = list.findIndex((e) => e.episode_number === episode);
    return idx >= 0 ? (list[idx + 1] ?? null) : null;
  }, [episodes.data, episode]);

  const loading = active && !failed && !ready;
  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <section className="relative h-full w-full snap-item overflow-hidden bg-black">
      {poster ? (
        <img
          src={poster}
          alt=""
          aria-hidden
          loading={shouldLoad ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl"
        />
      ) : null}

      <video
        ref={videoRef}
        playsInline
        muted={muted}
        preload="auto"
        autoPlay={active}
        loop={false}
        poster={poster}
        onClick={toggleplay}
        onLoadedMetadata={(ev) => {
          const v = ev.currentTarget;
          if (Number.isFinite(v.duration)) setDuration(v.duration);
        }}
        onCanPlay={() => {
          setReady(true);
          tryPlay();
        }}
        onPlaying={() => {
          setReady(true);
          setPaused(false);
        }}
        onTimeUpdate={(ev) => {
          const v = ev.currentTarget;
          setProgress(v.currentTime);
          if (Number.isFinite(v.duration)) setDuration(v.duration);
        }}
        onEnded={() => {
          if (nextEpisode) setEpisode(nextEpisode.episode_number);
        }}
        onError={() => setFailed(true)}
        className="relative z-10 h-full w-full object-contain"
      />

      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <Loader2 className="h-9 w-9 animate-spin text-white/70" />
        </div>
      ) : null}

      {failed ? (
        <div className="absolute inset-0 z-20 grid place-items-center px-8 text-center">
          <p className="text-sm text-white/80" role="alert">
            Não foi possível carregar este episódio. Deslize para o próximo reel ou escolha outro
            episódio.
          </p>
        </div>
      ) : null}

      {paused && !loading ? (
        <button
          type="button"
          aria-label="Reproduzir"
          onClick={toggleplay}
          className="absolute inset-0 z-20 grid place-items-center"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/50 backdrop-blur">
            <Play className="h-7 w-7 translate-x-[2px] text-white" fill="currentColor" />
          </span>
        </button>
      ) : null}

      {/* Botões laterais */}
      <div className="absolute bottom-40 right-3 z-30 flex flex-col items-center gap-4">
        <RailButton
          label={muted ? "Ativar som" : "Desativar som"}
          onClick={onToggleMuted}
          icon={muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        />
        <RailButton
          label={inList ? "Remover da minha lista" : "Adicionar à minha lista"}
          onClick={onToggleList}
          icon={inList ? <Check className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        />
        <RailButton
          label="Ver episódios"
          caption="Episódios"
          onClick={() => setSheetOpen(true)}
          icon={<ListVideo className="h-6 w-6" />}
        />
        {!paused && !loading ? (
          <RailButton label="Pausar" onClick={toggleplay} icon={<Pause className="h-6 w-6" />} />
        ) : null}
      </div>

      {/* Texto do reel */}
      <div className="absolute inset-x-0 bottom-24 z-20 px-4 pr-24">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {episode !== null ? (
          <p className="mt-1 text-xs font-semibold text-white/70">Episódio {episode}</p>
        ) : null}
        {item.overview ? (
          <p className="mt-2 line-clamp-3 text-sm text-white/80">{item.overview}</p>
        ) : null}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-white/70">{clock(progress)}</span>
        </div>
      </div>

      <EpisodeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={title}
        episodes={episodes.data ?? []}
        current={episode}
        onSelect={goToEpisode}
      />
    </section>
  );
}

function RailButton({
  label,
  caption,
  icon,
  onClick,
}: {
  label: string;
  caption?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-[10px] font-medium text-white/85 transition active:scale-95"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur">
        {icon}
      </span>
      {caption ? <span>{caption}</span> : null}
    </button>
  );
}

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type { Episode };
