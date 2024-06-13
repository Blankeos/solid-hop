import { Hono } from "hono";

export const todosController = new Hono().basePath("todos").get("/", async (c) => {
  return c.json({
    todos: [
      {
        id: 1,
        text: "Buy milk",
        completed: false,
      },
    ],
  });
});
