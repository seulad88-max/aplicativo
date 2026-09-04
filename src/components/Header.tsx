import { Link } from "@tanstack/react-router";
import { useActiveProfile } from "@/lib/profile-store";
import { ProfileAvatar } from "./ProfileAvatar";

export function Header() {
  const { profile } = useActiveProfile();

  return (
    <header className="sticky top-0 z-40 glass-panel border-b">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-8">
        <Link
          to="/inicio"
          preload="intent"
          className="mr-1 shrink-0 font-display text-lg font-bold tracking-tight sm:text-xl"
        >
          Fluxo<span className="text-primary-glow">Prime</span>
        </Link>

        <div className="ml-auto flex items-center">
          <Link
            to="/perfis"
            aria-label="Gerenciar perfis"
            className="rounded-full ring-2 ring-white/15 transition-colors hover:ring-primary"
          >
            <ProfileAvatar profile={profile} size={34} className="text-sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
