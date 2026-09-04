import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Shield, Trash2 } from "lucide-react";
import { useServerFn } from "@/lib/local-fn";
import {
  createProfile,
  deleteProfile,
  normalizeUsername,
  updateProfile,
} from "@/lib/library.functions";
import { AVATAR_OPTIONS, avatarOf } from "@/lib/avatars";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { AVATAR_COLORS, useActiveProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/_authenticated/editar-perfil/$id")({
  head: () => ({
    meta: [
      { title: "Editar Perfil — FluxoPrime" },
      {
        name: "description",
        content: "Escolha o avatar, o nome, o username e o controle parental do perfil.",
      },
      { property: "og:title", content: "Editar Perfil — FluxoPrime" },
      { property: "og:description", content: "Personalize avatar, username e PIN do perfil." },
    ],
  }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profiles, select } = useActiveProfile();
  const current = useMemo(() => profiles.find((p) => p.id === id) ?? null, [profiles, id]);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarKey, setAvatarKey] = useState(AVATAR_OPTIONS[0]?.key ?? "ruiva");
  const [pin, setPin] = useState("");
  const [kids, setKids] = useState(false);
  const [adult, setAdult] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || isNew) return;
    if (!current) return;
    setName(current.name);
    setUsername(current.username ?? "");
    setAvatarKey(current.avatar_key ?? AVATAR_OPTIONS[0]?.key ?? "ruiva");
    setPin(current.pin ?? "");
    setKids(current.is_kids);
    setAdult(current.allow_adult);
    setLoaded(true);
  }, [current, isNew, loaded]);

  // A verificação usa a lista de perfis já carregada (sem ida à rede a cada
  // tecla digitada): no Android isso evitava o campo travar enquanto digita.
  useEffect(() => {
    const value = normalizeUsername(username);
    if (!value) {
      setAvailable(null);
      return;
    }
    if (value.length < 3) {
      setAvailable(false);
      return;
    }
    const taken = profiles.some((p) => p.username === value && p.id !== id);
    setAvailable(!taken);
  }, [username, id, profiles]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["profiles"] });

  const create = useMutation({
    mutationFn: useServerFn(createProfile),
    onSuccess: async (row) => {
      await invalidate();
      select(row.id);
      toast.success("Perfil criado");
      navigate({ to: "/gerenciar-perfis" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: useServerFn(updateProfile),
    onSuccess: async () => {
      await invalidate();
      toast.success("Perfil atualizado");
      navigate({ to: "/gerenciar-perfis" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: useServerFn(deleteProfile),
    onSuccess: async () => {
      await invalidate();
      toast.success("Perfil removido");
      navigate({ to: "/gerenciar-perfis" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saving = create.isPending || update.isPending || remove.isPending;
  const pinInvalid = pin.length > 0 && pin.length < 4;

  function save() {
    const payload = {
      name: name.trim(),
      avatar_color: current?.avatar_color ?? AVATAR_COLORS[0] ?? "#8B5CF6",
      avatar_key: avatarKey,
      username: normalizeUsername(username) || undefined,
      is_kids: kids,
      allow_adult: adult,
      pin: pin || undefined,
    };
    if (!payload.name) {
      toast.error("Informe um nome para o perfil");
      return;
    }
    if (pinInvalid) {
      toast.error("O PIN precisa ter 4 dígitos");
      return;
    }
    if (isNew) create.mutate({ data: payload });
    else update.mutate({ data: { id, ...payload } });
  }

  const preview = {
    name: name || "Perfil",
    avatar_color: current?.avatar_color ?? "#8B5CF6",
    avatar_key: avatarKey,
  };

  return (
    <main className="safe-top min-h-screen pb-16">
      <header className="flex items-center justify-between px-4 py-4">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="flex items-center gap-2 text-sm text-white/85"
        >
          <ArrowLeft className="h-5 w-5" /> Voltar
        </button>
        <h1 className="font-display text-xl font-bold">Editar Perfil</h1>
        {isNew ? (
          <span className="w-16" />
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => remove.mutate({ data: { id } })}
            aria-label="Excluir perfil"
            className="w-16 text-right text-white/45"
          >
            <Trash2 className="ml-auto h-5 w-5" />
          </button>
        )}
      </header>
      <div className="border-b border-white/10" />

      <div className="mx-auto max-w-xl px-4">
        <div className="flex flex-col items-center py-8">
          <button type="button" onClick={() => setPickerOpen((v) => !v)}>
            <ProfileAvatar profile={preview} size={160} className="ring-2 ring-white/15" />
          </button>
          <p className="mt-4 text-sm text-white/55">Toque para escolher um avatar</p>

          {pickerOpen ? (
            <div className="mt-5 grid w-full grid-cols-5 gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-8">
              {AVATAR_OPTIONS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  aria-label={`Avatar ${a.key}`}
                  onClick={() => {
                    setAvatarKey(a.key);
                    setPickerOpen(false);
                  }}
                  className={`grid aspect-square place-items-center rounded-full text-2xl ring-2 ${
                    avatarKey === a.key ? "ring-white" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: avatarOf(a.key).color }}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Nome do perfil"
          aria-label="Nome do perfil"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          style={{ fontSize: "16px" }}
          className="w-full rounded-2xl border border-white/8 bg-white/[0.05] px-5 py-4 outline-none focus:border-white/25"
        />

        <div
          className={`mt-4 flex items-center gap-3 rounded-2xl border bg-white/[0.05] px-5 py-4 ${
            available === true
              ? "border-emerald-500"
              : available === false
                ? "border-destructive"
                : "border-white/8"
          }`}
        >
          <span aria-hidden className="text-white/45">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/^@+/, ""))}
            placeholder="username"
            aria-label="Username do perfil"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={20}
            style={{ fontSize: "16px" }}
            className="w-full bg-transparent outline-none placeholder:text-white/35"
          />
          {available === true ? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-900/60">
              <Check className="h-4 w-4 text-emerald-400" />
            </span>
          ) : null}
        </div>
        {available === true ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Username disponível
          </p>
        ) : available === false ? (
          <p className="mt-2 text-sm text-destructive">
            Username indisponível (use ao menos 3 letras e sem repetir).
          </p>
        ) : null}

        {/* Controle parental */}
        <section className="mt-5 rounded-3xl border border-white/8 bg-white/[0.04] p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12">
              <Shield className="h-5 w-5 text-white/80" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Controle Parental &amp; PIN</h2>
              <p className="text-sm text-white/55">
                Proteja este perfil contra trocas não autorizadas
              </p>
            </div>
          </div>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            type="tel"
            placeholder="Definir PIN de 4 dígitos"
            aria-label="PIN do perfil"
            style={{ fontSize: "16px" }}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-transparent px-5 py-4 font-mono tracking-[0.2em] outline-none placeholder:text-white/30 focus:border-white/25"
          />
          <p className="mt-2 text-xs text-white/40">
            Deixe em branco para permitir acesso sem senha
          </p>
          {pinInvalid ? <p className="mt-1 text-xs text-destructive">O PIN precisa ter 4 dígitos</p> : null}
        </section>

        <ToggleRow
          title="Perfil Infantil"
          description="Restringe conteúdo apenas para crianças"
          value={kids}
          onChange={setKids}
        />
        <ToggleRow
          title="Conteúdo Adulto"
          description="Permite acesso a conteúdo +18"
          value={adult}
          onChange={setAdult}
        />

        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="mt-8 w-full rounded-3xl border border-white/8 bg-white/[0.06] py-5 text-lg font-bold disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar Perfil"}
        </button>
      </div>
    </main>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="mt-4 flex w-full items-center gap-4 rounded-3xl border border-white/8 bg-white/[0.04] p-5 text-left"
    >
      <span className="flex-1">
        <span className="block text-lg font-bold">{title}</span>
        <span className="block text-sm text-white/50">{description}</span>
      </span>
      <span
        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
          value ? "bg-emerald-600" : "bg-white/15"
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
