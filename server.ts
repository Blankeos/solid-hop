import { privateConfig } from "@/config.private";

import { Hono } from "hono";

import { serveStatic } from "hono/bun";
import { renderPage } from "vike/server";
import { appRouter } from "./server/_app";

const app = new Hono();

// Health checks
app.get("/up", async (c) => {
  return c.newResponse("🟢 UP", { status: 200 });
});

// For the Backend APIs
app.route("/api", appRouter);

// Vike
if (privateConfig.NODE_ENV === "production") {
  app.use(
    "/*",
    serveStatic({
      root: "./dist/client",
    })
  );
}

app.get("*", async (c, next) => {
  const pageContext = await renderPage({ urlOriginal: c.req.url });
  const { httpResponse } = pageContext;
  if (!httpResponse) return next();
  else {
    const { body, statusCode, headers } = httpResponse;
    headers.forEach(([name, value]) => c.header(name, value));
    c.status(statusCode);
    return c.body(body);
  }
});

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

if (privateConfig.NODE_ENV === "production") {
  console.log(`Server listening on http://localhost:${privateConfig.PORT}`);
  Bun.serve({
    fetch: app.fetch,
    port: privateConfig.PORT,
  });
}

export default {
  port: privateConfig.PORT,
  fetch: app.fetch,
};
