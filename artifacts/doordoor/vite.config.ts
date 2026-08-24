import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const port = Number(process.env.PORT ?? "5173");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
const isProduction = process.env.NODE_ENV === "production";

function gamesJsonPlugin(): Plugin {
  const req = createRequire(import.meta.url);
  const srcPath = path.resolve(import.meta.dirname, "src/games-config.ts");
  const outJson = path.resolve(import.meta.dirname, "public/games.json");
  const outVersion = path.resolve(import.meta.dirname, "public/version.json");

  function generate() {
    try {
      const esbuild = req("esbuild") as typeof import("esbuild");
      const source = fs.readFileSync(srcPath, "utf-8");
      const { code } = esbuild.transformSync(source, {
        loader: "ts",
        format: "cjs",
      });
      const mod: { exports: Record<string, unknown> } = { exports: {} };
      // eslint-disable-next-line no-new-func
      new Function("module", "exports", "require", code)(mod, mod.exports, () => ({}));
      const games = mod.exports["GAMES_CONFIG"];
      if (Array.isArray(games)) {
        fs.writeFileSync(outJson, JSON.stringify(games, null, 2));
      }
    } catch (e) {
      console.warn("[games-json] Could not regenerate games.json:", (e as Error).message);
    }
  }

  function writeVersion() {
    fs.writeFileSync(outVersion, JSON.stringify({ v: Date.now() }));
  }

  return {
    name: "games-json",
    buildStart() {
      generate();
      writeVersion();
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (
          url === "/" ||
          url.endsWith(".html") ||
          url.includes("games.json") ||
          url.includes("version.json")
        ) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
        next();
      });

      server.watcher.add(srcPath);
      server.watcher.on("change", (file) => {
        if (file === srcPath) {
          generate();
        }
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    gamesJsonPlugin(),
    react(),
    tailwindcss(),
    ...(!isProduction ? [runtimeErrorOverlay()] : []),
    ...(!isProduction &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
