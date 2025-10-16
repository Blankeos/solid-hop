import type { Config } from "vike/types"
import vikeServer from "vike-server/config"
import config from "vike-solid/config"

// Default config (can be overridden by pages)
export default {
  extends: [config, vikeServer],
  server: "src/server/server.ts", // entry point
} satisfies Config
