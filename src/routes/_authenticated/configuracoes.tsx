import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  deleteUser,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { AlertTriangle, ChevronRight, KeyRound, Mail, ShieldCheck, Trash2, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseAuth } from "@/lib/firebase";
import { deleteAccountData } from "@/lib/library.functions";
import { setStoredProfileId } from "@/lib/profile-store";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — FluxoPrime" },
      {
        name: "description",
        content: "Gerencie sua conta FluxoPrime: e-mail, senha, perfis e exclusão da conta.",
      },
      { property: "og:title", content: "Configurações — FluxoPrime" },
      {
        property: "og:description",
        content: "Conta, segurança e perfis da sua assinatura FluxoPrime.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");
  const [resetError, setResetError] = useState<string | null>(null);

  const [step, setStep] = useState<"idle" | "confirm" | "verify" | "deleting">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const email = user?.email ?? "";
  const providers = user?.providerData.map((p) => p.providerId) ?? [];
  const hasPassword = providers.includes("password");

  async function requestPasswordLink() {
    if (!email) return;
    setResetError(null);
    setResetState("sending");
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setResetState("sent");
    } catch (error) {
      setResetState("idle");
      setResetError((error as Error).message ?? "Não foi possível enviar o link.");
    }
  }

  async function startDeletion() {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    setDeleteError(null);
    setSending(true);
    try {
      if (current.emailVerified) {
        // Contas Google/Apple já vêm verificadas: pedimos o login de novo na hora.
        setStep("verify");
      } else {
        await sendEmailVerification(current, {
          url: `${window.location.origin}/configuracoes`,
        });
        setStep("verify");
      }
    } catch (error) {
      setDeleteError((error as Error).message ?? "Não foi possível enviar a verificação.");
    } finally {
      setSending(false);
    }
  }

  async function confirmDeletion() {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    setDeleteError(null);
    setStep("deleting");
    try {
      await current.reload();
      const fresh = getFirebaseAuth().currentUser!;
      if (!fresh.emailVerified) {
        setStep("verify");
        setDeleteError(
          "Ainda não recebemos a confirmação. Abra o link enviado para o seu e-mail e toque de novo.",
        );
        return;
      }

      try {
        await deleteAccountData();
        await deleteUser(fresh);
      } catch (error) {
        if ((error as { code?: string }).code === "auth/requires-recent-login") {
          const providerId = fresh.providerData[0]?.providerId ?? "";
          if (providerId === "google.com") {
            await reauthenticateWithPopup(fresh, new GoogleAuthProvider());
          } else if (providerId === "apple.com") {
            await reauthenticateWithPopup(fresh, new OAuthProvider("apple.com"));
          } else {
            throw new Error("Por segurança, saia e entre de novo na conta antes de excluir.");
          }
          await deleteUser(getFirebaseAuth().currentUser!);
        } else {
          throw error;
        }
      }

      await queryClient.cancelQueries();
      queryClient.clear();
      setStoredProfileId(null);
      navigate({ to: "/entrar", replace: true });
    } catch (error) {
      setStep("verify");
      setDeleteError((error as Error).message ?? "Não foi possível excluir a conta.");
    }
  }

  const cardClass = "rounded-3xl border border-white/8 bg-white/[0.04] p-5";

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-4 pb-24">
        <header className="animate-fade-in">
          <span className="inline-block rounded-full border border-white/12 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/65">
            CONFIGURAÇÕES
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold">Sua conta</h1>
          <p className="mt-1 text-sm text-white/45">
            Cada assunto em uma aba, para nada ficar misturado.
          </p>
        </header>

        <Tabs defaultValue="conta" className="mt-5">
          <TabsList className="grid w-full grid-cols-3 rounded-3xl border border-white/8 bg-white/[0.03] p-1.5">
            <TabsTrigger value="conta" className="rounded-2xl text-xs sm:text-sm">
              <Mail className="mr-1.5 h-4 w-4" /> Conta
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="rounded-2xl text-xs sm:text-sm">
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Segurança
            </TabsTrigger>
            <TabsTrigger value="perfis" className="rounded-2xl text-xs sm:text-sm">
              <Users className="mr-1.5 h-4 w-4" /> Perfis
            </TabsTrigger>
          </TabsList>

          {/* ---- Conta ---- */}
          <TabsContent value="conta" className="mt-5 animate-fade-in space-y-4">
            <section className={cardClass}>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-white/45">
                E-MAIL DA CONTA
              </p>
              <p className="mt-2 break-all text-base font-semibold">{email || "—"}</p>
              <p className="mt-1 text-xs text-white/40">
                Entrando por {providers.join(", ") || "e-mail e senha"}.
              </p>

              <div className="mt-5 border-t border-white/8 pt-5">
                <p className="text-sm font-semibold text-destructive">Excluir conta</p>
                <p className="mt-1 text-xs text-white/45">
                  Apaga perfis, listas salvas e o histórico. Não dá para desfazer.
                </p>

                {step === "idle" ? (
                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir conta
                  </button>
                ) : null}

                {step === "confirm" ? (
                  <div className="mt-4 animate-fade-in rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="flex items-start gap-2 text-sm text-white/80">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      Vamos enviar uma confirmação para <strong>{email}</strong>. Depois de abrir o
                      link, volte aqui para concluir.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => void startDeletion()}
                        className="rounded-2xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground transition-opacity disabled:opacity-60"
                      >
                        {sending ? "Enviando…" : "Enviar confirmação"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep("idle")}
                        className="rounded-2xl border border-white/12 px-5 py-2.5 text-sm font-semibold text-white/80"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                {step === "verify" || step === "deleting" ? (
                  <div className="mt-4 animate-fade-in rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/80">
                      Abra o e-mail enviado para <strong>{email}</strong> e confirme pelo link do
                      Firebase. Em seguida toque no botão abaixo para concluir a exclusão.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={step === "deleting"}
                        onClick={() => void confirmDeletion()}
                        className="rounded-2xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground transition-opacity disabled:opacity-60"
                      >
                        {step === "deleting" ? "Excluindo…" : "Já confirmei — excluir"}
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => void startDeletion()}
                        className="rounded-2xl border border-white/12 px-5 py-2.5 text-sm font-semibold text-white/80"
                      >
                        Reenviar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("idle");
                          setDeleteError(null);
                        }}
                        className="rounded-2xl border border-white/12 px-5 py-2.5 text-sm font-semibold text-white/60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                {deleteError ? (
                  <p className="mt-3 text-xs text-destructive">{deleteError}</p>
                ) : null}
              </div>
            </section>
          </TabsContent>

          {/* ---- Segurança ---- */}
          <TabsContent value="seguranca" className="mt-5 animate-fade-in space-y-4">
            <section className={cardClass}>
              <p className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="h-4 w-4 text-white/70" /> Trocar senha
              </p>
              <p className="mt-1 text-sm text-white/45">
                {hasPassword
                  ? `O Firebase envia um link de redefinição para ${email}.`
                  : "Sua conta entra por provedor social. Um link de redefinição cria uma senha para o e-mail da conta."}
              </p>
              <button
                type="button"
                disabled={resetState === "sending" || !email}
                onClick={() => void requestPasswordLink()}
                className="mt-4 rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-semibold tracking-[0.08em] text-white/90 transition-colors hover:bg-white/[0.12] disabled:opacity-60"
              >
                {resetState === "sending" ? "ENVIANDO…" : "PEDIR LINK DE REDEFINIÇÃO"}
              </button>
              {resetState === "sent" ? (
                <p className="mt-3 animate-fade-in text-xs text-emerald-400">
                  Link enviado para {email}. Confira também o spam.
                </p>
              ) : null}
              {resetError ? <p className="mt-3 text-xs text-destructive">{resetError}</p> : null}
            </section>
          </TabsContent>

          {/* ---- Perfis ---- */}
          <TabsContent value="perfis" className="mt-5 animate-fade-in space-y-3">
            <Link
              to="/gerenciar-perfis"
              className={`${cardClass} flex items-center justify-between transition-colors hover:bg-white/[0.08]`}
            >
              <span>
                <span className="block text-base font-semibold">Perfis &amp; avatares</span>
                <span className="block text-sm text-white/45">
                  Criar, editar e remover perfis da conta.
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-white/50" />
            </Link>
            <Link
              to="/perfis"
              className={`${cardClass} flex items-center justify-between transition-colors hover:bg-white/[0.08]`}
            >
              <span>
                <span className="block text-base font-semibold">Trocar de perfil</span>
                <span className="block text-sm text-white/45">Escolher quem está assistindo.</span>
              </span>
              <ChevronRight className="h-5 w-5 text-white/50" />
            </Link>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
