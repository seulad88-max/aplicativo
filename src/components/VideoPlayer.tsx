import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import {
  Cast,
  Gauge,
  Lock,
  MessageSquareText,
  Pause,
  PictureInPicture2,
  Play,
  SkipForward,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Unlock,
  X,
} from "lucide-react";
import type { Episode, Season } from "@/lib/media-types";
import { formatClock, usePlayerControls } from "./player/usePlayerControls";
import { OptionRow, PlayerSheet } from "./player/PlayerSheet";
import { requestLandscapeFullscreen } from "@/lib/fullscreen";

export type Reaction = "down" | "up" | "love" | null;

type Track = { id: number; label: string };

type Props = {
  src: string;
  poster?: string | null | undefined;
  title: string;
  subtitle?: string | null | undefined;
  kind?: "file" | "embed" | undefined;
  startAt?: number | undefined;
  onTime?: ((seconds: number, duration: number) => void) | undefined;
  onFlush?: ((seconds: number, duration: number) => void) | undefined;
  onClose?: (() => void) | undefined;
  seasons?: Season[] | undefined;
  currentSeason?: number | null | undefined;
  episodes?: Episode[] | undefined;
  currentEpisode?: number | null | undefined;
  onSelectEpisode?: ((season: number, episode: number) => void) | undefined;
  onSeasonChange?: ((season: number) => void) | undefined;
  nextEpisode?: Episode | null | undefined;
  onNextEpisode?: (() => void) | undefined;
  /** Marcadores opcionais da abertura (em segundos). Se ausentes, usamos uma janela padrão. */
  intro?: { start?: number | undefined; end?: number | undefined } | undefined;
  reaction?: Reaction | undefined;
  onReaction?: ((value: Reaction) => void) | undefined;
};

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Janela padrão (heurística) para o botão "Pular abertura".
 *
 * Quando os timestamps exatos vêm da prop `intro` (AniSkip), esses valores
 * são ignorados e o botão aparece e desaparece nos momentos certos.
 * Esses constantes só entram em ação como fallback quando não há dados da API.
 *
 * Boas práticas para o fallback:
 *   • Nunca mostrar antes de 30 s — muitas séries têm cold open (cena antes
 *     da abertura). Antes de 30 s quase nunca é a abertura ainda.
 *   • Janela até 5 min (300 s) — séries ocidentais podem ter abertura tardia.
 *   • Pulo padrão para ~2 min — mediana das aberturas de séries/anime.
 */
const INTRO_WINDOW_START = 30;   // heurística: abertura começa no máx. aos 30 s
const INTRO_WINDOW_END = 300;    // heurística: janela vai até 5 min
const INTRO_DEFAULT_SKIP_TO = 120; // heurística: pula para ~2 min (mediana)
const INTRO_MIN_DURATION = 300;

export function VideoPlayer({
  src,
  poster,
  title,
  subtitle,
  kind = "file",
  startAt = 0,
  onTime,
  onFlush,
  onClose,
  seasons = [],
  currentSeason,
  episodes = [],
  currentEpisode,
  onSelectEpisode,
  onSeasonChange,
  nextEpisode,
  onNextEpisode,
  intro,
  reaction = null,
  onReaction,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [brightness, setBrightness] = useState(1);
  const [sheet, setSheet] = useState<null | "speed" | "episodes" | "tracks">(null);
  const [audioTracks, setAudioTracks] = useState<Track[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<Track[]>([]);
  const [audioTrack, setAudioTrack] = useState(-1);
  const [subtitleTrack, setSubtitleTrack] = useState(-1);
  const [canCast, setCanCast] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [introSkipped, setIntroSkipped] = useState(false);

  const timeCb = useRef(onTime);
  timeCb.current = onTime;
  const flushCb = useRef(onFlush);
  flushCb.current = onFlush;
  const seekTarget = useRef(startAt);
  seekTarget.current = startAt;
  const didSeek = useRef(false);
  const lastTap = useRef(0);

  const {
    state,
    visible,
    locked,
    setLocked,
    showControls,
    hideControls,
    toggle,
    seekBy,
    seekTo,
    setRate,
  } = usePlayerControls(videoRef);

  // ---- carregamento da fonte (HLS ou arquivo nativo) -----------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video || kind === "embed") return;
    setError(null);
    setLoading(true);
    didSeek.current = false;
    let cancelled = false;

    const isHls = /\.(m3u8|txt)(\?|$)/i.test(src);

    if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
      void import("hls.js").then(({ default: HlsCtor }) => {
        if (cancelled) return;
        if (!HlsCtor.isSupported()) {
          video.src = src;
          return;
        }
        const hls = new HlsCtor({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
          setAudioTracks(
            hls.audioTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Áudio ${i + 1}` })),
          );
          setAudioTrack(hls.audioTrack);
          setSubtitleTracks(
            hls.subtitleTracks.map((t, i) => ({
              id: i,
              label: t.name || t.lang || `Legenda ${i + 1}`,
            })),
          );
          setSubtitleTrack(hls.subtitleTrack);
        });
        hls.on(HlsCtor.Events.ERROR, (_e, data) => {
          if (data.fatal) setError("Não foi possível carregar este vídeo. Tente novamente.");
        });
      });
    } else {
      video.src = src;
    }

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, kind]);

  // ---- retomada e gravação de progresso ------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video || kind === "embed") return;

    const flush = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        flushCb.current?.(video.currentTime, video.duration);
      }
    };
    const applySeek = () => {
      setLoading(false);
      const target = seekTarget.current;
      if (didSeek.current || !target || target < 5) return;
      if (!Number.isFinite(video.duration) || target >= video.duration - 15) return;
      didSeek.current = true;
      try {
        video.currentTime = target;
      } catch {
        // alguns streams não aceitam seek antes do buffer
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener("loadedmetadata", applySeek);
    video.addEventListener("canplay", applySeek);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", flush);
    video.addEventListener("ended", flush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      video.removeEventListener("loadedmetadata", applySeek);
      video.removeEventListener("canplay", applySeek);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", flush);
      video.removeEventListener("ended", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [src, kind]);

  // ---- tela cheia + paisagem ao abrir --------------------------------------
  const enterFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell || document.fullscreenElement) return;
    try {
      await shell.requestFullscreen?.();
    } catch {
      return;
    }
    const orientation = screen.orientation as
      (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    try {
      await orientation?.lock?.("landscape");
    } catch {
      // desktop e alguns navegadores não permitem travar a orientação
    }
  }, []);

  // Ao abrir o player, tenta manter/entrar em tela cheia deitada.
  useEffect(() => {
    void requestLandscapeFullscreen();
  }, []);

  useEffect(() => {
    setCanCast(
      typeof window !== "undefined" &&
        ("remote" in HTMLMediaElement.prototype ||
          "webkitShowPlaybackTargetPicker" in HTMLMediaElement.prototype),
    );
  }, []);

  // ---- teclado (desktop) ----------------------------------------------------
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (locked && ev.key !== "Escape") return;
      if (ev.key === " " || ev.key === "k") {
        ev.preventDefault();
        toggle();
      } else if (ev.key === "ArrowRight") seekBy(10);
      else if (ev.key === "ArrowLeft") seekBy(-10);
      else if (ev.key === "f") void enterFullscreen();
      showControls();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seekBy, showControls, enterFullscreen, locked]);

  const duration = state.duration || 0;
  const position = scrubbing ? scrubValue : state.current;
  const progressPct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (state.buffered / duration) * 100) : 0;
  const remaining = duration > 0 ? duration - position : 0;

  // ---- "Pular abertura" -----------------------------------------------------
  const isEpisode = currentEpisode != null || episodes.length > 0;

  // Se temos timestamps exatos da API (AniSkip), usamos eles diretamente.
  // Caso contrário, aplicamos a heurística melhorada com INTRO_WINDOW_*.
  const hasExactIntro = intro?.start != null && intro?.end != null;

  const introStart = intro?.start ?? INTRO_WINDOW_START;

  // Fim da abertura: timestamp exato da API ou heurística (15% da duração, cap 2 min).
  const introEnd = hasExactIntro
    ? intro!.end!
    : duration > 0
    ? Math.min(INTRO_DEFAULT_SKIP_TO, Math.max(INTRO_WINDOW_START + 30, duration * 0.15))
    : INTRO_DEFAULT_SKIP_TO;

  // Fim da janela em que o botão fica visível:
  //   • Com dados exatos: botão some assim que a abertura termina.
  //   • Sem dados: janela larga (INTRO_WINDOW_END) para cobrir aberturas tardias.
  const introWindowEnd = hasExactIntro
    ? Math.max(introEnd, introStart + 10)
    : INTRO_WINDOW_END;

  const showSkipIntro =
    isEpisode &&
    !introSkipped &&
    duration >= INTRO_MIN_DURATION &&
    position >= introStart &&
    position < Math.min(introWindowEnd, introEnd) &&
    !scrubbing;

  const skipIntro = () => {
    seekTo(introEnd);
    setIntroSkipped(true);
    showControls();
  };

  const nativeTextTracks = useMemo(() => subtitleTracks, [subtitleTracks]);

  useEffect(() => {
    setIntroSkipped(false);
  }, [src]);

  const applyAudio = (id: number) => {
    setAudioTrack(id);
    if (hlsRef.current) hlsRef.current.audioTrack = id;
  };
  const applySubtitle = (id: number) => {
    setSubtitleTrack(id);
    if (hlsRef.current) hlsRef.current.subtitleTrack = id;
    const video = videoRef.current;
    if (video) {
      Array.from(video.textTracks).forEach((t, i) => {
        t.mode = i === id ? "showing" : "disabled";
      });
    }
  };

  const onSurfaceTap = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (locked) {
      setLocked(false);
      showControls();
      return;
    }
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const now = Date.now();
    const isDouble = now - lastTap.current < 300;
    lastTap.current = now;

    if (isDouble && x < rect.width * 0.33) {
      seekBy(-10);
      return;
    }
    if (isDouble && x > rect.width * 0.67) {
      seekBy(10);
      return;
    }
    if (visible) hideControls();
    else showControls();
  };

  const startCast = () => {
    const video = videoRef.current as
      | (HTMLVideoElement & {
          remote?: { prompt: () => Promise<void> };
          webkitShowPlaybackTargetPicker?: () => void;
        })
      | null;
    if (!video) return;
    if (video.webkitShowPlaybackTargetPicker) video.webkitShowPlaybackTargetPicker();
    else void video.remote?.prompt().catch(() => undefined);
  };

  const togglePip = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement)
      void document.exitPictureInPicture().catch(() => undefined);
    else void video.requestPictureInPicture?.().catch(() => undefined);
  };

  if (kind === "embed") {
    return (
      <div ref={shellRef} className="fixed inset-0 z-50 bg-black">
        <iframe
          src={src}
          title={`Player de ${title}`}
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          className="h-full w-full border-0 bg-black"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar player"
          className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    );
  }

  const chrome = visible && !locked;

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-50 select-none overflow-hidden bg-black text-foreground"
      onMouseMove={() => showControls()}
    >
      <video
        ref={videoRef}
        playsInline
        autoPlay
        preload="metadata"
        poster={poster ?? undefined}
        aria-label={`Player de ${title}`}
        style={{ filter: `brightness(${brightness})` }}
        className="h-full w-full bg-black object-contain"
        onTimeUpdate={(ev) => {
          const el = ev.currentTarget;
          if (Number.isFinite(el.duration)) timeCb.current?.(el.currentTime, el.duration);
        }}
        onClick={(ev) => ev.preventDefault()}
        onError={() => setError("Não foi possível carregar este vídeo. Tente novamente.")}
      />

      {/* Camada de toque */}
      <div className="absolute inset-0" onClick={onSurfaceTap} role="presentation" />

      {loading && !error ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-primary"
        />
      ) : null}

      {locked ? (
        <button
          type="button"
          onClick={() => {
            setLocked(false);
            showControls();
          }}
          aria-label="Desbloquear controles"
          className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3"
        >
          <Lock className="h-6 w-6" />
        </button>
      ) : null}

      {/* ---------------- Controles ---------------- */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
          chrome ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-[color:var(--player-scrim)]" />

        {/* Topo */}
        <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center gap-3 px-4 pt-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar"
            className="shrink-0 rounded-full px-1 py-1 hover:bg-white/10"
          >
            <FluxoPrimeLogo />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
            {subtitle ? `${subtitle} — ` : ""}
            {title}
          </p>

          <div className="hidden items-center gap-2 sm:flex">
            <ReactionButton
              active={reaction === "down"}
              label="Não curti"
              onClick={() => onReaction?.(reaction === "down" ? null : "down")}
            >
              <ThumbsDown className="h-5 w-5" />
            </ReactionButton>
            <ReactionButton
              active={reaction === "up"}
              label="Curti"
              onClick={() => onReaction?.(reaction === "up" ? null : "up")}
            >
              <ThumbsUp className="h-5 w-5" />
            </ReactionButton>
            <ReactionButton
              active={reaction === "love"}
              label="Amei"
              onClick={() => onReaction?.(reaction === "love" ? null : "love")}
            >
              <span className="flex items-center">
                <ThumbsUp className="h-5 w-5" />
                <ThumbsUp className="-ml-2 h-5 w-5" />
              </span>
            </ReactionButton>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            {canCast ? (
              <button
                type="button"
                onClick={startCast}
                aria-label="Transmitir"
                className="rounded-full p-2 hover:bg-white/10"
              >
                <Cast className="h-5 w-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setLocked(true);
                hideControls();
              }}
              aria-label="Bloquear tela"
              className="rounded-full p-2 hover:bg-white/10"
            >
              <Unlock className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar player"
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Brilho */}
        <div className="pointer-events-auto absolute left-5 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex">
          <Sun className="h-5 w-5 text-foreground/85" />
          <input
            type="range"
            min={0.3}
            max={1.6}
            step={0.05}
            value={brightness}
            aria-label="Brilho"
            onChange={(ev) => setBrightness(Number(ev.target.value))}
            className="player-brightness h-40 w-1 cursor-pointer appearance-none rounded-full bg-white/30"
          />
        </div>

        {/* Centro */}
        <div className="pointer-events-auto absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-16 sm:gap-24">
          <button
            type="button"
            onClick={() => seekBy(-10)}
            aria-label="Voltar 10 segundos"
            className="rounded-full p-2 transition-transform active:scale-90"
          >
            <SeekIcon direction="back" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={state.playing ? "Pausar" : "Reproduzir"}
            className="rounded-full p-2 transition-transform active:scale-90"
          >
            {state.playing ? (
              <Pause className="h-14 w-14 fill-current" />
            ) : (
              <Play className="h-14 w-14 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            aria-label="Avançar 10 segundos"
            className="rounded-full p-2 transition-transform active:scale-90"
          >
            <SeekIcon direction="forward" />
          </button>
        </div>

        {/* Base */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="relative h-8 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/30" />
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/45"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-primary"
                style={{ width: `${progressPct}%` }}
              />
              <div
                aria-hidden
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                style={{ left: `${progressPct}%` }}
              />
              <input
                type="range"
                min={0}
                max={Math.max(duration, 1)}
                step={1}
                value={position}
                aria-label="Progresso do vídeo"
                onChange={(ev) => {
                  setScrubbing(true);
                  setScrubValue(Number(ev.target.value));
                }}
                onPointerUp={() => {
                  if (scrubbing) seekTo(scrubValue);
                  setScrubbing(false);
                  showControls();
                }}
                onKeyUp={() => {
                  if (scrubbing) seekTo(scrubValue);
                  setScrubbing(false);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <span className="w-16 text-right text-sm tabular-nums text-foreground/90">
              {formatClock(remaining)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm font-medium sm:justify-between sm:px-6">
            <BottomAction icon={<PictureInPicture2 className="h-5 w-5" />} onClick={togglePip}>
              Miniatura
            </BottomAction>
            <BottomAction icon={<Gauge className="h-5 w-5" />} onClick={() => setSheet("speed")}>
              {`Velocidade (${state.rate}x)`}
            </BottomAction>
            {seasons.length ? (
              <BottomAction
                icon={<EpisodesIcon />}
                onClick={() => {
                  setSheet("episodes");
                }}
              >
                Episódios
              </BottomAction>
            ) : null}
            <BottomAction
              icon={<MessageSquareText className="h-5 w-5" />}
              onClick={() => setSheet("tracks")}
            >
              Idioma e legendas
            </BottomAction>
            {nextEpisode ? (
              <BottomAction icon={<SkipForward className="h-5 w-5" />} onClick={onNextEpisode}>
                Próx. ep.
              </BottomAction>
            ) : null}
          </div>
        </div>
      </div>

      {/* Card de próximo episódio nos minutos finais */}
      {showSkipIntro && chrome ? (
        <button
          type="button"
          onClick={skipIntro}
          className="absolute bottom-24 right-6 z-30 rounded-[3px] border border-foreground/85 bg-[color:var(--player-panel)]/90 px-6 py-3 text-base font-semibold text-foreground shadow-2xl transition-transform active:scale-95"
        >
          Pular abertura
        </button>
      ) : null}

      {nextEpisode && duration > 0 && remaining < 40 && remaining > 1 ? (
        <button
          type="button"
          onClick={onNextEpisode}
          className="absolute bottom-24 right-6 z-30 flex items-center gap-3 rounded-xl bg-[color:var(--player-panel)] px-4 py-3 text-left shadow-2xl"
        >
          <SkipForward className="h-5 w-5" />
          <span>
            <span className="block text-xs text-foreground/60">Próximo episódio</span>
            <span className="block max-w-[14rem] truncate text-sm font-semibold">
              {nextEpisode.episode_number}. {nextEpisode.name}
            </span>
          </span>
        </button>
      ) : null}

      {sheet === "speed" ? (
        <PlayerSheet title="Velocidade de reprodução" onClose={() => setSheet(null)} side="bottom">
          <div className="grid gap-1">
            {RATES.map((r) => (
              <OptionRow
                key={r}
                label={`${r}x${r === 1 ? " (padrão)" : ""}`}
                active={state.rate === r}
                onClick={() => {
                  setRate(r);
                  setSheet(null);
                }}
              />
            ))}
          </div>
        </PlayerSheet>
      ) : null}

      {sheet === "tracks" ? (
        <PlayerSheet title="Idioma e legendas" onClose={() => setSheet(null)}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground/50">
            Áudio
          </h3>
          {audioTracks.length ? (
            <div className="mb-6 grid gap-1">
              {audioTracks.map((t) => (
                <OptionRow
                  key={t.id}
                  label={t.label}
                  active={audioTrack === t.id}
                  onClick={() => applyAudio(t.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mb-6 text-sm text-foreground/60">
              Este vídeo tem apenas uma faixa de áudio.
            </p>
          )}

          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground/50">
            Legendas
          </h3>
          {nativeTextTracks.length ? (
            <div className="grid gap-1">
              <OptionRow
                label="Desativadas"
                active={subtitleTrack === -1}
                onClick={() => applySubtitle(-1)}
              />
              {nativeTextTracks.map((t) => (
                <OptionRow
                  key={t.id}
                  label={t.label}
                  active={subtitleTrack === t.id}
                  onClick={() => applySubtitle(t.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/60">
              Este vídeo não traz legendas separadas — elas podem já estar embutidas na imagem.
            </p>
          )}
        </PlayerSheet>
      ) : null}

      {sheet === "episodes" ? (
        <PlayerSheet title="Episódios" onClose={() => setSheet(null)}>
          {seasons.length > 1 ? (
            <select
              aria-label="Temporada"
              value={currentSeason ?? 1}
              onChange={(ev) => onSeasonChange?.(Number(ev.target.value))}
              className="mb-4 w-full rounded-lg border border-[color:var(--player-line)] bg-black/40 px-3 py-2 text-sm outline-none"
            >
              {seasons.map((s) => (
                <option key={s.season_number} value={s.season_number}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          <div className="grid gap-2">
            {episodes.map((ep) => (
              <button
                key={ep.episode_number}
                type="button"
                onClick={() => {
                  void requestLandscapeFullscreen();
                  onSelectEpisode?.(currentSeason ?? 1, ep.episode_number);
                }}
                className={`flex gap-3 rounded-xl p-2 text-left transition-colors ${
                  ep.episode_number === currentEpisode ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                {ep.still_path ? (
                  <img
                    src={ep.still_path}
                    alt=""
                    loading="lazy"
                    className="h-16 w-28 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-28 shrink-0 rounded-lg bg-white/10" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {ep.episode_number}. {ep.name}
                  </span>
                  <span className="line-clamp-2 text-xs text-foreground/60">{ep.overview}</span>
                </span>
              </button>
            ))}
          </div>
        </PlayerSheet>
      ) : null}

      {error ? (
        <div className="absolute inset-x-0 bottom-1/2 z-40 px-6 text-center">
          <p role="alert" className="rounded-xl bg-black/80 px-4 py-3 text-sm">
            {error}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReactionButton({
  children,
  active,
  label,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-full p-2.5 transition-colors ${
        active ? "bg-foreground text-background" : "bg-white/15 hover:bg-white/25"
      }`}
    >
      {children}
    </button>
  );
}

function BottomAction({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: (() => void) | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-foreground/90 transition-colors hover:bg-white/10 hover:text-foreground"
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

function SeekIcon({ direction }: { direction: "back" | "forward" }) {
  // Seta circular estilo Netflix com "10" centralizado
  const isBack = direction === "back";
  return (
    <svg viewBox="0 0 44 44" fill="none" className="h-11 w-11" aria-hidden>
      {/* Arco principal — quase círculo completo */}
      <path
        d={
          isBack
            ? "M30 8.5 A15 15 0 1 0 37 22"
            : "M14 8.5 A15 15 0 1 1 7 22"
        }
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ponta da seta */}
      {isBack ? (
        <polyline
          points="26,3.5 30,8.5 25.5,13"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : (
        <polyline
          points="18,3.5 14,8.5 18.5,13"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {/* Número 10 centralizado */}
      <text
        x="22"
        y="27"
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fill="currentColor"
        fontFamily="inherit"
      >
        10
      </text>
    </svg>
  );
}

function FluxoPrimeLogo() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="h-8 w-8" aria-hidden>
      {/* Letra "F" estilizada como logo do FluxoPrime */}
      <rect width="36" height="36" rx="4" fill="currentColor" fillOpacity="0.15" />
      <text
        x="18"
        y="26"
        textAnchor="middle"
        fontSize="22"
        fontWeight="900"
        fill="currentColor"
        fontFamily="inherit"
        letterSpacing="-1"
      >
        FP
      </text>
    </svg>
  );
}

function EpisodesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <rect x="3" y="7" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M18 9v6M21 10.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
