import { Hono } from "hono"

export const todosController = new Hono().get("/", async (c) => {
  await new Promise((resolve) => setTimeout(resolve, 400))

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
