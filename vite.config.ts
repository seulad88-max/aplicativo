// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Alvo de deploy. Fora do Lovable, defina NITRO_PRESET para escolher a hospedagem:
//   node_server  -> servidor Node comum (Shard Cloud, Render, Railway, VPS, Docker)
//   static       -> site estático puro (Firebase Hosting, Netlify, GitHub Pages, Hostinger)
//   vercel | netlify | cloudflare_module | deno_deploy | bun ...
const preset = process.env["NITRO_PRESET"];

export default defineConfig({
  tanstackStart: {
    // SPA_BUILD=1 gera um index.html estático (shell) para hosts sem Node.
    ...(process.env["SPA_BUILD"] === "1"
      ? { spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } } }
      : {}),
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(process.env["SPA_BUILD"] === "1"
    ? { nitro: false as const }
    : preset
      ? { nitro: { preset } }
      : {}),
});
