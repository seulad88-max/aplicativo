// Perfis, minha lista e progresso salvos na conta do usuário (Firebase Firestore).
// Estrutura:
//   users/{uid}/profiles/{profileId}
//   users/{uid}/profiles/{profileId}/watchlist/{tipo-id}
//   users/{uid}/profiles/{profileId}/progress/{tipo-id}
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore/lite";

import { getDb, getFirebaseAuth } from "./firebase";

export type ProfileRow = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_key?: string | undefined;
  username?: string | undefined;
  is_kids: boolean;
  allow_adult: boolean;
  pin?: string | undefined;
  created_at: string;
};

export type ProfileInput = {
  name: string;
  avatar_color: string;
  avatar_key?: string | undefined;
  username?: string | undefined;
  is_kids: boolean;
  allow_adult: boolean;
  pin?: string | undefined;
};

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 20);
}

export type LibraryItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
};

export type ProgressRow = LibraryItem & {
  season: number | null;
  episode: number | null;
  position_seconds: number;
  duration_seconds: number;
  percent: number;
  updated_at: string;
};

type Arg<T> = { data: T } | undefined;

function input<T>(args: Arg<T>): T {
  if (!args) throw new Error("Dados da operação ausentes");
  return args.data;
}

function firestoreError(error: unknown): Error {
  const message = (error as { message?: string } | null)?.message ?? "";
  const code = (error as { code?: string } | null)?.code ?? "";
  if (message.includes("SERVICE_DISABLED") || message.includes("Cloud Firestore API has not been used")) {
    return new Error("O banco Firestore ainda não foi criado ou ativado no projeto Firebase.");
  }
  if (code === "permission-denied") {
    return new Error("Acesso negado pelo Firestore. Publique o arquivo firestore.rules no Firebase.");
  }
  if (code === "unavailable") {
    return new Error("Não foi possível conectar ao Firestore. Verifique a internet e tente novamente.");
  }
  return error instanceof Error ? error : new Error("Não foi possível acessar os perfis.");
}

function uid(): string {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Faça login para continuar");
  return user.uid;
}

function newId() {
  // Alguns navegadores Android (WebView antigo, contexto sem HTTPS) não têm
  // crypto.randomUUID: cair no gerador manual evita travar a criação do perfil.
  try {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    // ignora e usa o fallback
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Em rede móvel instável o Firestore pode ficar pendurado sem erro nem sucesso:
// o tempo limite garante que a tela sempre volte a responder.
async function withTimeout<T>(promise: Promise<T>, ms = 12_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("A conexão demorou demais. Verifique a internet e tente de novo.")),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const keyOf = (i: { tmdb_id: number; media_type: string }) => `${i.media_type}-${i.tmdb_id}`;

const profilesCol = () => collection(getDb(), "users", uid(), "profiles");
const profileDoc = (id: string) => doc(getDb(), "users", uid(), "profiles", id);
const watchlistCol = (profileId: string) =>
  collection(getDb(), "users", uid(), "profiles", profileId, "watchlist");
const progressCol = (profileId: string) =>
  collection(getDb(), "users", uid(), "profiles", profileId, "progress");

// ---- Perfis ----

export async function listProfiles(): Promise<ProfileRow[]> {
  if (!getFirebaseAuth().currentUser) return [];
  let snap;
  try {
    snap = await withTimeout(getDocs(query(profilesCol(), orderBy("created_at", "asc"))));
  } catch (error) {
    throw firestoreError(error);
  }
  return snap.docs.map((d) => {
    const data = d.data() as Partial<ProfileRow>;
    return {
      id: d.id,
      name: data.name ?? "Perfil",
      avatar_color: data.avatar_color ?? "#8B5CF6",
      avatar_key: data.avatar_key ?? undefined,
      username: data.username ?? undefined,
      is_kids: !!data.is_kids,
      allow_adult: !!data.allow_adult,
      pin: data.pin ?? undefined,
      created_at: data.created_at ?? new Date().toISOString(),
    };
  });
}

export async function isUsernameAvailable(
  args: Arg<{ username: string; ignoreId?: string | undefined }>,
): Promise<boolean> {
  const { username, ignoreId } = input(args);
  const value = normalizeUsername(username);
  if (value.length < 3) return false;
  const existing = await listProfiles();
  return !existing.some((p) => p.username === value && p.id !== ignoreId);
}

export async function createProfile(args: Arg<ProfileInput>): Promise<ProfileRow> {
  const data = input(args);
  const name = data.name.trim().slice(0, 30);
  if (!name) throw new Error("Informe um nome para o perfil");
  const existing = await listProfiles();
  if (existing.length >= 4) throw new Error("Limite de 4 perfis por conta");
  const username = data.username ? normalizeUsername(data.username) : "";
  if (username && !(await isUsernameAvailable({ data: { username } }))) {
    throw new Error("Esse username já está em uso");
  }
  const row: ProfileRow = {
    id: newId(),
    name,
    avatar_color: data.avatar_color,
    ...(data.avatar_key ? { avatar_key: data.avatar_key } : {}),
    ...(username ? { username } : {}),
    is_kids: !!data.is_kids,
    allow_adult: !!data.allow_adult,
    ...(data.pin ? { pin: data.pin } : {}),
    created_at: new Date().toISOString(),
  };
  try {
    await withTimeout(setDoc(profileDoc(row.id), { ...row, updated_at: serverTimestamp() }));
  } catch (error) {
    throw firestoreError(error);
  }
  return row;
}

export async function updateProfile(args: Arg<ProfileInput & { id: string }>) {
  const data = input(args);
  const name = data.name.trim().slice(0, 30);
  const username = data.username ? normalizeUsername(data.username) : "";
  if (username && !(await isUsernameAvailable({ data: { username, ignoreId: data.id } }))) {
    throw new Error("Esse username já está em uso");
  }
  await withTimeout(setDoc(
    profileDoc(data.id),
    {
      ...(name ? { name } : {}),
      avatar_color: data.avatar_color,
      avatar_key: data.avatar_key ?? null,
      username: username || null,
      is_kids: !!data.is_kids,
      allow_adult: !!data.allow_adult,
      pin: data.pin ?? null,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  ));
  return { ok: true };
}

export async function deleteProfile(args: Arg<{ id: string }>) {
  const id = input(args).id;
  const [list, progress] = await Promise.all([getDocs(watchlistCol(id)), getDocs(progressCol(id))]);
  await Promise.all([...list.docs, ...progress.docs].map((d) => deleteDoc(d.ref)));
  await deleteDoc(profileDoc(id));
  return { ok: true };
}

// ---- Minha lista ----

export async function listWatchlist(args: Arg<{ profileId: string }>): Promise<LibraryItem[]> {
  const profileId = input(args).profileId;
  if (!profileId || !getFirebaseAuth().currentUser) return [];
  const snap = await getDocs(query(watchlistCol(profileId), orderBy("added_at", "desc")));
  return snap.docs.map((d) => {
    const data = d.data() as LibraryItem;
    return {
      tmdb_id: data.tmdb_id,
      media_type: data.media_type,
      title: data.title,
      poster_path: data.poster_path ?? null,
      backdrop_path: data.backdrop_path ?? null,
    };
  });
}

export async function toggleWatchlist(args: Arg<{ profileId: string; item: LibraryItem }>) {
  const { profileId, item } = input(args);
  const ref = doc(watchlistCol(profileId), keyOf(item));
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await deleteDoc(ref);
    return { added: false };
  }
  await setDoc(ref, { ...item, added_at: serverTimestamp() });
  return { added: true };
}

const DONE_PERCENT = 95;

export async function listProgress(args: Arg<{ profileId: string }>): Promise<ProgressRow[]> {
  const profileId = input(args).profileId;
  if (!profileId || !getFirebaseAuth().currentUser) return [];
  // Sem orderBy/where no Firestore para não depender de índice composto:
  // filtramos e ordenamos no cliente.
  const snap = await getDocs(query(progressCol(profileId), limit(60)));
  return snap.docs
    .map((d) => d.data() as ProgressRow)
    .filter(
      (r) =>
        Number.isFinite(r.percent) &&
        r.percent > 0 &&
        r.percent < DONE_PERCENT &&
        Number.isFinite(r.position_seconds),
    )
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 20);
}

export async function getProgressFor(
  args: Arg<{ profileId: string; tmdbId: number; mediaType: "movie" | "tv" }>,
): Promise<ProgressRow | null> {
  const { profileId, tmdbId, mediaType } = input(args);
  if (!profileId || !getFirebaseAuth().currentUser) return null;
  const snap = await getDoc(doc(progressCol(profileId), `${mediaType}-${tmdbId}`));
  if (!snap.exists()) return null;
  const row = snap.data() as ProgressRow;
  return Number.isFinite(row.position_seconds) ? row : null;
}

export async function saveProgress(
  args: Arg<{
    profileId: string;
    item: LibraryItem;
    season: number | null;
    episode: number | null;
    position_seconds: number;
    duration_seconds: number;
  }>,
) {
  const data = input(args);
  if (!data.profileId || !getFirebaseAuth().currentUser) return { percent: 0 };

  const position = Number(data.position_seconds);
  const duration = Number(data.duration_seconds);
  if (!Number.isFinite(position) || position < 5) return { percent: 0 };
  if (!Number.isFinite(duration) || duration <= 0) return { percent: 0 };

  const percent = Math.min(100, Math.max(0, Math.round((position / duration) * 100)));
  const row: ProgressRow = {
    ...data.item,
    poster_path: data.item.poster_path ?? null,
    backdrop_path: data.item.backdrop_path ?? null,
    season: data.season ?? null,
    episode: data.episode ?? null,
    position_seconds: Math.round(position),
    duration_seconds: Math.round(duration),
    percent,
    updated_at: new Date().toISOString(),
  };
  await setDoc(doc(progressCol(data.profileId), keyOf(row)), row);
  return { percent };
}

export async function deleteProgress(
  args: Arg<{ profileId: string; tmdbId: number; mediaType: "movie" | "tv" }>,
) {
  const { profileId, tmdbId, mediaType } = input(args);
  if (!profileId) return { ok: false };
  await deleteDoc(doc(progressCol(profileId), `${mediaType}-${tmdbId}`));
  return { ok: true };
}


// ---- Conta ----

// Apaga todos os dados do usuário no Firestore (perfis, listas e progresso)
// antes de remover a conta no Firebase Auth.
export async function deleteAccountData() {
  const userId = uid();
  const profiles = await getDocs(profilesCol());
  for (const p of profiles.docs) {
    const [list, progress] = await Promise.all([
      getDocs(watchlistCol(p.id)),
      getDocs(progressCol(p.id)),
    ]);
    await Promise.all([...list.docs, ...progress.docs].map((d) => deleteDoc(d.ref)));
    await deleteDoc(p.ref);
  }
  await deleteDoc(doc(getDb(), "users", userId));
  return { ok: true };
}
