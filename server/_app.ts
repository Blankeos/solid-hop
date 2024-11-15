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
  .route("/", authController)
  .route("/", todosController);

export type AppRouter = typeof appRouter;
