// Pós-build do modo estático (SPA): cria os arquivos de fallback que cada
// hospedagem estática usa para entregar o index.html em rotas internas.
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { join } from "node:path";

const clientDir = "dist/client";
const outDir = "dist/static";
const index = join(clientDir, "index.html");

if (!existsSync(index)) {
  console.error(`[spa-postbuild] ${index} não existe. Rode "npm run build:static" primeiro.`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(clientDir, outDir, { recursive: true });

// Netlify / Cloudflare Pages
writeFileSync(join(outDir, "_redirects"), "/*    /index.html   200\n");
// GitHub Pages / Surge / hosts que usam 404.html como fallback
copyFileSync(index, join(outDir, "404.html"));
// Vercel (static)
writeFileSync(
  join(outDir, "vercel.json"),
  JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2) + "\n",
);

console.log(`[spa-postbuild] Pronto: ${outDir} (index.html + fallback de SPA)`);
