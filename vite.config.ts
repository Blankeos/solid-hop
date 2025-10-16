import vike from "vike/plugin"
import vikeSolid from "vike-solid/vite"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsConfigPaths(), vike(), vikeSolid()],
  server: { port: 3000 },
  preview: { port: 3000 },
  envPrefix: ["PUBLIC_"],
})
