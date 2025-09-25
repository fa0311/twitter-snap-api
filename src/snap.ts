import crypto from "node:crypto";
import fs from "node:fs/promises";
import { default as ffmpeg } from "fluent-ffmpeg";
import { getSnapAppRenderWithCache } from "twitter-snap";

type TwitterSnapConfig = {
  cookiesFile: string;
  ffmpegAdditonalOption?: string[];
};

const one = <T>(arr: T[]): arr is [T] => arr.length === 1;

export const getRand = () => {
  const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const N = 16;
  return Array.from(crypto.randomFillSync(new Uint8Array(N)))
    .map((n) => S[n % S.length])
    .join("");
};

type createTwitterSnapClientParams = TwitterSnapConfig & {
  outputDir?: string;
};

export const createTwitterSnapClient = async (config: createTwitterSnapClientParams) => {
  const outputDir = config.outputDir ?? ".temp";
  const api = getSnapAppRenderWithCache({});

  const url = async (url: string) => {
    const rand = getRand();
    const data = await api({
      url: url,
      limit: 1,
      cookiesFile: config.cookiesFile,
      sessionType: "file",
      callback: async (run) => {
        const output = await run({
          ffmpegTimeout: 30000,
          output: `${outputDir}/${rand}/{id}.{if-photo:png:mp4}`,
          theme: "RenderOceanBlueColor",
          scale: 2,
          width: 1440,
          ffmpegAdditonalOption: config.ffmpegAdditonalOption,
        });
        await output.file.tempCleanup();
        return await fs.readdir(`${outputDir}/${rand}`);
      },
    });
    if (one(data)) {
      if (one(data[0])) {
        const dir = `${outputDir}/${rand}`;
        return [dir, `${dir}/${data[0][0]}`] as [string, string];
      }
    }
    throw new Error("Failed to get snapshot");
  };

  const twitter = async (id: string) => {
    return await url(`https://x.com/elonmusk/status/${id}`);
  };
  const pixiv = async (id: string) => {
    return await url(`https://www.pixiv.net/artworks/${id}`);
  };
  return { url, twitter, pixiv };
};

const codes = {
  nvenc: [
    ["h264_nvenc", "mp4"] as const,
    ["hevc_nvenc", "mp4"] as const,
    ["av1_nvenc", "webm"] as const,
  ],
  qsv: [
    ["h264_qsv", "mp4"] as const,
    ["hevc_qsv", "mp4"] as const,
    ["av1_qsv", "webm"] as const,
    ["vp9_qsv", "webm"] as const,
  ],
  vaapi: [
    ["h264_vaapi", "mp4"] as const,
    ["hevc_vaapi", "mp4"] as const,
    ["av1_vaapi", "webm"] as const,
    ["vp8_vaapi", "webm"] as const,
    ["vp9_vaapi", "webm"] as const,
  ],
  vulkan: [
    ["h264_vulkan", "mp4"] as const,
    ["hevc_vulkan", "mp4"] as const,
    ["av1_vulkan", "webm"] as const,
  ],
};

const encoderCheck = (codec: string, format: string) => {
  const command = ffmpeg({
    timeout: 0,
  });
  command.input("testsrc=duration=1:size=427x240:rate=5");
  command.inputFormat("lavfi");
  command.outputOptions(["-c:v", codec]);
  command.outputFormat(format);
  command.output("/dev/null");

  return new Promise((resolve, reject) => {
    command.on("end", resolve);
    command.on("error", reject);
    command.run();
  });
};

const arrayFromAsync = async <T>(iter: Promise<T>[]): Promise<T[]> => {
  const result: T[] = [];
  for await (const item of iter) {
    result.push(item);
  }
  return result;
};

export const checkEncoder = async () => {
  return Object.fromEntries(
    await arrayFromAsync(
      Object.entries(codes).map(async ([name, data]) => {
        const body = await arrayFromAsync(
          data.map(async ([codec, format]) => {
            try {
              await encoderCheck(codec, format);
              return { codec, format, available: true };
            } catch {
              return { codec, format, available: false };
            }
          }),
        );
        return [name, body];
      }),
    ),
  );
};
