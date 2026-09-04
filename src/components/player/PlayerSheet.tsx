import type { ReactNode } from "react";
import { X } from "lucide-react";

export function PlayerSheet({
  title,
  onClose,
  children,
  side = "right",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  side?: "right" | "bottom";
}) {
  return (
    <div className="absolute inset-0 z-40 flex bg-[color:var(--player-scrim-strong)]">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="flex-1 cursor-default"
      />
      <div
        className={
          side === "right"
            ? "flex h-full w-full max-w-md flex-col bg-[color:var(--player-panel)] shadow-2xl"
            : "absolute inset-x-0 bottom-0 max-h-[70%] overflow-y-auto bg-[color:var(--player-panel)] p-4"
        }
      >
        <div className="flex items-center justify-between border-b border-[color:var(--player-line)] px-4 py-3">
          <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-2 text-foreground/80 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function OptionRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${
        active
          ? "bg-white/10 font-semibold text-foreground"
          : "text-foreground/75 hover:bg-white/5 hover:text-foreground"
      }`}
    >
      <span
        aria-hidden
        className={`h-5 w-1 rounded-full ${active ? "bg-primary" : "bg-transparent"}`}
      />
      {label}
    </button>
  );
}
