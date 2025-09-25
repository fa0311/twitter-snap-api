import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./env";

const app = await createApp();

console.log(`Server is running on http://localhost:${env.PORT}`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});
