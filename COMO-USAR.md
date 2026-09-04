# FluxoPrime + Firebase

## 1. Chave do Firebase
A chave Web e o restante da configuração do projeto `fluxo-prime` já estão em
`src/lib/firebase.ts`.

## 2. No Firebase Console
- Authentication > Sign-in method: ative **Google**, **Apple** e **E-mail/senha**.
- Authentication > Settings > Authorized domains: adicione **cada domínio sem `https://`**:
  - `id-preview--01beca64-da19-431d-9b51-9bc412894f98.lovable.app`
  - o domínio publicado quando o site for publicado
  - qualquer domínio personalizado usado pelo site
- Firestore Database > Create database: crie o banco `(default)` (modo produção).
- Firestore Database > Rules: cole e publique o conteúdo de `firestore.rules`.
- Se o console pedir, ative também a **Cloud Firestore API** para o projeto `fluxo-prime`.

Essas etapas são obrigatórias no painel do Firebase. O código não consegue autorizar
domínios nem ativar APIs do projeto automaticamente.

## 3. Rodar
```
bun install
bun run dev      # desenvolvimento
bun run build    # gerar a versão de produção
```

## O que é salvo no Firestore
- `users/{uid}` — dados da conta (e-mail, nome, data de criação)
- `users/{uid}/profiles/{id}` — perfis
- `users/{uid}/profiles/{id}/watchlist/{itemId}` — minha lista
- `users/{uid}/profiles/{id}/progress/{itemId}` — progresso de reprodução

Login é obrigatório: sem conta, o site leva para `/entrar`.
