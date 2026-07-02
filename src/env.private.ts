export const privateEnv = {
  PORT: (process.env.PORT || 3000) as number,
  NODE_ENV: (process.env.NODE_ENV ?? "development") as "development" | "production" | "test",
}
