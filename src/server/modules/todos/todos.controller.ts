import { Hono } from "hono"

export const todosController = new Hono().get("/", async (c) => {
  return c.json({
    todos: [
      {
        id: 1,
        text: "Buy milk",
        completed: false,
      },
    ],
  })
})
