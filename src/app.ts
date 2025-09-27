import { swaggerUI } from "@hono/swagger-ui";
import { z } from "@hono/zod-openapi";
import { zValidator } from "@hono/zod-validator";
import { Semaphore } from "async-mutex";
import { Hono } from "hono";
import { describeRoute, openAPIRouteHandler } from "hono-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { env } from "./env.js";
import { checkEncoder, createTwitterSnapClient } from "./snap.js";

const getSchema = z.object({
  url: z.string(),
});

export const createApp = async () => {
  const app = new Hono();
  const mutex = new Semaphore(env.SEMAPHORE);
  const snap = await createTwitterSnapClient({
    cookiesFile: env.COOKIE_FILE,
  });

  app.use("*", logger());
  app.use("*", cors());
  app.use("*", secureHeaders());
  app.use("*", prettyJSON());

  app.get("/docs", swaggerUI({ url: `/openapi.json` }));
  app.get("/openapi.json", openAPIRouteHandler(app));

  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get(
    "/url",
    describeRoute({
      description: "Say hello to the user",
      responses: {
        200: {
          description: "Successful response",
          content: {},
        },
      },
    }),
    zValidator("query", getSchema),
    async (c) => {
      const { url } = c.req.valid("query");
      const [dir, path] = await new Promise<[string, string]>((resolve) => {
        mutex
          .runExclusive(async () => {
            const result = await snap.url(url);
            resolve(result);
          })
          .catch((err) => resolve(err));
      });

      const stat = await fs.stat(path);
      const type = path.endsWith(".png") ? "image/png" : "video/mp4";
      const stream = createReadStream(path);
      stream.on("close", async () => {
        await fs.rm(dir, { recursive: true });
      });
      return new Response(stream, {
        headers: {
          "Content-Type": type,
          "Content-Length": stat.size.toString(),
        },
      });
    },
  );

  app.get("/encoder", async (c) => {
    const encoder = await checkEncoder();
    return c.json(encoder);
  });

  return app;
};
