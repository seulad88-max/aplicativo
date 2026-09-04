import { memo, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function MediaRowBase({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    // Sem `content-visibility: auto`: a altura estimada errada fazia a página
    // recalcular o tamanho durante a rolagem e "travar"/saltar no celular.
    <section className="relative py-4">

      <div className="mb-3 flex items-center justify-between gap-3 px-4 sm:px-8">
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => scroll(-1)}
            className="rounded-full border border-border bg-surface p-1.5 text-foreground/80 transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Avançar"
            onClick={() => scroll(1)}
            className="rounded-full border border-border bg-surface p-1.5 text-foreground/80 transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-8"
      >
        {children}
      </div>
    </section>
  );
}


export const MediaRow = memo(MediaRowBase);
