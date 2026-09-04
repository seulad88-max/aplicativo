import { Link } from "@tanstack/react-router";
import { Clapperboard, Home, Search } from "lucide-react";
import { useActiveProfile } from "@/lib/profile-store";
import { ProfileAvatar } from "./ProfileAvatar";

export function BottomNav() {
  const { profile } = useActiveProfile();

  const itemClass =
    "flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-[12px] font-medium text-white/50 transition-all duration-300 ease-out active:scale-95";
  const activeClass = "bg-white/10 text-white scale-[1.03]";

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-around rounded-[28px] border border-white/10 bg-black/80 p-1.5 shadow-2xl backdrop-blur-xl">
        <Link
          to="/inicio"
          preload="intent"
          className={itemClass}
          activeProps={{ className: `${itemClass} ${activeClass}` }}
        >
          <Home className="h-5 w-5" />
          Início
        </Link>
        <Link
          to="/reels"
          preload="intent"
          className={itemClass}
          activeProps={{ className: `${itemClass} ${activeClass}` }}
        >
          <Clapperboard className="h-5 w-5" />
          Reels
        </Link>
        <Link
          to="/busca"
          preload="intent"
          className={itemClass}
          activeProps={{ className: `${itemClass} ${activeClass}` }}
        >
          <Search className="h-5 w-5" />
          Pesquisar
        </Link>
        <Link
          to="/conta"
          preload="intent"
          className={itemClass}
          activeProps={{ className: `${itemClass} ${activeClass}` }}
        >
          <ProfileAvatar profile={profile} size={20} className="text-[11px]" />
          Perfil
        </Link>
      </div>
    </nav>
  );
}
