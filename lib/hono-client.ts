import { publicConfig } from "@/config.public";
import type { AppRouter } from "@/server/_app";
import { hc } from "hono/client";

export const honoClient = hc<AppRouter>(`${publicConfig.BASE_ORIGIN}/api`);
