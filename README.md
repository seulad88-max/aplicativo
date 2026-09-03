# FluxoPrime App

Aplicativo multiplataforma do FluxoPrime, com a experiência visual do site
original e conexão com a API Xtream sem depender do site publicado.

## Plataformas

- Android: Expo/React Native
- iOS: Expo/React Native
- Computador: exportação web e shell opcional para Windows com Electron

## Credenciais

As credenciais do Xtream ficam somente no servidor/API como Secrets. Nunca
coloque usuário ou senha dentro do aplicativo, pois o conteúdo de um APK,
IPA ou EXE pode ser extraído.

Existem duas APIs no projeto:

- **FluxoPrime API**: servidor Express deste projeto. O app chama esta API
  usando `EXPO_PUBLIC_API_URL`.
- **Xtream Player API**: API externa do painel, chamada somente pelo servidor
  através de `XTREAM_HOST`.

Para rodar o servidor localmente, configure:

```text
XTREAM_HOST=https://seu-servidor-xtream
XTREAM_USERNAME=seu-usuario
XTREAM_PASSWORD=sua-senha
```

No app, configure separadamente:

```text
EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:8080
```

Em produção, substitua pelo endereço público do servidor FluxoPrime. Não use
`XTREAM_HOST` como `EXPO_PUBLIC_API_URL`.

## Desenvolvimento

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/fluxoprime-app run dev
```

No Replit, o endereço da API já é resolvido pelo domínio do projeto. Em um
computador local, mantenha a API acessível pela máquina que executa o app.

## Compilar Android

Com Android Studio, SDK Android e Java configurados:

```bash
cd artifacts/fluxoprime-app
npx expo run:android
```

## Compilar iOS

A compilação nativa de iOS exige macOS e Xcode:

```bash
cd artifacts/fluxoprime-app
npx expo run:ios
```

## Compilar para computador

Para gerar a versão web:

```bash
cd artifacts/fluxoprime-app
npx expo export --platform web
```

Para abrir como aplicativo Windows usando o shell opcional:

```bash
cd desktop
npm install
npm start
```

O shell carrega os arquivos exportados da pasta `dist`. O serviço Xtream
continua precisando de internet para buscar catálogo e streams.