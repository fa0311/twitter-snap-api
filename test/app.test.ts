import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { beforeAll, describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";

const fromParam = (base: string, param: ConstructorParameters<typeof URLSearchParams>[0]) => {
  const searchParams = new URLSearchParams(param).toString();
  return `${base}?${searchParams}`;
};

const writeFile = async (output: string, data: ReadableStream) => {
  const writer = createWriteStream(`test/output/${output}`);
  await pipeline(data, writer);
};

describe(
  "Integration Test",
  {
    timeout: 120000,
  },
  () => {
    beforeAll(async () => {
      if (await fs.stat("test/output").catch(() => false)) {
        await fs.rm("test/output", { recursive: true });
      }
      await fs.mkdir("test/output", { recursive: true });
    });

    test("GET /encoder", async () => {
      const app = await createApp();
      const res = await app.request("/encoder", { method: "GET" });
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json).toHaveProperty("nvenc");
      expect(json).toHaveProperty("qsv");
      expect(json).toHaveProperty("vaapi");
      expect(json).toHaveProperty("vulkan");
      expect(json).toHaveProperty("software");
    });

    test("GET /url", async () => {
      const app = await createApp();
      const url = fromParam("/url", {
        url: "https://x.com/elonmusk/status/1349129669258448897",
      });
      const res = await app.request(url, { method: "GET" });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.body).toBeInstanceOf(ReadableStream);
      await writeFile("url.png", res.body!);
    });

    test("GET image /twitter", async () => {
      const app = await createApp();
      const res = await app.request(`/twitter/1349129669258448897`, { method: "GET" });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.body).toBeInstanceOf(ReadableStream);
      await writeFile("twitter.png", res.body!);
    });

    test("GET video /twitter", async () => {
      const app = await createApp();
      const res = await app.request("/twitter/1649043715686793218", { method: "GET" });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("video/mp4");
      expect(res.body).toBeInstanceOf(ReadableStream);
      await writeFile("twitter.mp4", res.body!);
    });

    test("GET image /pixiv", async () => {
      const app = await createApp();
      const res = await app.request(`/pixiv/1580459`, { method: "GET" });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.body).toBeInstanceOf(ReadableStream);
      await writeFile("pixiv.png", res.body!);
    });

    test("GET video /pixiv", async () => {
      const app = await createApp();
      const res = await app.request("/pixiv/44298467", { method: "GET" });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("video/mp4");
      expect(res.body).toBeInstanceOf(ReadableStream);
      await writeFile("pixiv.mp4", res.body!);
    });
  },
);
