import { useCallback, useEffect, useRef, useState } from "react";

export type PlayerState = {
  playing: boolean;
  current: number;
  duration: number;
  buffered: number;
  rate: number;
  muted: boolean;
};

/** Estado central do player: play, tempo, buffer, velocidade e auto-hide dos controles. */
export function usePlayerControls(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<PlayerState>({
    playing: false,
    current: 0,
    duration: 0,
    buffered: 0,
    rate: 1,
    muted: false,
  });
  const [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setVisible(false);
    }, 3500);
  }, [videoRef]);

  const showControls = useCallback(() => {
    if (lockedRef.current) return;
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const hideControls = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () =>
      setState((prev) => ({
        ...prev,
        playing: !v.paused && !v.ended,
        current: v.currentTime,
        duration: Number.isFinite(v.duration) ? v.duration : prev.duration,
        buffered: v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0,
        rate: v.playbackRate,
        muted: v.muted,
      }));

    const onPlay = () => {
      sync();
      scheduleHide();
    };
    const onPause = () => {
      sync();
      setVisible(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };

    const events = ["timeupdate", "durationchange", "progress", "ratechange", "volumechange"];
    events.forEach((e) => v.addEventListener(e, sync));
    v.addEventListener("play", onPlay);
    v.addEventListener("playing", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onPause);
    sync();

    return () => {
      events.forEach((e) => v.removeEventListener(e, sync));
      v.removeEventListener("play", onPlay);
      v.removeEventListener("playing", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onPause);
    };
  }, [videoRef, scheduleHide]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, [videoRef]);

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      const max = Number.isFinite(v.duration) ? v.duration : v.currentTime + Math.abs(delta);
      v.currentTime = Math.min(Math.max(0, v.currentTime + delta), max);
    },
    [videoRef],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, seconds);
    },
    [videoRef],
  );

  const setRate = useCallback(
    (rate: number) => {
      const v = videoRef.current;
      if (v) v.playbackRate = rate;
    },
    [videoRef],
  );

  return {
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
  };
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
