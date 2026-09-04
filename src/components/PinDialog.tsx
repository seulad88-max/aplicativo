import { useState } from "react";
import { X } from "lucide-react";
import type { ProfileRow } from "@/lib/library.functions";
import { ProfileAvatar } from "./ProfileAvatar";

export function PinDialog({
  profile,
  onClose,
  onSuccess,
}: {
  profile: ProfileRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    setError(false);
    if (digits.length === 4) {
      if (digits === profile.pin) {
        onSuccess();
      } else {
        setError(true);
        setPin("");
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-5 backdrop-blur">
      <div className="glass-panel relative w-full max-w-xs rounded-2xl p-6 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-20"
        >
          <X className="h-4 w-4 text-foreground/60" />
        </button>


        <ProfileAvatar profile={profile} size={56} className="mx-auto mb-4" />
        <h2 className="font-display text-lg font-semibold">{profile.name}</h2>
        <p className="mt-1 text-sm text-foreground/60">Digite o PIN de 4 dígitos</p>

        <div className="mt-5 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl font-bold transition-colors ${
                error
                  ? "border-destructive text-destructive"
                  : pin.length > i
                    ? "border-primary text-foreground"
                    : "border-border text-foreground/30"
              }`}
            >
              {pin.length > i ? "●" : ""}
            </div>
          ))}
        </div>

        {error ? (
          <p className="mt-3 text-sm font-medium text-destructive">
            PIN incorreto. Tente novamente.
          </p>
        ) : null}

        <input
          autoFocus
          type="tel"
          inputMode="numeric"
          value={pin}
          onChange={(e) => handleChange(e.target.value)}
          aria-label="PIN do perfil"
          style={{ fontSize: "16px" }}
          className="absolute inset-0 h-full w-full cursor-default opacity-0"
        />
      </div>
    </div>
  );
}
