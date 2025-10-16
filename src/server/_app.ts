import { Hono } from "hono"
import { csrf } from "hono/csrf"
import { authController } from "./modules/auth/auth.controller"
import { todosController } from "./modules/todos/todos.controller"

const app = new Hono()

app.use(csrf())

export const appRouter = app
  // Extends routes here...
  .route("/auth", authController)
  .route("/todos", todosController)

export type AppRouter = typeof appRouter
