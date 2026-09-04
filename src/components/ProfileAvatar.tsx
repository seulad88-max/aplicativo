import { avatarOf } from "@/lib/avatars";
import type { ProfileRow } from "@/lib/library.functions";

export function ProfileAvatar({
  profile,
  size = 48,
  className = "",
  rounded = "rounded-full",
}: {
  profile: Pick<ProfileRow, "name" | "avatar_color" | "avatar_key"> | null;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const hasEmoji = !!profile?.avatar_key;
  const opt = avatarOf(profile?.avatar_key);
  const bg = hasEmoji ? opt.color : (profile?.avatar_color ?? "#8B5CF6");

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden font-bold text-white ${rounded} ${className}`}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {hasEmoji ? opt.emoji : (profile?.name?.[0]?.toUpperCase() ?? "?")}
    </span>
  );
}
