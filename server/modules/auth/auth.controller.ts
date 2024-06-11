import { Hono } from "hono";

export const authController = new Hono()
  .basePath("auth")
  .get("/", async (c) => {
    return c.json({
      user: null,
      session: null,
    });
  })
  .get("/users", async (c) => {
    return c.json({
      users: [
        {
          id: 1,
          name: "Carlo",
        },
        {
          id: 2,
          name: "Andrea",
        },
      ],
    });
  });
