import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/local-fn";
import { useAuth } from "@/lib/auth-context";
import { listProfiles, type ProfileRow } from "./library.functions";

const KEY = "fluxoprime_profile_id";
const EVENT = "fluxoprime-profile-change";

export const AVATAR_COLORS = [
  "#8B5CF6",
  "#D946EF",
  "#F472B6",
  "#38BDF8",
  "#34D399",
  "#FBBF24",
  "#FB7185",
  "#A78BFA",
];

export function getStoredProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setStoredProfileId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(KEY, id);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

// Os perfis mudam raramente: guardar a última lista deixa a barra de navegação
// e o gate de perfil aparecerem na hora, sem esperar o Firestore a cada abertura.
const CACHE_KEY = "fluxoprime_profiles_cache";

function readProfilesCache(uid: string): ProfileRow[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(`${CACHE_KEY}:${uid}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ProfileRow[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeProfilesCache(uid: string, rows: ProfileRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CACHE_KEY}:${uid}`, JSON.stringify(rows));
  } catch {
    // cota cheia: o cache é só um atalho
  }
}

export function useProfiles() {
  const fetchProfiles = useServerFn(listProfiles);
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  return useQuery({
    queryKey: ["profiles", uid],
    queryFn: async () => {
      const rows = await fetchProfiles();
      if (uid) writeProfilesCache(uid, rows);
      return rows;
    },
    enabled: !!user,
    retry: 1,
    staleTime: 60_000,
    // Usa o cache como primeira pintura, mas revalida logo em seguida.
    ...(uid ? { initialData: readProfilesCache(uid), initialDataUpdatedAt: 0 } : {}),
  });
}

export function useActiveProfile() {
  const { data: profiles, isLoading, error, refetch, isFetching } = useProfiles();
  const [storedId, setStoredId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setStoredId(getStoredProfileId());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const select = useCallback((id: string) => setStoredProfileId(id), []);

  const profile: ProfileRow | null =
    (profiles ?? []).find((p) => p.id === storedId) ?? null;

  return { profiles: profiles ?? [], profile, isLoading, isFetching, error, refetch, select };
}
