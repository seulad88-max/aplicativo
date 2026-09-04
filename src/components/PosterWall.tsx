import { LANDING_POSTERS, posterSize } from "@/lib/landing-posters";

/** Mosaico de pôsteres esmaecido usado como fundo das telas de perfil. */
export function PosterWall() {
  const posters = LANDING_POSTERS.slice(0, 18);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid h-full w-full grid-cols-3 gap-1 opacity-[0.13] sm:grid-cols-6">
        {posters.map((p) => (
          <img
            key={p.poster}
            src={posterSize(p.poster, "w185")}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover grayscale"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/90 to-background" />
    </div>
  );
}
