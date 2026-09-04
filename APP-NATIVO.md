# FluxoPrime — gerar o aplicativo nativo (Android / iOS)

O app deste projeto é o aplicativo completo. Ele não guarda nenhuma credencial do
Xtream: todo o catálogo, busca e link de player vêm do servidor de API.

```
APP (este projeto)  ->  api-server  ->  Xtream
```

O endereço da API fica em `src/lib/config.ts` (`VITE_API_BASE`).
Padrão: `https://sweet-server-connect.lovable.app`.

## 1. Gerar o conteúdo do app

No seu computador, com Node instalado:

```bash
npm install
npm run build:static
```

Resultado: `dist/static/` (é isso que vai dentro do app).

Para apontar para outro servidor de API:

```bash
VITE_API_BASE="https://meu-servidor.com" npm run build:static
```

## 2. Criar o projeto Android

```bash
npx cap add android
npx cap sync android
npx cap open android      # abre o Android Studio
```

No Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**,
crie/escolha sua keystore e gere o `.aab`. Envie esse arquivo na
**Google Play Console** (conta de desenvolvedor: US$ 25, pagamento único).

Para testar rápido no celular sem loja: **Build → Build APK(s)** e instale o APK.

## 3. Criar o projeto iOS (precisa de Mac)

```bash
npx cap add ios
npx cap sync ios
npx cap open ios          # abre o Xcode
```

No Xcode: escolha seu time de desenvolvimento, **Product → Archive** e envie pelo
**Distribute App**. Conta Apple Developer: US$ 99/ano.

## 4. Sempre que mudar o app

```bash
npm run build:static && npx cap sync
```

## 5. Login (Firebase) dentro do app nativo

O login usa Firebase. Confirme no Console do Firebase → **Authentication**:

- **Settings → Authorized domains**: adicione `localhost` e o domínio publicado
  deste projeto. No app nativo o Capacitor serve o conteúdo em `localhost`.
- **Sign-in method**: Google, Apple e E-mail/senha ativos.
- Para Google no Android também é preciso cadastrar a **impressão SHA-1** da sua
  keystore em Project settings → Your apps → Android, e baixar o
  `google-services.json` para `android/app/`.

O login por e-mail/senha funciona sem nenhuma dessas etapas extras.

## 6. Ícones e nome

Os ícones ficam em `public/` (`icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`). Nome e cores do app em
`capacitor.config.ts`.

## 7. Se o app abrir sem filmes

Isso é a API, não o app. Teste no navegador:

```
https://sweet-server-connect.lovable.app/api/public/status
```

- `{"ok":true,...}` → provedor online.
- `ok:false` → o Xtream está fora ou as credenciais venceram; atualize
  `XTREAM_HOST`, `XTREAM_USERNAME` e `XTREAM_PASSWORD` no projeto do `api-server`.
