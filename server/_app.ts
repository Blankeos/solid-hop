import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { authController } from "./modules/auth/auth.controller";
import { todosController } from "./modules/todos/todos.controller";

const app = new Hono();

app.use(csrf());

/**
 * The base router. Include all the routes here from `./routes/*`
 */
export const appRouter = app
  .route("/", authController) // 1st router
  .route("/", todosController); //  2nd router
//.route(newController) for extra routers here.

/** Exported type definition for the hono/client. */
export type AppRouter = typeof appRouter;
