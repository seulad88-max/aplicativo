// Galeria fixa de avatares dos perfis (emoji + cor de fundo).
export type AvatarOption = { key: string; emoji: string; color: string };

export const AVATAR_OPTIONS: AvatarOption[] = [
  { key: "ruiva", emoji: "👩‍🦰", color: "#1E293B" },
  { key: "heroina", emoji: "🦸‍♀️", color: "#4C1D95" },
  { key: "heroi", emoji: "🦸‍♂️", color: "#0F766E" },
  { key: "alien", emoji: "👽", color: "#065F46" },
  { key: "gato", emoji: "🐱", color: "#7C2D12" },
  { key: "cachorro", emoji: "🐶", color: "#78350F" },
  { key: "panda", emoji: "🐼", color: "#334155" },
  { key: "raposa", emoji: "🦊", color: "#9A3412" },
  { key: "robo", emoji: "🤖", color: "#1E3A8A" },
  { key: "fantasma", emoji: "👻", color: "#3F3F46" },
  { key: "unicornio", emoji: "🦄", color: "#831843" },
  { key: "dragao", emoji: "🐲", color: "#14532D" },
  { key: "pipoca", emoji: "🍿", color: "#713F12" },
  { key: "cinema", emoji: "🎬", color: "#111827" },
  { key: "coroa", emoji: "👑", color: "#854D0E" },
  { key: "bebe", emoji: "🧸", color: "#7F1D1D" },
];

export function avatarOf(key?: string | null): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.key === key) ?? (AVATAR_OPTIONS[0] as AvatarOption);
}
