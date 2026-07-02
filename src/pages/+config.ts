import type { Config } from "vike/types"
import config from "vike-solid/config"
import { privateEnv } from "@/env.private"

// Default config (can be overridden by pages)
export default {
  extends: [config],
  port: privateEnv.PORT,
} satisfies Config
