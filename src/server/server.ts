import vike from "@vikejs/hono"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import type { Server } from "vike/types"
import { privateEnv } from "@/env.private"
import { appRouter } from "./_app"
import type { ApiErrorResponse } from "./lib/error"

const app = new Hono()

// Health checks
app.get("/up", async (c) => {
  return c.newResponse("🟢 UP", { status: 200 })
})

// For the Backend APIs
app.route("/api", appRouter)

// Vike
vike(app)

// Standard Errors
app.onError((error, c) => {
  // 1. Parse into a standard shape.
  const {
    status = 500,
    message = "Internal Server Error",
    cause,
  } = error instanceof HTTPException
    ? error
    : { status: 500, message: "Internal Server Error", cause: error }

  // 2. Create a standard error response shape.
  const errorResponse = {
    error: {
      message,
      code: status,
      cause: privateEnv.NODE_ENV === "production" ? undefined : cause,
      stack: privateEnv.NODE_ENV === "production" ? undefined : error.stack,
    },
  } as ApiErrorResponse

  // 3. Log and return for debugging and frontend displaying.
  const log = {
    ...errorResponse,
    endpoint: c.req.path,
    method: c.req.method,
  }

  console.error(log)

  // Sentry or any monitoring service capture
  // Sentry.captureException(error);

  return c.json(errorResponse, status)
})

export default {
  fetch: app.fetch,
  prod: {
    port: privateEnv.PORT,
  },
} satisfies Server
