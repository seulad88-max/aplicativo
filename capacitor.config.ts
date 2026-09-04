import type { CapacitorConfig } from "@capacitor/cli";

// Empacotamento nativo (Android/iOS). O conteúdo vem da build estática
// gerada por `npm run build:static` (pasta dist/static).
const config: CapacitorConfig = {
  appId: "app.fluxoprime.tv",
  appName: "FluxoPrime",
  webDir: "dist/static",
  backgroundColor: "#180a2b",
  android: {
    allowMixedContent: true,
    backgroundColor: "#180a2b",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#180a2b",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
