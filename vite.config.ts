import vikeRoutegen from "@blankeos/vike-routegen"
import vike from "vike/plugin"
import vikeSolid from "vike-solid/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [vike(), vikeSolid(), vikeRoutegen()],
  resolve: { tsconfigPaths: true },
  server: { port: 3000 },
  preview: { port: 3000 },
  envPrefix: ["PUBLIC_"],
})
