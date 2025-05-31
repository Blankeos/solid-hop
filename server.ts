import { privateConfig } from "@/config.private";

import { Hono } from "hono";

import { apply } from "vike-server/hono";
import { serve } from "vike-server/hono/serve";
import { appRouter } from "./server/_app";

const app = new Hono();

// Health checks
app.get("/up", async (c) => {
  return c.newResponse("🟢 UP", { status: 200 });
});

// For the Backend APIs
app.route("/api", appRouter);

// Vike
apply(app);

// Returning errors.
app.onError((error, c) => {
  // Sentry.captureException(error); // Add sentry here or any monitoring service.

  console.error({
    cause: error.cause,
    message: error.message,
    stack: error.stack,
  });

  return c.json(
    {
      error: {
        cause: error.cause,
        message: c.error?.message ?? "Something went wrong.",
        stack: privateConfig.NODE_ENV === "production" ? undefined : error.stack,
      },
    },
    error.cause ?? 500
  );
});

// No need to export default (especially Bun).
serve(app, { port: privateConfig.PORT });
