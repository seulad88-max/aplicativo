import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";

import { firebaseConfigured, useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/entrar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — FluxoPrime" },
      {
        name: "description",
        content:
          "Entre na sua conta FluxoPrime com e-mail e tenha perfis, listas e progresso salvos na nuvem.",
      },
      { property: "og:title", content: "Entrar — FluxoPrime" },
      {
        property: "og:description",
        content: "Sua conta FluxoPrime com perfis, minha lista e continuar assistindo salvos.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { user, loading, signInEmail, signUpEmail, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    navigate({ to: "/perfis", replace: true });
  }, [user, loading, navigate]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "login") await run(() => signInEmail(email, password));
    else await run(() => signUpEmail(name, email, password));
  }

  if (!firebaseConfigured) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="max-w-sm text-sm text-foreground/70">
          Falta colar a chave do Firebase (apiKey) em src/lib/firebase.ts para o login funcionar.
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[340px]">
          {/* logo */}
          <Link to="/" className="block text-center font-display text-2xl font-extrabold tracking-tight">
            Fluxo<span className="text-primary-glow">Prime</span>
          </Link>

          {/* título */}
          <h1 className="mt-6 text-center font-display text-xl font-bold">
            {mode === "login" ? "Entrar na conta" : "Criar conta"}
          </h1>

          {/* formulário */}
          <form onSubmit={onSubmit} className="mt-6 space-y-2.5">
            {mode === "signup" ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-surface/70 px-4 py-3 focus-within:border-primary/70">
                <User className="h-4 w-4 shrink-0 text-foreground/40" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  style={{ fontSize: "16px" }}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/35"
                />
              </div>
            ) : null}

            <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-surface/70 px-4 py-3 focus-within:border-primary/70">
              <Mail className="h-4 w-4 shrink-0 text-foreground/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                style={{ fontSize: "16px" }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/35"
              />
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-surface/70 px-4 py-3 focus-within:border-primary/70">
              <Lock className="h-4 w-4 shrink-0 text-foreground/40" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{ fontSize: "16px" }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/35"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="text-foreground/40 transition hover:text-foreground/70"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          {mode === "login" ? (
            <button
              type="button"
              disabled={busy || !email}
              onClick={() =>
                run(async () => {
                  await resetPassword(email);
                  toast.success("Enviamos um e-mail para redefinir a senha.");
                })
              }
              className="mt-4 w-full text-center text-xs text-foreground/50 underline-offset-4 hover:underline disabled:opacity-40"
            >
              Esqueci minha senha
            </button>
          ) : null}

          <p className="mt-5 text-center text-sm text-foreground/55">
            {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-primary-glow"
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
