import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { swaggerUI } from "@hono/swagger-ui";
import { z } from "@hono/zod-openapi";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { describeRoute, openAPIRouteHandler } from "hono-openapi";
import { env } from "./env.js";
import { createMutex } from "./mutex.js";
import { checkEncoder, createTwitterSnapClient } from "./snap.js";

const getSchema = z.object({
  url: z.string(),
});

const snapResponse = async (dir: string, path: string) => {
  const stat = await fs.stat(path);
  const type = (() => {
    if (path.endsWith(".png")) {
      return "image/png";
    } else if (path.endsWith(".mp4")) {
      return "video/mp4";
    }
    throw new Error("Unknown file type");
  })();
  const stream = createReadStream(path);
  stream.on("end", async () => {
    await fs.rm(dir, { recursive: true });
  });
  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": stat.size.toString(),
    },
  });
};

export const createApp = async () => {
  const app = new Hono();
  const mutex = createMutex(1);
  const snap = await createTwitterSnapClient({
    cookiesFile: env.COOKIE_FILE,
    ffmpegAdditonalOption: env.FFMPEG_OPTION,
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
      const [dir, path] = await mutex.runExclusive(async () => {
        return await snap.url(url);
      });
      return snapResponse(dir, path);
    },
  );

  app.get("/twitter/:id", async (c) => {
    const { id } = c.req.param();
    const [dir, path] = await mutex.runExclusive(async () => {
      return await snap.twitter(id);
    });
    return snapResponse(dir, path);
  });

  app.get("/pixiv/:id", async (c) => {
    const { id } = c.req.param();
    const [dir, path] = await mutex.runExclusive(async () => {
      return await snap.pixiv(id);
    });
    return snapResponse(dir, path);
  });

  app.get("/encoder", async (c) => {
    const encoder = await checkEncoder();
    return c.json(encoder);
  });

  return app;
};
