import { hc } from "hono/client"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { publicEnv } from "@/env.public"
import type { AppRouter } from "@/server/_app"

export const honoClient = hc<AppRouter>(`${publicEnv.BASE_ORIGIN}/api`, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, { ...init, cache: "no-store" })

    if (!response.ok) {
      throw new HTTPException(response.status as ContentfulStatusCode, {
        message: response.statusText,
        res: response,
      })
    }

    return response
  },
})
