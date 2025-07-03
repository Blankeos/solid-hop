// Vike
import vikeSolid from "vike-solid/vite";
import vike from "vike/plugin";

// Vite
import devServer from "@hono/vite-dev-server";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, ".");

export default defineConfig({
  plugins: [
    vike(),
    vikeSolid(),
    devServer({
      entry: "server.ts",
      exclude: [
        /^\/@.+$/,
        /.*\.(ts|tsx|vue)($|\?)/,
        /.*\.(s?css|less)($|\?)/,
        /^\/favicon\.ico$/,
        /.*\.(svg|png)($|\?)/,
        /^\/(public|assets|static)\/.+/,
        /^\/node_modules\/.*/,
      ],
      injectClientScript: false,
    }),
  ],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": resolve(root),
    },
  },
  envPrefix: ["PUBLIC_"],
});
