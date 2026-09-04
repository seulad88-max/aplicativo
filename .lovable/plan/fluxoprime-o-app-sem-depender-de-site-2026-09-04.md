# FluxoPrime — o app (sem depender de site)

Entendi a arquitetura e ela é exatamente a que você descreveu:

```text
APP (este projeto)  ->  api-server (sweet-server-connect.lovable.app)  ->  Xtream
   telas, login,          guarda XTREAM_HOST / USERNAME / PASSWORD,
   perfis, player          monta catálogo, busca e links de player
```

O app **não** fala com o Xtream direto e **não** guarda credenciais — ele só
consome o `api-server`. Isso continua igual. Aqui não vai existir "site": este
projeto passa a ser o aplicativo, com navegação inferior, tela cheia e cara de
Netflix, igual ao ZIP.

Aviso honesto: a Lovable não gera o arquivo final da Play Store (.aab) nem publica
na App Store. Eu deixo o projeto pronto e configurado para virar app nativo
(Capacitor); a geração do pacote e o envio para a loja você faz no seu computador
com Android Studio (Xcode no Mac). Até lá, e também depois, ele já instala no
celular pelo próprio app ("Adicionar à tela de início").

## O que o app tem (vem do ZIP)

- Entrada com login Google, Apple e e-mail/senha (Firebase)
- Perfis: criar, editar, gerenciar, PIN
- Início com destaque e carrosséis
- Filmes, Séries, Busca, Minha Lista
- Página do título com temporadas, episódios e elenco
- Player HLS com tela cheia e "continuar assistindo"
- Reels (vertical, estilo shorts)
- Configurações e conta

## Etapas

### 1. Trazer o código do app para este projeto
Copiar do ZIP: `src/` inteiro (rotas, componentes, libs, estilos), `public/`
(ícones, manifest, robots), `components.json`, `firestore.rules` e o script de
build estático. Instalar o que falta aqui: `firebase`, `hls.js`, `recharts`,
`embla-carousel-react`, `input-otp`, `react-day-picker`, `date-fns`,
`react-hook-form`, `@hookform/resolvers`, `react-resizable-panels`, `cmdk`.

Não copio `.git`, `bun.lock` nem `routeTree.gen.ts` (é gerado automaticamente).

### 2. Manter a ligação com o api-server
- `VITE_API_BASE` continua em `https://sweet-server-connect.lovable.app`, que é
  quem tem as credenciais do Xtream.
- Nada de credencial Xtream neste projeto — o app só chama a API.
- Mantenho o cache local (memória + armazenamento do aparelho, validade 2h) para o
  app abrir instantâneo e aguentar oscilação da API.
- Mantenho um aviso claro na tela quando a API estiver fora, em vez de tela
  travada carregando.

### 3. Deixar 100% com cara de app
- Sem nada de "site": navegação inferior fixa, cabeçalho enxuto, gestos, tela
  cheia no player, tema escuro.
- Rotas em português já existentes (`/inicio`, `/filmes`, `/series`, `/busca`,
  `/minha-lista`, `/reels`, `/titulo/...`, `/assistir/...`), com `/` levando
  para entrar ou início conforme o login.

### 4. Preparar o empacotamento nativo (Capacitor)
- `capacitor.config.ts` com id (ex. `app.fluxoprime.tv`), nome "FluxoPrime",
  cor de fundo e a build estática como conteúdo.
- Dependências `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`,
  `@capacitor/ios`.
- `APP-NATIVO.md` com os comandos exatos: build estático → `npx cap add android`
  → `npx cap sync` → abrir no Android Studio → gerar AAB assinado → Play Console.
- Ajustes do login Firebase para funcionar dentro do app nativo (domínios
  autorizados e fluxo de redirecionamento), com o que confirmar no console.

### 5. Verificar
Testar no preview: entrar, criar perfil, início, busca, abrir título, dar play,
reels, minha lista. Corrigir o que aparecer.

## O que só você pode fazer

- Firebase Console: adicionar os domínios deste projeto em
  Authentication → Settings → Authorized domains.
- Se as credenciais do Xtream vencerem, atualizá-las no projeto do `api-server`
  (não aqui).
- Para loja: conta Google Play (US$ 25 única) e/ou Apple (US$ 99/ano) e
  Android Studio/Xcode para gerar o pacote.

## Detalhes técnicos

- Stack: TanStack Start (igual ao ZIP), React 19, Tailwind v4, shadcn/ui.
- Catálogo via `src/lib/catalog.functions.ts` → `GET {API_BASE}/api/public/...`
  com timeout de 9s e cache TTL 2h.
- Dados do usuário no Firestore: `users/{uid}/profiles/{id}` com `watchlist` e
  `progress`; regras de `firestore.rules`.
- Build para Capacitor no modo estático (SPA) com fallback de rotas para
  `index.html`.
