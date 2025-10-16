import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteSolid from "vite-plugin-solid";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsConfigPaths(), tanstackStart(), nitro({ config: {} }), viteSolid({ ssr: true })],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  envPrefix: ["PUBLIC_"],
});
