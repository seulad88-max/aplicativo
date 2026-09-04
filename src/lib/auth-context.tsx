import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore/lite";

import {
  FIREBASE_API_KEY,
  appleProvider,
  getDb,
  getFirebaseAuth,
  googleProvider,
} from "./firebase";
import { setStoredSession } from "./session-flag";

export const firebaseConfigured = FIREBASE_API_KEY.startsWith("AIza");

type AuthValue = {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function saveAccount(user: User) {
  try {
    await setDoc(
      doc(getDb(), "users", user.uid),
      {
        uid: user.uid,
        email: user.email ?? null,
        name: user.displayName ?? null,
        photo_url: user.photoURL ?? null,
        providers: user.providerData.map((p) => p.providerId),
        last_login_at: serverTimestamp(),
        created_at: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // Se as regras ainda não estiverem publicadas, não trava o login.
  }
}

function friendlyError(error: unknown): Error {
  const code = (error as { code?: string } | null)?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/missing-password": "Informe a senha.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/email-already-in-use": "Esse e-mail já tem conta. Faça login.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Não encontramos uma conta com esse e-mail.",
    "auth/too-many-requests": "Muitas tentativas. Tente de novo em alguns minutos.",
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/unauthorized-domain": `Autorize o domínio ${typeof window === "undefined" ? "deste site" : window.location.hostname} em Firebase → Authentication → Settings → Authorized domains.`,
    "auth/operation-not-allowed": "Esse método de login não está ativado no Firebase.",
  };
  return new Error(map[code] ?? (error as Error)?.message ?? "Não foi possível entrar.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    void getRedirectResult(auth).catch((error) => {
      console.error("Falha ao concluir login por redirecionamento", friendlyError(error));
    });
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      setStoredSession(!!u);
      if (u) void saveAccount(u);
    });
    return unsub;
  }, []);

  const withProvider = useCallback(async (provider: typeof googleProvider | typeof appleProvider) => {
    const auth = getFirebaseAuth();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      // PWA instalado / iOS bloqueiam popup: cai para redirect.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw friendlyError(error);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      signInGoogle: () => withProvider(googleProvider),
      signInApple: () => withProvider(appleProvider),
      signInEmail: async (email, password) => {
        try {
          await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
        } catch (error) {
          throw friendlyError(error);
        }
      },
      signUpEmail: async (name, email, password) => {
        try {
          const cred = await createUserWithEmailAndPassword(
            getFirebaseAuth(),
            email.trim(),
            password,
          );
          if (name.trim()) await updateAuthProfile(cred.user, { displayName: name.trim() });
          await saveAccount(cred.user);
        } catch (error) {
          throw friendlyError(error);
        }
      },
      resetPassword: async (email) => {
        try {
          await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
        } catch (error) {
          throw friendlyError(error);
        }
      },
      signOut: async () => {
        setStoredSession(false);
        await fbSignOut(getFirebaseAuth());
      },
    }),
    [user, loading, withProvider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro do AuthProvider");
  return ctx;
}
